import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { pool } from "../../config/db.js";
import {
  getPublicRoomCategoriesService,
  searchAvailableRoomCategoriesService,
} from "../rooms/roomCategory.service.js";
import {
  createBookingByCategoryService,
  getBookingByIntentService,
  reportBookingPaymentByIntentService,
} from "../bookings/booking.service.js";
import { buildHotelAssistantPrompt } from "./ai.prompt.js";
import { recordOpenAiUsage } from "./ai.usage.js";
import { isHotelLocationInquiry, formatHotelLocationReply } from "./ai.location-info.js";
import { getPublicHotelProfileService } from "../hotel/hotelProfile.service.js";
import { isHotelServicesInquiry, formatHotelServicesReply } from "./ai.services-info.js";
import { getPublicHotelServicesService } from "../services/service.service.js";
import { formatPolicyInformationReply, policyInformationType } from "./ai.policy-info.js";
import { getHotelGuestPolicyRulesService } from "../services/hotelPolicy.service.js";
import { isRoomDetailsInquiry, formatRoomDetailsReply } from "./ai.category-info.js";
import { requiresManualReview, humanReviewReply } from "./ai.guest-rules.js";
import { handleWhatsAppMvpTurn, isWhatsAppMenuRequest, prepareWhatsAppMvpReservation as prepareWhatsAppMvpReservationContext } from "./ai.whatsapp-mvp.js";
import {
  HOTEL_SCOPE_CLASSIFIER_PROMPT,
  OUT_OF_HOTEL_SCOPE_REPLY,
  isHotelRelatedMessage,
} from "./ai.scope.js";
import { isCategoryPriceInquiry, formatCategoryPricesReply } from "./ai.pricing.js";
import { buildHumanServiceRedirect, isAiServiceTime } from "./ai.schedule.js";
import {
  handleDeterministicBookingFlow,
  isNewReservationIntent,
  isReservationIntent,
  isWhatsAppBookingStep,
  mergeAvailabilityIntoBookingContext,
} from "./ai.booking-flow.js";

const memoryResponses = new Map();
const memoryBookingContexts = new Map();
const conversationQueues = new Map();
let client;
let warnedMissingConversationTable = false;
let warnedMissingBookingContext = false;
const DRAFT_CONTEXT_TTL_MS = 30 * 60 * 1000;
const BOOKED_CONTEXT_TTL_MS = 24 * 60 * 60 * 1000;

export function activeBookingContextFromRow(row, now = Date.now()) {
  const expiresAt = row?.booking_context_expires_at
    ? new Date(row.booking_context_expires_at).getTime()
    : null;
  const stored = row?.booking_context && typeof row.booking_context === "object"
    ? row.booking_context
    : {};
  if (!expiresAt && Object.keys(stored).length > 0) return {};
  if (expiresAt && expiresAt <= now) return {};
  return stored;
}

const tools = [
  {
    type: "function",
    name: "consultar_disponibilidad",
    description:
      "Busca la cantidad de habitaciones disponibles por categoría para fechas y huéspedes concretos.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        check_in: {
          type: "string",
          description: "Fecha de entrada en formato AAAA-MM-DD.",
        },
        check_out: {
          type: "string",
          description: "Fecha de salida en formato AAAA-MM-DD.",
        },
        guests_count: {
          type: "integer",
          minimum: 1,
          maximum: 30,
          description: "Cantidad total de huéspedes.",
        },
      },
      required: ["check_in", "check_out", "guests_count"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "listar_habitaciones",
    description:
      "Lista las categorías de habitaciones, cantidades, capacidades y el monto vigente por noche.",
    strict: true,
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
];

function conversationKey(channel, externalUserId) {
  return `${channel}:${externalUserId}`;
}

function getClient() {
  if (!env.openai.apiKey) {
    const error = new Error(
      "El asesor todavía no está configurado. Falta OPENAI_API_KEY."
    );
    error.statusCode = 503;
    throw error;
  }

  client ??= new OpenAI({ apiKey: env.openai.apiKey });
  return client;
}

async function getPreviousResponseId(channel, externalUserId) {
  const key = conversationKey(channel, externalUserId);

  try {
    const result = await pool.query(
      `
      SELECT last_response_id
      FROM ai_conversations
      WHERE channel = $1 AND external_user_id = $2
      LIMIT 1;
      `,
      [channel, externalUserId]
    );
    return result.rows[0]?.last_response_id || memoryResponses.get(key) || null;
  } catch (error) {
    if (!warnedMissingConversationTable) {
      console.warn(
        "No se pudo usar ai_conversations; se utilizará memoria temporal:",
        error.message
      );
      warnedMissingConversationTable = true;
    }
    return memoryResponses.get(key) || null;
  }
}

