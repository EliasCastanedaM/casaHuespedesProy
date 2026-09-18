import { randomUUID } from "node:crypto";

const DEFAULT_PHONE = "901551287";

function normalizedText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

function publicRoomOption(room) {
  return {
    id: Number(room.id),
    name: room.name,
    room_number: room.room_number || null,
    capacity: Number(room.capacity),
    price_per_night: Number(room.price_per_night),
  };
}

export function isReservationIntent(message) {
  const text = normalizedText(message);

  return [
    /\b(?:quiero|quisiera|deseo|necesito|prefiero|voy a)\s+(?:hacer\s+)?(?:la\s+)?(?:reserva|reservar|pagar)\b/,
    /\bme gustaria\s+(?:hacer\s+)?(?:la\s+)?(?:reserva|reservar|pagar)\b/,
    /\b(?:reservame|separame|apartame)\b/,
    /\bquiero\s+(?:la|habitacion)\s*\d{3}\b/,
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
      !/^(?:correo|email|telefono|teléfono|celular|whatsapp|habitacion|habitación|ingreso|entrada|salida|check)/i.test(line)
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

function extractRoomReference(message) {
  const text = normalizedText(message);
  const labeled = text.match(
    /\b(?:habitacion|cuarto|room)\s*(?:numero|nro|n)?\s*[:#-]?\s*(\d{3})\b/
  )?.[1];
  if (labeled) return labeled;

  const wanted = text.match(
    /\bquiero\s+(?:(?:reservar|pagar)\s+)?(?:la\s+)?(\d{3})\b/
  )?.[1];
  if (wanted) return wanted;

  return /^\d{3}$/.test(text) ? text : null;
}

function roomMatches(room, reference) {
  if (!room || !reference) return false;
  return (
    String(room.room_number || "") === String(reference) ||
    normalizedText(room.name).includes(String(reference))
  );
}

async function resolveSelectedRoom(reference, context, listRooms) {
  if (!reference) return context.room || null;

  const knownRooms = Array.isArray(context.available_rooms)
    ? context.available_rooms
    : [];
  const known = knownRooms.find((room) => roomMatches(room, reference));
  if (known) return publicRoomOption(known);

  const rooms = await listRooms();
  const selected = rooms.find(
    (room) => room.status === "active" && roomMatches(room, reference)
  );

  return selected ? publicRoomOption(selected) : null;
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
  if (!context.room?.id) missing.push("habitación");
  if (!context.check_in) missing.push("fecha de ingreso");
  if (!context.check_out && !context.nights) missing.push("fecha de salida");
  if (!context.guests_count) missing.push("cantidad de huéspedes");
  if (!context.customer?.full_name) missing.push("nombre completo");
  if (!context.customer?.email) missing.push("correo");
  if (!context.customer?.phone) missing.push("celular");
  return missing;
}

function missingDataReply(context, invalidRoomReference) {
  const missing = missingFields(context);
  const knownRoomNumbers = (context.available_rooms || [])
    .map((room) => room.room_number)
    .filter(Boolean)
    .join(", ");
  const invalidRoomLine = invalidRoomReference
    ? `No pude identificar la habitación ${invalidRoomReference}.\n`
    : "";
  const optionsLine = knownRoomNumbers && missing.includes("habitación")
    ? `Opciones disponibles: ${knownRoomNumbers}.\n`
    : "";

  return `${invalidRoomLine}${optionsLine}Para crear la pre-reserva me falta: ${missing.join(
    ", "
  )}.\nEnvíame todos esos datos juntos en un solo mensaje. No envíes datos de tarjeta.`;
}

function createdBookingReply(result, paymentUrl) {
  const booking = result.booking;
  return [
    "Tu pre-reserva fue creada correctamente.",
    `Código: ${booking.booking_code}`,
    `Habitación: ${result.room?.name || booking.room_name || "-"}`,
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
  const rooms = result?.rooms || [];
  if (rooms.length === 0) {
    return "No hay otras habitaciones disponibles para esas fechas y cantidad de huéspedes.";
  }

  return [
    "Alternativas disponibles ahora:",
    ...rooms.map(
      (room) =>
        `- ${room.name}${room.room_number ? ` (${room.room_number})` : ""}: ${formatMoney(room.price_per_night)} por noche`
    ),
  ].join("\n");
}

export function mergeAvailabilityIntoBookingContext(context = {}, result) {
  const availableRooms = (result?.rooms || []).map(publicRoomOption);
  const selectedRoom = context.room?.id
    ? availableRooms.find((room) => room.id === Number(context.room.id)) || null
    : null;

  return {
    ...context,
    check_in: result?.check_in || context.check_in || null,
    check_out: result?.check_out || context.check_out || null,
    nights: result?.nights || context.nights || null,
    guests_count: result?.guests_count || context.guests_count || null,
    room: selectedRoom,
    available_rooms: availableRooms,
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
  if (isPaymentReportedMessage(message)) {
    let nextContext = context;

    if (context.intent_id && context.booking?.status !== "payment_reported") {
      try {
        const reported = await services.reportPayment(context.intent_id);
        nextContext = {
          ...context,
          state: "payment_reported",
          booking: {
            ...context.booking,
            status: reported?.status || "payment_reported",
          },
        };
      } catch {
        return {
          handled: true,
          context,
          reply: `El equipo verificará tu pago manualmente. Si necesitas ayuda, llama al ${hotelPhone}. Tu reserva aún no está confirmada.`,
        };
      }
    }

    return {
      handled: true,
      context: nextContext,
      reply: context.booking?.booking_code
        ? `Gracias. El equipo verificará el pago de la pre-reserva ${context.booking.booking_code}. La reserva todavía no está confirmada; recibirás el correo cuando el personal la confirme manualmente.`
        : `Gracias. El equipo verificará el pago manualmente. Si reservaste por otro medio, comparte tu código de reserva o llama al ${hotelPhone}.`,
    };
  }

  const startsNewReservation = isNewReservationIntent(message);
  const baseContext = startsNewReservation && !newIntentPrepared ? {} : context;
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
  const roomReference = extractRoomReference(message);
  const selectedRoom = await resolveSelectedRoom(
    roomReference,
    nextContext,
    services.listRooms
  );
  nextContext = { ...nextContext, room: selectedRoom };

  const missing = missingFields(nextContext);
  if (missing.length > 0) {
    return {
      handled: true,
      context: nextContext,
      reply: missingDataReply(
        nextContext,
        roomReference && !selectedRoom ? roomReference : null
      ),
    };
  }

  const availabilityInput = {
    room_id: nextContext.room.id,
    check_in: nextContext.check_in,
    check_out: nextContext.check_out || undefined,
    nights: nextContext.check_out ? undefined : nextContext.nights,
    guests_count: nextContext.guests_count,
    check_in_time: nextContext.check_in_time || undefined,
  };

  const availability = await services.checkAvailability(availabilityInput);
  if (!availability.available) {
    const alternatives = await services.searchAvailableRooms({
      check_in: nextContext.check_in,
      check_out: nextContext.check_out || undefined,
      nights: nextContext.check_out ? undefined : nextContext.nights,
      guests_count: nextContext.guests_count,
      check_in_time: nextContext.check_in_time || undefined,
    });
    const refreshedContext = mergeAvailabilityIntoBookingContext(
      { ...nextContext, room: null },
      alternatives
    );

    return {
      handled: true,
      context: refreshedContext,
      reply: `${availability.reason || "La habitación seleccionada ya no está disponible."}\nNo se creó ninguna reserva ni se generó un pago.\n${availableAlternativesReply(alternatives)}\nIndica otra habitación o llama al ${hotelPhone}.`,
    };
  }

  try {
    const result = await services.createBooking(
      {
        room_id: nextContext.room.id,
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
        { ...nextContext, room: null },
        alternatives
      );

      return {
        handled: true,
        context: refreshedContext,
        reply: `La habitación seleccionada ya no está disponible. No se creó ninguna reserva ni se generó un pago.\n${availableAlternativesReply(alternatives)}\nIndica otra habitación o llama al ${hotelPhone}.`,
      };
    }

    return {
      handled: true,
      context: nextContext,
      reply: `No se pudo crear la pre-reserva: ${error.message || "inténtalo nuevamente"}. No se generó ningún enlace de pago. Puedes intentarlo otra vez o llamar al ${hotelPhone}.`,
    };
  }
}
