import { randomUUID } from "node:crypto";

const DEFAULT_PHONE = "901551287";

function normalizedText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const CATEGORY_LABELS = {
  matrimonial: "Matrimonial Estándar",
  "matrimonial-ejecutiva": "Matrimonial Ejecutiva",
  doble: "Doble",
  triple: "Triple",
  familiar: "Familiar",
};

function inferCategorySlug(category) {
  if (!category) return null;

  const explicit = normalizedText(
    category.category_slug || category.slug || category.category || ""
  );
  if (CATEGORY_LABELS[explicit]) return explicit;

  const searchable = normalizedText(
    `${category.name || ""} ${category.category_name || ""}`
  );

  if (searchable.includes("matrimonial ejecutiva")) {
    return "matrimonial-ejecutiva";
  }
  if (
    searchable.includes("matrimonial estandar") ||
    searchable === "matrimonial"
  ) {
    return "matrimonial";
  }

  return (
    Object.keys(CATEGORY_LABELS).find((slug) =>
      searchable.includes(slug)
    ) || null
  );
}

function categoryLabel(roomOrSlug) {
  if (!roomOrSlug) return null;
  const slug =
    typeof roomOrSlug === "string"
      ? normalizedText(roomOrSlug)
      : inferCategorySlug(roomOrSlug);
  return CATEGORY_LABELS[slug] || null;
}

function compactSpaces(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

function parseDateToken(value) {
  const token = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(token)) {
    return isIsoDate(token) ? token : null;
  }

  const match = token.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return null;

  const iso = `${match[3]}-${String(match[2]).padStart(2, "0")}-${String(
    match[1]
  ).padStart(2, "0")}`;

  return isIsoDate(iso) ? iso : null;
}

function formatMoney(value) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function toIsoDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return String(value || "").match(/^\d{4}-\d{2}-\d{2}/)?.[0] || "";
}

function publicCategoryOption(category, availabilityConfirmed = false) {
  const categorySlug = inferCategorySlug(category);
  const label = categoryLabel(categorySlug);

  return {
    slug: categorySlug,
    name: label,
    category_slug: categorySlug,
    category_name: label,
    capacity: Number(category.capacity),
    price_per_night: Number(category.price_per_night),
    available_quantity:
      category.available_quantity === undefined
        ? undefined
        : Number(category.available_quantity || 0),
    availability_confirmed: availabilityConfirmed,
  };
}

function normalizeCategoryContext(context = {}) {
  const legacyCategory = context.category || context.room || null;
  const legacyAvailable =
    context.available_categories || context.available_rooms || [];
  const { room: _room, available_rooms: _availableRooms, ...safeContext } =
    context;

  return {
    ...safeContext,
    category: legacyCategory
      ? publicCategoryOption(
          legacyCategory,
          Boolean(legacyCategory.availability_confirmed)
        )
      : null,
    available_categories: Array.isArray(legacyAvailable)
      ? legacyAvailable.map((category) =>
          publicCategoryOption(
            category,
            Boolean(category.availability_confirmed)
          )
        )
      : [],
  };
}

export function isReservationIntent(message) {
  const text = normalizedText(message);

  return [
    /\b(?:quiero|quisiera|deseo|necesito|prefiero|voy a)\s+(?:hacer\s+)?(?:la\s+)?(?:reserva|reservar|pagar)\b/,
    /\bme gustaria\s+(?:hacer\s+)?(?:la\s+)?(?:reserva|reservar|pagar)\b/,
    /\b(?:reservame|separame|apartame)\b/,
    /\bquiero\s+(?:(?:la\s+)?habitacion\s+)?\d{3}\b/,
    /\b(?:quiero|quisiera|deseo|necesito|prefiero)\s+(?:(?:una|la)\s+)?(?:habitacion\s+)?(?:matrimonial|doble|triple|familiar)\b/,
  ].some((pattern) => pattern.test(text));
}

export function isNewReservationIntent(message) {
  const text = normalizedText(message);
  return [
    /\b(?:nueva|otra)\s+reserva\b/,
    /\b(?:quiero|deseo|necesito)\s+reservar\s+(?:de\s+)?nuevo\b/,
    /\b(?:quiero|deseo|necesito)\s+(?:hacer\s+)?otra\s+reserva\b/,
  ].some((pattern) => pattern.test(text));
}

export function isPaymentReportedMessage(message) {
  const text = normalizedText(message);

  return [
    /\bya\s+(?:pague|pago)\b/,
    /\bya\s+(?:hice|realice|efectue|complete)\s+(?:el\s+)?pago\b/,
    /\b(?:pago|transferencia)\s+(?:realizado|realizada|hecho|hecha|listo|lista)\b/,
    /\blisto[,\s]+ya\s+(?:pague|pago)\b/,
  ].some((pattern) => pattern.test(text));
}