async function savePreviousResponseId(channel, externalUserId, responseId) {
  const key = conversationKey(channel, externalUserId);
  memoryResponses.set(key, responseId);

  try {
    await pool.query(
      `
      INSERT INTO ai_conversations (
        channel,
        external_user_id,
        last_response_id,
        updated_at
      )
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (channel, external_user_id)
      DO UPDATE SET
        last_response_id = EXCLUDED.last_response_id,
        updated_at = CURRENT_TIMESTAMP;
      `,
      [channel, externalUserId, responseId]
    );
  } catch {
    // La memoria permite probar el agente antes de ejecutar la migración SQL.
  }
}

async function loadBookingContext(channel, externalUserId) {
  const key = conversationKey(channel, externalUserId);

  try {
    const result = await pool.query(
      `
      SELECT booking_context, booking_context_expires_at
      FROM ai_conversations
      WHERE channel = $1 AND external_user_id = $2
      LIMIT 1;
      `,
      [channel, externalUserId]
    );
    const row = result.rows[0];
    const expiresAt = row?.booking_context_expires_at
      ? new Date(row.booking_context_expires_at)
      : null;

    const staleWithoutExpiry = !expiresAt &&
      Object.keys(row?.booking_context || {}).length > 0;
    if (staleWithoutExpiry || (expiresAt && expiresAt.getTime() <= Date.now())) {
      await pool.query(
        `
        UPDATE ai_conversations
        SET booking_context = '{}'::jsonb,
            booking_context_expires_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE channel = $1
          AND external_user_id = $2
          AND (
            booking_context_expires_at <= CURRENT_TIMESTAMP
            OR booking_context_expires_at IS NULL
          );
        `,
        [channel, externalUserId]
      );
      memoryBookingContexts.delete(key);
      return {};
    }

    const context = activeBookingContextFromRow(row);
    memoryBookingContexts.set(key, {
      context,
      expiresAt: expiresAt?.getTime() || null,
    });
    return context;
  } catch (error) {
    if (!warnedMissingBookingContext) {
      console.warn(
        "No se pudo persistir el contexto de reserva; se utilizará memoria temporal:",
        error.message
      );
      warnedMissingBookingContext = true;
    }
    const stored = memoryBookingContexts.get(key);
    if (!stored) return {};
    if (stored.expiresAt && stored.expiresAt <= Date.now()) {
      memoryBookingContexts.delete(key);
      return {};
    }
    return stored.context || {};
  }
}

async function saveBookingContext(channel, externalUserId, context) {
  const key = conversationKey(channel, externalUserId);
  const ttlMs = channel === "whatsapp" || ["booked", "payment_reported"].includes(context?.state)
    ? BOOKED_CONTEXT_TTL_MS
    : DRAFT_CONTEXT_TTL_MS;
  const expiresAt = Object.keys(context || {}).length > 0
    ? Date.now() + ttlMs
    : null;
  memoryBookingContexts.set(key, { context, expiresAt });

  try {
    await pool.query(
      `
      INSERT INTO ai_conversations (
        channel,
        external_user_id,
        last_response_id,
        booking_context,
        booking_context_expires_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        NULL,
        $3::jsonb,
        CASE
          WHEN $4::bigint IS NULL THEN NULL
          ELSE to_timestamp($4::double precision / 1000.0)
        END,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (channel, external_user_id)
      DO UPDATE SET
        booking_context = EXCLUDED.booking_context,
        booking_context_expires_at = EXCLUDED.booking_context_expires_at,
        updated_at = CURRENT_TIMESTAMP;
      `,
      [channel, externalUserId, JSON.stringify(context || {}), expiresAt]
    );
  } catch {
    // Permite probar el flujo antes de ejecutar la migración de contexto.
  }
}

export async function updateWhatsAppMvpContextForHandoff({
  channel,
  externalUserId,
  message,
}) {
  if (channel !== "whatsapp" || !externalUserId || !String(message || "").trim()) {
    return false;
  }
  const current = await loadBookingContext(channel, externalUserId);
  if (!current?.whatsapp_mvp) return false;
  let categories = [];
  try {
    categories = await getPublicRoomCategoriesService();
  } catch (error) {
    console.warn("No se pudieron cargar categorías al actualizar el handoff:", error.message);
  }
  const progress = handleWhatsAppMvpTurn({ message, context: current, categories, externalUserId });
  if (JSON.stringify(current) === JSON.stringify(progress.context)) return false;
  await saveBookingContext(channel, externalUserId, progress.context);
  return true;
}


function whatsappBookingSpecialRequests(state = {}) {
  const ages = Array.isArray(state.child_ages) ? state.child_ages.join(", ") : "";
  const details = [
    "Solicitud originada por WhatsApp",
    "Adultos: " + Number(state.adults || 0),
    "Niños: " + Number(state.children || 0) + (ages ? " (edades: " + ages + ")" : ""),
    "Mascotas: " + Number(state.pets || 0) + (Number(state.pets || 0) > 0 ? " (S/ 20 por mascota/noche; autorización del hospedaje)" : ""),
    state.preferences ? "Preferencias: " + state.preferences : "",
    state.recommended_category?.name ? "Categoría sugerida: " + state.recommended_category.name : "",
    state.staff_confirmation?.category_name ? "Categoría confirmada por el equipo: " + state.staff_confirmation.category_name : "",
  ].filter(Boolean);
  return details.join(" | ").slice(0, 1800);
}

