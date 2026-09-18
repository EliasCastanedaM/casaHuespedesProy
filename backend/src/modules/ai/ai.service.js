import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { pool } from "../../config/db.js";
import {
  listRoomsForAvailabilityService,
  searchAvailableRoomsService,
} from "../availability/availability.service.js";
import {
  checkAvailabilityService,
  createBookingService,
  getBookingByIntentService,
  reportBookingPaymentByIntentService,
} from "../bookings/booking.service.js";
import { buildHotelAssistantPrompt } from "./ai.prompt.js";
import { buildHumanServiceRedirect, isAiServiceTime } from "./ai.schedule.js";
import {
  handleDeterministicBookingFlow,
  isNewReservationIntent,
  isReservationIntent,
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
      "Busca todas las habitaciones realmente disponibles para fechas y huéspedes concretos.",
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
      "Lista las habitaciones activas, sus precios, capacidad y características.",
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
  const ttlMs = ["booked", "payment_reported"].includes(context?.state)
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

function publicRoom(room) {
  return {
    id: room.id,
    name: room.name,
    room_number: room.room_number,
    room_type: room.room_type,
    description: room.description,
    capacity: Number(room.capacity),
    price_per_night: Number(room.price_per_night),
    floor_label: room.floor_label,
    amenities: Array.isArray(room.amenities) ? room.amenities : [],
    main_image_url: room.main_image_url,
  };
}

async function executeTool(call, { onAvailability } = {}) {
  try {
    const args = JSON.parse(call.arguments || "{}");

    if (call.name === "consultar_disponibilidad") {
      const result = await searchAvailableRoomsService({
        check_in: args.check_in,
        check_out: args.check_out,
        guests_count: args.guests_count,
      });

      await onAvailability?.(result);

      return JSON.stringify({
        success: true,
        check_in: result.check_in,
        check_out: result.check_out,
        nights: result.nights,
        available_count: result.available_count,
        rooms: result.rooms.map(publicRoom),
        reservation_created: false,
      });
    }

    if (call.name === "listar_habitaciones") {
      const rooms = await listRoomsForAvailabilityService();
      return JSON.stringify({
        success: true,
        rooms: rooms
          .filter((room) => room.status === "active")
          .map(publicRoom),
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

async function createFirstResponse(
  openai,
  { message, previousResponseId, history, recoveryHistory }
) {
  const request = {
    model: env.openai.model,
    instructions: buildHotelAssistantPrompt(),
    input: responseInput(
      previousResponseId ? history : recoveryHistory,
      message
    ),
    tools,
    parallel_tool_calls: false,
    max_output_tokens: env.ai.maxOutputTokens,
    store: true,
  };

  if (!previousResponseId) return openai.responses.create(request);

  try {
    return await openai.responses.create({
      ...request,
      previous_response_id: previousResponseId,
    });
  } catch {
    // Si OpenAI perdió el id previo, reconstruye el contexto desde Supabase.
    return openai.responses.create({
      ...request,
      input: responseInput(recoveryHistory, message),
    });
  }
}

async function generateAiReplyInternal({
  channel,
  externalUserId,
  message,
  history = [],
  now = new Date(),
}) {
  // El asesor virtual solo opera en el horario nocturno configurado.
  // Esta comprobación ocurre antes de Supabase, flujo de reservas y OpenAI,
  // por lo que durante el día no se consumen tokens ni se ejecuta el bot.
  if (!isAiServiceTime(now)) {
    return {
      reply: buildHumanServiceRedirect(channel),
      responseId: null,
      deterministic: true,
      mode: "human_redirect",
    };
  }

  let bookingContext = await loadBookingContext(channel, externalUserId);
  const newReservation = isNewReservationIntent(message);
  if (newReservation || isReservationIntent(message)) {
    bookingContext = await ensureDurableBookingIntent(
      channel,
      externalUserId,
      { forceNew: newReservation }
    );
  }
  const deterministic = await handleDeterministicBookingFlow({
    message,
    context: bookingContext,
    hotelPhone: env.hotel.phone || "901551287",
    paymentUrl: env.culqiPaymentUrl,
    newIntentPrepared: newReservation,
    services: {
      listRooms: listRoomsForAvailabilityService,
      searchAvailableRooms: searchAvailableRoomsService,
      checkAvailability: checkAvailabilityService,
      createBooking: (bookingData, options = {}) =>
        createBookingService(bookingData, {
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

    response = await openai.responses.create({
      model: env.openai.model,
      instructions: buildHotelAssistantPrompt(),
      previous_response_id: response.id,
      input: toolOutputs,
      tools,
      parallel_tool_calls: false,
      max_output_tokens: env.ai.maxOutputTokens,
      store: true,
    });
  }

  await savePreviousResponseId(channel, externalUserId, response.id);

  const reply = response.output_text?.trim();
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