function extractEmail(message) {
  return (
    String(message || "").match(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
    )?.[0]?.toLowerCase() || null
  );
}

function extractPhone(message) {
  const labeled = String(message || "").match(
    /(?:telefono|teléfono|celular|whatsapp|fono)\s*[:#-]?\s*(\+?\d[\d\s-]{7,16})/i
  )?.[1];
  const candidates = labeled ? [labeled] : String(message || "").match(/\+?\d[\d\s-]{7,16}/g) || [];

  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, "");
    const local = digits.startsWith("51") && digits.length === 11
      ? digits.slice(2)
      : digits;

    if (/^9\d{8}$/.test(local)) return local;
  }

  return null;
}

function cleanNameCandidate(value) {
  const candidate = compactSpaces(value)
    .replace(/\b(?:correo|email|e-mail|telefono|teléfono|celular|whatsapp)\b.*$/i, "")
    .replace(/[.,;:-]+$/g, "")
    .trim();

  if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{5,120}$/.test(candidate)) return null;
  if (candidate.split(/\s+/).length < 2) return null;
  return candidate;
}

function extractFullName(message, allowUnlabeled = true) {
  const text = String(message || "");
  const labeled = text.match(
    /(?:nombre(?:\s+completo)?|me llamo)\s*[:#-]?\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{5,120})/i
  )?.[1];

  if (labeled) return cleanNameCandidate(labeled);

  const soy = text.match(
    /\bsoy\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{5,120})(?=,|;|\n|\.|$)/i
  )?.[1];
  if (soy) return cleanNameCandidate(soy);

  if (!allowUnlabeled) return null;

  const lines = text.split(/\r?\n|;/).map((line) => line.trim());
  for (const line of lines) {
    if (
      !/@|\d/.test(line) &&
      !/^(?:correo|email|telefono|teléfono|celular|whatsapp|habitacion|habitación|ingreso|entrada|salida|check)/i.test(line) &&
      !/\b(?:quiero|quisiera|deseo|reservar|matrimonial|doble|triple|familiar)\b/i.test(line)
    ) {
      const candidate = cleanNameCandidate(line);
      if (candidate) return candidate;
    }
  }

  return null;
}

function extractGuests(message) {
  const match = normalizedText(message).match(
    /\b(\d{1,2})\s*(?:personas?|huespedes?|adultos?)\b/
  );
  if (!match) return null;
  const guests = Number(match[1]);
  return Number.isInteger(guests) && guests >= 1 && guests <= 30
    ? guests
    : null;
}

function extractNights(message) {
  const match = normalizedText(message).match(/\b(\d{1,2})\s*noches?\b/);
  if (!match) return null;
  const nights = Number(match[1]);
  return Number.isInteger(nights) && nights >= 1 && nights <= 60
    ? nights
    : null;
}