function whatsappBookingCreatedReply(state, bookingResult, paymentMethod) {
  const language = state.language || "es";
  const booking = bookingResult.booking || {};
  const amount = "S/ " + Number(booking.total_amount || 0).toFixed(2);
  const code = booking.booking_code || "registrada";
  const url = bookingResult.payment_url || env.culqiPaymentUrl;
  const messages = {
    es: paymentMethod === "pay_at_property"
      ? "¡Tu reserva quedó registrada y confirmada! Código: " + code + ". Total: " + amount + ". El pago se realizará directamente en Casa Huéspedes Pimentel al llegar."
      : "¡Listo! Registramos tu reserva pendiente de pago. Código: " + code + ". Total: " + amount + ". Paga aquí: " + url + ". También se activó el envío del correo con los detalles y el enlace. Después de pagar, vuelve a este chat y escribe “Ya pagué”. La reserva se confirmará únicamente cuando el equipo verifique el pago en Culqi.",
    en: paymentMethod === "pay_at_property"
      ? "Your reservation is registered and confirmed. Code: " + code + ". Total: " + amount + ". You will pay directly at Casa Huéspedes Pimentel when you arrive."
      : "Your reservation is registered and awaiting payment. Code: " + code + ". Total: " + amount + ". Pay here: " + url + ". We also started the email with your booking details and payment link. After paying, return to this chat and write “I have paid”. The reservation will only be confirmed after our team verifies the payment in Culqi.",
    pt: paymentMethod === "pay_at_property"
      ? "Sua reserva foi registrada e confirmada. Código: " + code + ". Total: " + amount + ". O pagamento será feito diretamente no estabelecimento na chegada."
      : "Sua reserva foi registrada e aguarda pagamento. Código: " + code + ". Total: " + amount + ". Pague aqui: " + url + ". Também iniciamos o envio do e-mail com os detalhes e o link. Depois de pagar, volte a este chat e escreva “Já paguei”. A reserva só será confirmada após a verificação da equipe na Culqi.",
    fr: paymentMethod === "pay_at_property"
      ? "Votre réservation est enregistrée et confirmée. Code : " + code + ". Total : " + amount + ". Vous paierez directement à l'établissement à votre arrivée."
      : "Votre réservation est enregistrée et en attente de paiement. Code : " + code + ". Total : " + amount + ". Payez ici : " + url + ". L'envoi de l'e-mail avec les détails et le lien a également été lancé. Après le paiement, revenez dans ce chat et écrivez « J'ai payé ». La réservation ne sera confirmée qu'après vérification par notre équipe dans Culqi.",
  };
  return messages[language] || messages.es;
}

function whatsappPaymentStatusReply(language, status) {
  const confirmed = status === "confirmed";
  const messages = {
    es: confirmed
      ? "¡Tu reserva está confirmada! El equipo verificó el pago. Gracias por elegir Casa Huéspedes Pimentel."
      : "Gracias. Registramos tu aviso de pago y notificamos al equipo. Deben verificar el movimiento en Culqi; la reserva todavía no está confirmada.",
    en: confirmed
      ? "Your reservation is confirmed. Our team verified the payment. Thank you for choosing Casa Huéspedes Pimentel."
      : "Thank you. We recorded your payment notice and notified the team. They must verify the transaction in Culqi; the reservation is not confirmed yet.",
    pt: confirmed
      ? "Sua reserva está confirmada. Nossa equipe verificou o pagamento. Obrigado por escolher a Casa Huéspedes Pimentel."
      : "Obrigado. Registramos seu aviso de pagamento e notificamos a equipe. A transação precisa ser verificada na Culqi; a reserva ainda não está confirmada.",
    fr: confirmed
      ? "Votre réservation est confirmée. Notre équipe a vérifié le paiement. Merci d'avoir choisi Casa Huéspedes Pimentel."
      : "Merci. Nous avons enregistré votre avis de paiement et averti l'équipe. La transaction doit être vérifiée dans Culqi ; la réservation n'est pas encore confirmée.",
  };
  return messages[language] || messages.es;
}

function whatsappBookingFailureReply(language) {
  const messages = {
    es: "No pude completar el registro automático porque la validación interna necesita una revisión adicional. Mantengo tu solicitud para que nuestro equipo continúe contigo; no necesitas repetir los datos.",
    en: "I couldn't complete the automatic registration because the internal validation needs another review. I've kept your request for our team to continue; you don't need to repeat your details.",
    pt: "Não foi possível concluir o registro automático porque a validação interna precisa de uma revisão. Mantive sua solicitação para nossa equipe continuar; você não precisa repetir os dados.",
    fr: "Je n'ai pas pu terminer l'enregistrement automatique, car une vérification interne supplémentaire est nécessaire. Votre demande est conservée pour que notre équipe puisse continuer sans vous demander de répéter les informations.",
  };
  return messages[language] || messages.es;
}

async function executeWhatsAppMvpAction({ progress, channel, externalUserId }) {
  const state = progress.context?.whatsapp_mvp || {};
  if (progress.action === "create_booking") {
    await saveBookingContext(channel, externalUserId, progress.context);
    try {
      const result = await createBookingByCategoryService({
        category_slug: state.staff_confirmation?.category_slug || state.category_slug,
        check_in: state.check_in,
        check_out: state.check_out,
        guests_count: Number(state.total_guests),
        special_requests: whatsappBookingSpecialRequests(state),
        customer: {
          full_name: state.customer_name,
          phone: state.customer_phone,
          email: state.customer_email,
          document_type: null,
          document_number: null,
        },
        source: "whatsapp",
      }, {
        bookingIntentId: state.intent_id,
        source: "whatsapp",
        paymentMethod: progress.paymentMethod,
        staffConfirmed: true,
        finalAmount: state.staff_confirmation?.total_amount,
      });

      const paymentUrl = progress.paymentMethod === "culqi_link"
        ? (result.payment_url || env.culqiPaymentUrl)
        : null;
      const nextState = {
        ...state,
        state: result.booking?.status === "confirmed" ? "confirmed" : "booked",
        payment_method: progress.paymentMethod,
        payment_url: paymentUrl,
        payment_status: result.booking?.payment_status || "pending",
        booking: {
          id: result.booking?.id,
          booking_code: result.booking?.booking_code,
          status: result.booking?.status,
        },
      };
      delete nextState.awaiting;
      const nextContext = { state: "whatsapp_mvp", whatsapp_mvp: nextState };
      await saveBookingContext(channel, externalUserId, nextContext);
      return {
        reply: whatsappBookingCreatedReply(nextState, result, progress.paymentMethod),
        responseId: null,
        deterministic: true,
        mode: "whatsapp_mvp_booking_created",
      };
    } catch (error) {
      console.error("No se pudo registrar la reserva desde WhatsApp MVP:", error.message);
      const retryState = { ...state, state: "handoff" };
      delete retryState.awaiting;
      delete retryState.staff_confirmation;
      const retryContext = { state: "whatsapp_mvp", whatsapp_mvp: retryState };
      await saveBookingContext(channel, externalUserId, retryContext);
      return {
        reply: whatsappBookingFailureReply(state.language || "es"),
        responseId: null,
        deterministic: true,
        mode: "human_review_required",
      };
    }
  }

  if (progress.action === "report_payment") {
    try {
      const result = await reportBookingPaymentByIntentService(state.intent_id);
      const nextState = {
        ...state,
        state: result.status === "confirmed" ? "confirmed" : "payment_reported",
        payment_status: result.payment_status,
      };
      await saveBookingContext(channel, externalUserId, {
        state: "whatsapp_mvp",
        whatsapp_mvp: nextState,
      });
      return {
        reply: whatsappPaymentStatusReply(state.language || "es", result.status),
        responseId: null,
        deterministic: true,
        mode: "whatsapp_mvp_payment_reported",
      };
    } catch (error) {
      console.error("No se pudo registrar el aviso de pago de WhatsApp:", error.message);
      return {
        reply: "No pude registrar el aviso en este momento. Nuestro equipo puede revisar el pago contigo; conserva el comprobante de Culqi.",
        responseId: null,
        deterministic: true,
        mode: "human_review_required",
      };
    }
  }

  if (progress.action === "refresh_booking_status") {
    try {
      const result = await getBookingByIntentService(state.intent_id);
      if (!result?.booking) {
        return {
          reply: "No encuentro una reserva asociada a esta conversación. Nuestro equipo puede ayudarte a revisarla.",
          responseId: null,
          deterministic: true,
          mode: "human_review_required",
        };
      }
      const status = result.booking.status;
      const nextState = {
        ...state,
        state: status === "confirmed" ? "confirmed" : status === "payment_reported" ? "payment_reported" : "booked",
        payment_status: result.booking.payment_status,
      };
      await saveBookingContext(channel, externalUserId, {
        state: "whatsapp_mvp",
        whatsapp_mvp: nextState,
      });
      return {
        reply: whatsappPaymentStatusReply(state.language || "es", status),
        responseId: null,
        deterministic: true,
        mode: "whatsapp_mvp_booking_status",
      };
    } catch (error) {
      console.error("No se pudo consultar el estado de la reserva WhatsApp:", error.message);
      return {
        reply: "No puedo consultar el estado de la reserva ahora mismo. Nuestro equipo puede revisarlo contigo.",
        responseId: null,
        deterministic: true,
        mode: "human_review_required",
      };
    }
  }
  return null;
}