function extractCheckInTime(message) {
  return (
    normalizedText(message).match(
      /(?:hora\s+de\s+(?:ingreso|entrada|llegada)|check[ -]?in)\s*[:#-]?\s*([01]\d|2[0-3]):([0-5]\d)/
    )?.slice(1, 3).join(":") || null
  );
}

function extractDocument(message) {
  const match = normalizedText(message).match(
    /\b(dni|ce|carnet\s+de\s+extranjeria|pasaporte)\s*[:#-]?\s*([a-z0-9-]{6,20})\b/
  );
  if (!match) return {};

  const types = {
    dni: "DNI",
    ce: "CE",
    "carnet de extranjeria": "CE",
    pasaporte: "Pasaporte",
  };

  return {
    document_type: types[match[1]],
    document_number: match[2].toUpperCase(),
  };
}

function extractSpecialRequests(message) {
  const value = String(message || "").match(
    /(?:solicitud(?:es)?\s+especial(?:es)?|comentario|pedido\s+especial)\s*[:#-]?\s*([^\n;]{3,300})/i
  )?.[1];
  return value ? compactSpaces(value) : null;
}

function extractDates(message) {
  const text = String(message || "");
  const tokenPattern = "(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{4})";
  const checkIn = text.match(
    new RegExp(`(?:check[ -]?in|ingreso|entrada|llegada)\\s*[:#-]?\\s*${tokenPattern}`, "i")
  )?.[1];
  const checkOut = text.match(
    new RegExp(`(?:check[ -]?out|salida)\\s*[:#-]?\\s*${tokenPattern}`, "i")
  )?.[1];
  const all = [...text.matchAll(new RegExp(tokenPattern, "g"))]
    .map((match) => parseDateToken(match[1]))
    .filter(Boolean);

  return {
    check_in: parseDateToken(checkIn) || all[0] || null,
    check_out: parseDateToken(checkOut) || all[1] || null,
  };
}

function extractCategoryReference(message) {
  const text = normalizedText(message);

  if (/\bmatrimonial\s+ejecutiva\b/.test(text)) {
    return "matrimonial-ejecutiva";
  }

  if (/\bmatrimonial\s+(?:estandar|standard)\b/.test(text)) {
    return "matrimonial";
  }

  const category = Object.keys(CATEGORY_LABELS).find((slug) =>
    new RegExp(`\\b${slug}\\b`).test(text)
  );
  if (category) return category;

  if (
    /\b(?:habitacion|cuarto|room)\s*(?:numero|nro|n)?\s*[:#-]?\s*\d{3}\b/.test(
      text
    ) || /^\d{3}$/.test(text)
  ) {
    return "__physical_room__";
  }

  return null;
}

function categoryMatches(category, reference) {
  if (!category || !reference || reference === "__physical_room__") {
    return false;
  }

  const normalizedReference = normalizedText(reference);
  return (
    Boolean(CATEGORY_LABELS[normalizedReference]) &&
    inferCategorySlug(category) === normalizedReference
  );
}

async function resolveSelectedCategory(reference, context, listCategories) {
  if (!reference) return context.category || null;
  if (reference === "__physical_room__") return null;

  const knownCategories = Array.isArray(context.available_categories)
    ? context.available_categories
    : [];
  const known = knownCategories.find((category) =>
    categoryMatches(category, reference)
  );
  if (known) return publicCategoryOption(known, true);

  const categories = await listCategories();
  const selected = categories.find(
    (category) => categoryMatches(category, reference)
  );

  return selected ? publicCategoryOption(selected, false) : null;
}

function mergeMessageData(
  context,
  message,
  { activate = true, allowUnlabeledName = true } = {}
) {
  const dates = extractDates(message);
  const email = extractEmail(message);
  const phone = extractPhone(message);
  const fullName = extractFullName(message, allowUnlabeledName);
  const guests = extractGuests(message);
  const nights = extractNights(message);
  const checkInTime = extractCheckInTime(message);
  const document = extractDocument(message);
  const specialRequests = extractSpecialRequests(message);

  return {
    ...context,
    active: activate ? true : Boolean(context.active),
    check_in: dates.check_in || context.check_in || null,
    check_out: dates.check_out || context.check_out || null,
    nights: nights || context.nights || null,
    guests_count: guests || context.guests_count || null,
    check_in_time: checkInTime || context.check_in_time || null,
    special_requests:
      specialRequests || context.special_requests || null,
    customer: {
      ...(context.customer || {}),
      ...document,
      ...(fullName ? { full_name: fullName } : {}),
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
    },
  };
}

function missingFields(context) {
  const missing = [];
  if (!context.category?.category_slug) missing.push("categoría de habitación");
  if (!context.check_in) missing.push("fecha de ingreso");
  if (!context.check_out && !context.nights) missing.push("fecha de salida");
  if (!context.guests_count) missing.push("cantidad de huéspedes");
  if (!context.customer?.full_name) missing.push("nombre completo");
  if (!context.customer?.email) missing.push("correo");
  if (!context.customer?.phone) missing.push("celular");
  return missing;
}

function missingDataReply(context, invalidCategoryReference) {
  const missing = missingFields(context);
  const knownCategories = [
    ...new Set(
      (context.available_categories || [])
        .map((category) => categoryLabel(category))
        .filter(Boolean)
    ),
  ].join(", ");
  const invalidCategoryLine =
    invalidCategoryReference === "__physical_room__"
      ? "Las reservas se realizan por categoría, no por número físico de habitación.\n"
      : invalidCategoryReference
        ? "No pude identificar esa categoría de habitación.\n"
        : "";
  const optionsLine =
    knownCategories && missing.includes("categoría de habitación")
      ? `Categorías disponibles: ${knownCategories}.\n`
      : "";

  return `${invalidCategoryLine}${optionsLine}Para crear la pre-reserva me falta: ${missing.join(
    ", "
  )}.\nEnvíame todos esos datos juntos en un solo mensaje. No envíes datos de tarjeta.`;
}

function createdBookingReply(result, paymentUrl) {
  const booking = result.booking;
  const category =
    categoryLabel(result.category || result.room) ||
    categoryLabel({ name: booking.category_name }) ||
    "Confirmada";

  return [
    "Tu pre-reserva fue creada correctamente.",
    `Código: ${booking.booking_code}`,
    `Categoría: ${category}`,
    `Ingreso: ${formatDate(toIsoDateValue(booking.check_in))}`,
    `Salida: ${formatDate(toIsoDateValue(booking.check_out))}`,
    `Huéspedes: ${Number(booking.guests_count)}`,
    `Total: ${formatMoney(booking.total_amount)}`,
    "Estado: pendiente de pago.",
    `Paga aquí: ${paymentUrl}`,
    'Después del pago, escribe “Ya pagué”. El equipo verificará el pago y confirmará la reserva manualmente.',
  ].join("\n");
}

function minimalCompletedContext(result, intentId) {
  return {
    state: "booked",
    active: false,
    intent_id: intentId,
    booking: {
      id: result.booking.id,
      booking_code: result.booking.booking_code,
      status: result.booking.status,
    },
  };
}

function availableAlternativesReply(result) {
  const categories = (result?.categories || []).filter(
    (category) => Number(category.available_quantity || 0) > 0
  );

  if (categories.length === 0) {
    return "No hay otras categorías disponibles para esas fechas y cantidad de huéspedes.";
  }

  return [
    "Categorías disponibles ahora:",
    ...categories.map((category) => {
      const quantity = Number(category.available_quantity || 0);
      return `- ${category.name}: ${quantity} ${quantity === 1 ? "habitación disponible" : "habitaciones disponibles"}`;
    }),
  ].join("\n");
}

export function mergeAvailabilityIntoBookingContext(context = {}, result) {
  const safeContext = normalizeCategoryContext(context);
  const availableCategories = (result?.categories || [])
    .filter((category) => Number(category.available_quantity || 0) > 0)
    .map((category) =>
      publicCategoryOption(
        {
          ...category,
          category_slug: category.slug,
        },
        true
      )
    );

  const selectedCategorySlug = inferCategorySlug(safeContext.category);
  const selectedCategory = selectedCategorySlug
    ? availableCategories.find(
        (category) => category.category_slug === selectedCategorySlug
      ) || null
    : null;

  return {
    ...safeContext,
    check_in: result?.check_in || safeContext.check_in || null,
    check_out: result?.check_out || safeContext.check_out || null,
    nights: result?.nights || safeContext.nights || null,
    guests_count: result?.guests_count || safeContext.guests_count || null,
    category: selectedCategory,
    available_categories: availableCategories,
  };
}

export async function handleDeterministicBookingFlow({
  message,
  context = {},
  services,
  hotelPhone = DEFAULT_PHONE,
  paymentUrl,
  createIntentId = randomUUID,
  newIntentPrepared = false,
}) {
  const safeInitialContext = normalizeCategoryContext(context);

  if (isPaymentReportedMessage(message)) {
    let nextContext = safeInitialContext;

    if (
      safeInitialContext.intent_id &&
      safeInitialContext.booking?.status !== "payment_reported"
    ) {
      try {
        const reported = await services.reportPayment(
          safeInitialContext.intent_id
        );
        nextContext = {
          ...safeInitialContext,
          state: "payment_reported",
          booking: {
            ...safeInitialContext.booking,
            status: reported?.status || "payment_reported",
          },
        };
      } catch {
        return {
          handled: true,
          context: safeInitialContext,
          reply: `El equipo verificará tu pago manualmente. Si necesitas ayuda, llama al ${hotelPhone}. Tu reserva aún no está confirmada.`,
        };
      }
    }

    return {
      handled: true,
      context: nextContext,
      reply: safeInitialContext.booking?.booking_code
        ? `Gracias. El equipo verificará el pago de la pre-reserva ${safeInitialContext.booking.booking_code}. La reserva todavía no está confirmada; recibirás el correo cuando el personal la confirme manualmente.`
        : `Gracias. El equipo verificará el pago manualmente. Si reservaste por otro medio, comparte tu código de reserva o llama al ${hotelPhone}.`,
    };
  }

  const startsNewReservation = isNewReservationIntent(message);
  const baseContext =
    startsNewReservation && !newIntentPrepared ? {} : safeInitialContext;
  const intent = startsNewReservation || isReservationIntent(message);

  if (!baseContext.active && !intent) {
    return {
      handled: false,
      context: mergeMessageData(baseContext, message, {
        activate: false,
        allowUnlabeledName: false,
      }),
    };
  }

  if (baseContext.booking?.id && baseContext.intent_id) {
    const existing = await services.getBooking(baseContext.intent_id);
    if (!existing) {
      return {
        handled: true,
        context: {},
        reply: `No pude recuperar esa pre-reserva. Inicia una nueva reserva o llama al ${hotelPhone}.`,
      };
    }

    return {
      handled: true,
      context: minimalCompletedContext(existing, baseContext.intent_id),
      reply: createdBookingReply(existing, paymentUrl),
    };
  }

  let nextContext = mergeMessageData(baseContext, message);
  nextContext = {
    ...nextContext,
    state: "draft",
    intent_id: nextContext.intent_id || createIntentId(),
  };
  const categoryReference = extractCategoryReference(message);
  const selectedCategory = await resolveSelectedCategory(
    categoryReference,
    nextContext,
    services.listCategories
  );
  nextContext = { ...nextContext, category: selectedCategory };

  const missing = missingFields(nextContext);
  if (missing.length > 0) {
    return {
      handled: true,
      context: nextContext,
      reply: missingDataReply(
        nextContext,
        categoryReference && !selectedCategory ? categoryReference : null
      ),
    };
  }

  // Revalida stock a nivel de categoría justo antes de crear la reserva.
  // La unidad física se elige únicamente dentro del servicio de reservas.
  const categoryAvailability = await services.searchAvailableRooms({
    check_in: nextContext.check_in,
    check_out: nextContext.check_out || undefined,
    nights: nextContext.check_out ? undefined : nextContext.nights,
    guests_count: nextContext.guests_count,
    check_in_time: nextContext.check_in_time || undefined,
  });

  const requestedCategorySlug = inferCategorySlug(nextContext.category);
  const matchingCategory = (categoryAvailability?.categories || []).find(
    (category) =>
      String(category.slug || "").toLowerCase() === requestedCategorySlug &&
      Number(category.available_quantity || 0) > 0
  );

  if (!matchingCategory) {
    const refreshedContext = mergeAvailabilityIntoBookingContext(
      { ...nextContext, category: null },
      categoryAvailability
    );
    const requestedCategory =
      categoryLabel(nextContext.category) || "solicitada";

    return {
      handled: true,
      context: refreshedContext,
      reply: `No quedan habitaciones disponibles en la categoría ${requestedCategory} para esas fechas.\nNo se creó ninguna reserva ni se generó un pago.\n${availableAlternativesReply(categoryAvailability)}\nIndica otra categoría o llama al ${hotelPhone}.`,
    };
  }

  nextContext = {
    ...nextContext,
    category: publicCategoryOption(
      {
        ...matchingCategory,
        category_slug: matchingCategory.slug,
      },
      true
    ),
  };

  try {
    const result = await services.createBooking(
      {
        category_slug: nextContext.category.category_slug,
        check_in: nextContext.check_in,
        check_out: nextContext.check_out || undefined,
        nights: nextContext.check_out ? undefined : nextContext.nights,
        guests_count: nextContext.guests_count,
        check_in_time: nextContext.check_in_time || undefined,
        special_requests: nextContext.special_requests || "",
        customer: {
          full_name: nextContext.customer.full_name,
          phone: nextContext.customer.phone,
          email: nextContext.customer.email,
          document_type: nextContext.customer.document_type || "DNI",
          document_number: nextContext.customer.document_number || "",
        },
      },
      { bookingIntentId: nextContext.intent_id }
    );

    if (result?.mode !== "booking" || !result.booking || !paymentUrl) {
      throw new Error("La reserva no devolvió una confirmación válida.");
    }

    const completedContext = minimalCompletedContext(
      result,
      nextContext.intent_id
    );

    return {
      handled: true,
      context: completedContext,
      contextPersisted: true,
      reply: createdBookingReply(result, paymentUrl),
    };
  } catch (error) {
    if (error.statusCode === 409) {
      const alternatives = await services.searchAvailableRooms({
        check_in: nextContext.check_in,
        check_out: nextContext.check_out || undefined,
        nights: nextContext.check_out ? undefined : nextContext.nights,
        guests_count: nextContext.guests_count,
        check_in_time: nextContext.check_in_time || undefined,
      });
      const refreshedContext = mergeAvailabilityIntoBookingContext(
        { ...nextContext, category: null },
        alternatives
      );

      return {
        handled: true,
        context: refreshedContext,
        reply: `La categoría seleccionada ya no tiene disponibilidad. No se creó ninguna reserva ni se generó un pago.\n${availableAlternativesReply(alternatives)}\nIndica otra categoría o llama al ${hotelPhone}.`,
      };
    }

    return {
      handled: true,
      context: nextContext,
      reply: `No se pudo crear la pre-reserva: ${error.message || "inténtalo nuevamente"}. No se generó ningún enlace de pago. Puedes intentarlo otra vez o llamar al ${hotelPhone}.`,
    };
  }
}