export async function confirmWhatsAppMvpReservation({
  channel,
  externalUserId,
  categorySlug,
  totalAmount,
  petAuthorized = false,
  childBedAvailabilityConfirmed = false,
}) {
  if (channel !== "whatsapp") {
    const error = new Error("La confirmación de reservas MVP solo está disponible para WhatsApp.");
    error.statusCode = 400;
    throw error;
  }
  const handoffResult = await pool.query(
    `SELECT handoff_active FROM meta_conversations
     WHERE channel = $1 AND external_user_id = $2
     LIMIT 1;`,
    [channel, externalUserId]
  );
  if (!handoffResult.rows[0]?.handoff_active) {
    const error = new Error("La conversación ya no está en atención humana activa.");
    error.statusCode = 409;
    throw error;
  }
  const context = await loadBookingContext(channel, externalUserId);
  const current = context?.whatsapp_mvp || {};
  if (Number(current.total_guests || 0) >= 8) {
    const error = new Error("Los grupos de 8 o más huéspedes requieren gestión manual de varias habitaciones.");
    error.statusCode = 409;
    throw error;
  }
  const categories = await getPublicRoomCategoriesService();
  const maxCapacity = categories.length
    ? Math.max(...categories.map((item) => Number(item.capacity || 0)))
    : 0;
  if (maxCapacity > 0 && Number(current.total_guests || 0) > maxCapacity) {
    const error = new Error("La solicitud requiere varias habitaciones y debe gestionarse manualmente.");
    error.statusCode = 409;
    throw error;
  }
  const category = categories.find((item) => String(item.slug) === String(categorySlug));
  if (!category) {
    const error = new Error("La categoría seleccionada no existe o no está activa.");
    error.statusCode = 400;
    throw error;
  }
  if (Number(category.capacity) < Number(current.total_guests || 0)) {
    const error = new Error("La categoría seleccionada no tiene capacidad para todos los huéspedes.");
    error.statusCode = 400;
    throw error;
  }
  const prepared = prepareWhatsAppMvpReservationContext({
    context,
    category,
    totalAmount,
    externalUserId,
    petAuthorized,
    childBedAvailabilityConfirmed,
  });
  await saveBookingContext(channel, externalUserId, prepared.context);
  return { reply: prepared.reply, category };
}

async function ensureDurableBookingIntent(
  channel,
  externalUserId,
  { forceNew = false } = {}
) {
  const dbClient = await pool.connect();

  try {
    await dbClient.query("BEGIN");
    await dbClient.query(
      `
      INSERT INTO ai_conversations (
        channel, external_user_id, last_response_id, booking_context,
        booking_context_expires_at, updated_at
      )
      VALUES ($1, $2, NULL, '{}'::jsonb, NULL, CURRENT_TIMESTAMP)
      ON CONFLICT (channel, external_user_id) DO NOTHING;
      `,
      [channel, externalUserId]
    );

    const currentResult = await dbClient.query(
      `
      SELECT booking_context, booking_context_expires_at
      FROM ai_conversations
      WHERE channel = $1 AND external_user_id = $2
      FOR UPDATE;
      `,
      [channel, externalUserId]
    );
    const row = currentResult.rows[0];
    const expired = row?.booking_context_expires_at &&
      new Date(row.booking_context_expires_at).getTime() <= Date.now();
    const current = !expired && row?.booking_context &&
      typeof row.booking_context === "object"
      ? row.booking_context
      : {};
    const canReuse = !forceNew && Boolean(current.intent_id) &&
      ["draft", "booked", "payment_reported"].includes(current.state);
    const next = canReuse
      ? current
      : {
          ...(forceNew ? {} : current),
          state: "draft",
          active: true,
          intent_id: randomUUID(),
        };

    await dbClient.query(
      `
      UPDATE ai_conversations
      SET booking_context = $3::jsonb,
          booking_context_expires_at = CURRENT_TIMESTAMP + INTERVAL '30 minutes',
          updated_at = CURRENT_TIMESTAMP
      WHERE channel = $1 AND external_user_id = $2;
      `,
      [channel, externalUserId, JSON.stringify(next)]
    );
    await dbClient.query("COMMIT");
    return next;
  } catch (error) {
    await dbClient.query("ROLLBACK");
    throw error;
  } finally {
    dbClient.release();
  }
}

function publicCategory(category) {
  return {
    slug: category.slug,
    name: category.name,
    total_quantity: Number(category.total_quantity || 0),
    available_quantity:
      category.available_quantity === undefined
        ? undefined
        : Number(category.available_quantity || 0),
    capacity: Number(category.capacity || 1),
    bed_description: category.bed_description || null,
    description: category.description || null,
    price_per_night: Number(category.price_per_night || 0),
    image_url: category.image_url || null,
  };
}

async function executeTool(call, { onAvailability } = {}) {
  try {
    const args = JSON.parse(call.arguments || "{}");

    if (call.name === "consultar_disponibilidad") {
      const result = await searchAvailableRoomCategoriesService({
        check_in: args.check_in,
        check_out: args.check_out,
        guests_count: args.guests_count,
      });

      // Guarda únicamente el stock por categoría. La unidad física no se
      // asigna hasta el momento de crear la reserva.
      await onAvailability?.(result);

      return JSON.stringify({
        success: true,
        check_in: result.check_in,
        check_out: result.check_out,
        nights: result.nights,
        available_count: result.available_count,
        categories: result.categories
          .filter((category) => category.available_quantity > 0)
          .map(publicCategory),
        reservation_created: false,
      });
    }

    if (call.name === "listar_habitaciones") {
      const categories = await getPublicRoomCategoriesService();
      return JSON.stringify({
        success: true,
        categories: categories.map(publicCategory),
      });
    }

    return JSON.stringify({ success: false, error: "Función no reconocida." });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.message || "No se pudo ejecutar la consulta.",
    });
  }
}

async function loadStoredHistory(channel, externalUserId, currentMessage) {
  try {
    const result = await pool.query(
      "SELECT author, content FROM meta_messages WHERE channel = $1 AND external_user_id = $2 AND content <> '' ORDER BY created_at DESC, id DESC LIMIT 20;",
      [channel, externalUserId]
    );
    const history = result.rows.reverse();

    const last = history[history.length - 1];
    if (last?.author === "client" && last.content?.trim() === currentMessage.trim()) {
      history.pop();
    }

    return history;
  } catch {
    return [];
  }
}

function responseInput(history, message) {
  const recent = Array.isArray(history) ? history : [];
  const input = recent
    .filter((item) => typeof item?.content === "string" && item.content.trim())
    .map((item) => ({
      role: item.author === "client" ? "user" : "assistant",
      content: item.content.trim(),
    }));

  input.push({ role: "user", content: message });
  return input;
}

async function trackedResponse(openai, request, meta) {
  const response = await openai.responses.create(request);
  await recordOpenAiUsage(response, meta);
  return response;
}

async function createFirstResponse(
  openai,
  { message, previousResponseId, history, recoveryHistory, channel, externalUserId }
) {
  const request = {
    model: env.openai.model,
    instructions: buildHotelAssistantPrompt({ channel }),
    input: responseInput(
      previousResponseId ? history : recoveryHistory,
      message
    ),
    tools: channel === "whatsapp" ? tools.filter((tool) => tool.name !== "consultar_disponibilidad") : tools,
    parallel_tool_calls: false,
    max_output_tokens: env.ai.maxOutputTokens,
    store: true,
  };

  if (!previousResponseId) return trackedResponse(openai, request, { channel, externalUserId, operation: "assistant_response" });

  try {
    return await trackedResponse(openai, {
      ...request,
      previous_response_id: previousResponseId,
    }, { channel, externalUserId, operation: "assistant_response" });
  } catch {
    // Si OpenAI perdió el id previo, reconstruye el contexto desde Supabase.
    return trackedResponse(openai, {
      ...request,
      input: responseInput(recoveryHistory, message),
    }, { channel, externalUserId, operation: "assistant_response" });
  }
}

async function generateAiReplyInternal({
  channel,
  externalUserId,
  message,
  history = [],
  now = new Date(),
}) {
  // El asesor virtual opera 24/7. isAiServiceTime se conserva como punto
  // único de decisión para mantener compatibilidad con la arquitectura actual.
  if (!isAiServiceTime(now)) {
    return {
      reply: buildHumanServiceRedirect(channel),
      responseId: null,
      deterministic: true,
      mode: "human_redirect",
    };
  }

  // Pedido explícito del menú del hotel: respuesta fija, breve y sin
  // consultar datos externos. Otras consultas sí pasan por el filtro de alcance.
  if (channel === "whatsapp" && isWhatsAppMenuRequest(message)) {
    const context = await loadBookingContext(channel, externalUserId);
    const menu = handleWhatsAppMvpTurn({ message, context });
    return {
      reply: menu.reply, responseId: null, deterministic: true, mode: menu.mode,
    };
  }

  // Las respuestas estructuradas del flujo WhatsApp (fechas, edades, nombre,
  // correo y elección de pago) se procesan antes del clasificador de alcance.
  // Así un "no", un número o un correo no se confunden con una consulta ajena.
  if (channel === "whatsapp" && !policyInformationType(message)) {
    const current = await loadBookingContext(channel, externalUserId);
    let categories = [];
    if (current?.whatsapp_mvp || isReservationIntent(message)) {
      try {
        categories = await getPublicRoomCategoriesService();
      } catch (error) {
        console.warn("No se pudieron cargar categorías para recomendar habitación:", error.message);
      }
    }
    const progress = handleWhatsAppMvpTurn({
      message,
      context: current,
      externalUserId,
      categories,
      now,
    });
    if (progress.action) {
      const actionResult = await executeWhatsAppMvpAction({
        progress,
        channel,
        externalUserId,
      });
      if (actionResult) return actionResult;
    }
    if (JSON.stringify(current) !== JSON.stringify(progress.context)) {
      await saveBookingContext(channel, externalUserId, progress.context);
    }
    if (progress.handled) {
      return {
        reply: progress.reply,
        responseId: null,
        deterministic: true,
        mode: progress.mode,
      };
    }
  }

  // Un asesor de hospedaje no debe contestar temas generales ni usar las
  // herramientas de tarifas/reservas para responder solicitudes ajenas.
  // Para mensajes ambiguos, un clasificador independiente valida el alcance
  // antes de generar cualquier respuesta abierta o consultar inventario.
  const hotelScope = await isHotelRelatedMessage(message, {
    history: history.length ? history : await loadStoredHistory(channel, externalUserId, message),
    classify: async ({ message: currentMessage, history: recentHistory }) => {
      const classification = await trackedResponse(getClient(), {
        model: env.openai.model,
        instructions: HOTEL_SCOPE_CLASSIFIER_PROMPT,
        input: JSON.stringify({
          mensaje_actual: currentMessage,
          historial_reciente: recentHistory,
        }),
        max_output_tokens: 128,
        store: false,
      }, { channel, externalUserId, operation: "scope_classifier" });
      return classification.output_text;
    },
  });

  if (!hotelScope) {
    return {
      reply: OUT_OF_HOTEL_SCOPE_REPLY,
      responseId: null,
      deterministic: true,
      mode: "outside_hotel_scope",
    };
  }

  // La dirección oficial se obtiene del perfil verificado en Supabase.
  // La pregunta no consume ni modifica el contexto de reserva.
  if (isHotelLocationInquiry(message)) {
    try {
      const profile = await getPublicHotelProfileService();
      return {
        reply: formatHotelLocationReply(profile, message),
        responseId: null,
        deterministic: true,
        mode: "hotel_location_information",
      };
    } catch (error) {
      console.warn("No se pudo consultar dirección oficial:", error.message);
      return {
        reply: "No puedo confirmar la dirección en este momento. Nuestro equipo puede ayudarte a llegar.",
        responseId: null,
        deterministic: true,
        mode: "hotel_location_unavailable",
      };
    }
  }

  // Una consulta sobre reglas comerciales no equivale a modificar la reserva.
  // Responderla antes de la recolección de datos/guardias de atención humana
  // evita repetir "¿cuáles son las fechas?" cuando ya hay un borrador abierto.
  if (policyInformationType(message)) {
    let rules;
    try {
      rules = await getHotelGuestPolicyRulesService();
    } catch (error) {
      console.warn("No se pudieron consultar reglas de huéspedes:", error.message);
      // Una indisponibilidad de la base nunca debe dar lugar a un cargo
      // inventado. El formateador usa solo reglas conservadoras de respaldo.
    }
    const policyReply = formatPolicyInformationReply(message, { rules });
    return {
      reply: policyReply,
      responseId: null,
      deterministic: true,
      mode: "policy_information",
    };
  }



  // Las excepciones de Instagram y Facebook siguen con sus reglas de revisión.
  const specialQuoteReason = requiresManualReview(message, {
    hasReservationIntent: isReservationIntent(message) || isCategoryPriceInquiry(message),
  });
  if (specialQuoteReason) {
    return { reply: humanReviewReply(specialQuoteReason, env.hotel.phone), responseId: null, deterministic: true, mode: "human_review_required" };
  }

  // Responder servicios reales desde Supabase incluso mientras haya una reserva
  // a medio completar. Las preguntas informativas no alteran el contexto.
  if (isHotelServicesInquiry(message)) {
    try {
      const services = await getPublicHotelServicesService();
      return {
        reply: formatHotelServicesReply(services, message),
        responseId: null,
        deterministic: true,
        mode: "hotel_services_information",
      };
    } catch (error) {
      console.warn("No se pudo consultar el catálogo de servicios:", error.message);
      return {
        reply: "No puedo confirmar los servicios ahora mismo. Nuestro equipo puede revisar la información contigo.",
        responseId: null,
        deterministic: true,
        mode: "hotel_services_unavailable",
      };
    }
  }

  // Las preguntas generales de precios se responden con los valores vigentes
  // de Supabase, sin depender de la memoria del modelo ni de sus herramientas.
  if (isCategoryPriceInquiry(message)) {
    try {
      const categories = await getPublicRoomCategoriesService();
      return {
        reply: formatCategoryPricesReply(categories, message, { channel }),
        responseId: null,
        deterministic: true,
        mode: "category_prices",
      };
    } catch (error) {
      console.warn("No se pudieron consultar las tarifas vigentes:", error.message);
      return {
        reply: "No puedo confirmar los precios en este momento. Para evitar darte información incorrecta, por favor comunícate con nuestro equipo al " + (env.hotel.phone || "901551287") + ".",
        responseId: null,
        deterministic: true,
        mode: "category_prices_unavailable",
      };
    }
  }

  // Las preguntas informativas no deben quedar atrapadas en un borrador de
  // reserva anterior. La fuente oficial es el catálogo de Supabase.
  if (isRoomDetailsInquiry(message)) {
    try {
      const categories = await getPublicRoomCategoriesService();
      return {
        reply: formatRoomDetailsReply(categories, message),
        responseId: null,
        deterministic: true,
        mode: "category_details",
      };
    } catch (error) {
      console.warn("No fue posible consultar las categorías:", error.message);
      return {
        reply: "No puedo confirmar los detalles de las habitaciones en este momento. Nuestro equipo puede ayudarte.",
        responseId: null,
        deterministic: true,
        mode: "category_details_unavailable",
      };
    }
  }

  let bookingContext = await loadBookingContext(channel, externalUserId);
  const exception = requiresManualReview(message, {
    bookingInProgress: Boolean(bookingContext?.active),
    hasReservationIntent: isReservationIntent(message),
  });
  if (exception) {
    return { reply: humanReviewReply(exception, env.hotel.phone), responseId: null, deterministic: true, mode: "human_review_required" };
  }

  const newReservation = channel !== "whatsapp" && isNewReservationIntent(message);
  if (channel !== "whatsapp" && (newReservation || isReservationIntent(message))) {
    bookingContext = await ensureDurableBookingIntent(
      channel,
      externalUserId,
      { forceNew: newReservation }
    );
  }
  // Sin PMS, el MVP WhatsApp nunca consulta inventario ni crea pre-reservas.
  // Sus peticiones de reserva se derivan arriba para atención humana.
  const deterministic = channel === "whatsapp"
    ? { handled: false, context: bookingContext }
    : await handleDeterministicBookingFlow({
    message,
    context: bookingContext,
    hotelPhone: env.hotel.phone || "901551287",
    paymentUrl: env.culqiPaymentUrl,
    newIntentPrepared: newReservation,
    // Las reservas por Instagram y Facebook también deben ser conversacionales:
    // una pregunta por vez, con verificación de stock antes de solicitar PII.
    progressiveCollection: true,
    services: {
      listCategories: getPublicRoomCategoriesService,
      searchAvailableRooms: searchAvailableRoomCategoriesService,
      createBooking: (bookingData, options = {}) =>
        createBookingByCategoryService(bookingData, {
          ...options,
          conversation: { channel, externalUserId },
        }),
      getBooking: getBookingByIntentService,
      reportPayment: reportBookingPaymentByIntentService,
    },
  });

  if (deterministic.handled) {
    if (!deterministic.contextPersisted) {
      await saveBookingContext(
        channel,
        externalUserId,
        deterministic.context
      );
    } else {
      memoryBookingContexts.set(conversationKey(channel, externalUserId), {
        context: deterministic.context,
        expiresAt: Date.now() + BOOKED_CONTEXT_TTL_MS,
      });
    }
    return {
      reply: deterministic.reply,
      responseId: null,
      deterministic: true,
      mode: deterministic.mode || "booking_flow",
    };
  }

  if (
    JSON.stringify(deterministic.context) !== JSON.stringify(bookingContext)
  ) {
    bookingContext = deterministic.context;
    await saveBookingContext(channel, externalUserId, bookingContext);
  }

  const previousResponseId = await getPreviousResponseId(
    channel,
    externalUserId
  );

  const openai = getClient();

  const recoveryHistory = await loadStoredHistory(
    channel,
    externalUserId,
    message
  );

  let response = await createFirstResponse(openai, {
    message,
    previousResponseId,
    history,
    recoveryHistory,
    channel,
    externalUserId,
  });

  for (let round = 0; round < 4; round += 1) {
    const calls = response.output.filter(
      (item) => item.type === "function_call"
    );
    if (calls.length === 0) break;

    const toolOutputs = await Promise.all(
      calls.map(async (call) => ({
        type: "function_call_output",
        call_id: call.call_id,
        output: await executeTool(call, {
          onAvailability: async (availability) => {
            bookingContext = mergeAvailabilityIntoBookingContext(
              bookingContext,
              availability
            );
            await saveBookingContext(
              channel,
              externalUserId,
              bookingContext
            );
          },
        }),
      }))
    );

    response = await trackedResponse(openai, {
      model: env.openai.model,
      instructions: buildHotelAssistantPrompt({ channel }),
      previous_response_id: response.id,
      input: toolOutputs,
      tools: channel === "whatsapp" ? tools.filter((tool) => tool.name !== "consultar_disponibilidad") : tools,
      parallel_tool_calls: false,
      max_output_tokens: env.ai.maxOutputTokens,
      store: true,
    }, { channel, externalUserId, operation: "tool_followup" });
  }

  await savePreviousResponseId(channel, externalUserId, response.id);

  // Meta muestra a veces los asteriscos de Markdown literalmente. Entregar
  // texto plano sin alterar precios ni la estructura del mensaje.
  const reply = response.output_text?.trim().replace(/\*\*/g, "");
  if (!reply) {
    const error = new Error(
      "El asesor no pudo generar una respuesta. Inténtalo nuevamente."
    );
    error.statusCode = 502;
    throw error;
  }

  return { reply, responseId: response.id };
}

export async function generateAiReply(input) {
  const key = conversationKey(input.channel, input.externalUserId);
  const previous = conversationQueues.get(key) || Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(() => generateAiReplyInternal(input));

  conversationQueues.set(key, current);

  try {
    return await current;
  } finally {
    if (conversationQueues.get(key) === current) {
      conversationQueues.delete(key);
    }
  }
}
