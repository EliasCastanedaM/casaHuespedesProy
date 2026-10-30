function normalized(value) {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim();
}

const BOOKING_WORDS = /\b(?:reservar|reserva|cancelar|cambiar|modificar|confirmar|disponibilidad|bloquear)\b/;

export function isHotelServicesInquiry(message) {
  const text = normalized(message);
  if (!text || BOOKING_WORDS.test(text)) return false;
  const topic = /\b(?:servicios?|wifi|internet|desayuno|cocina|terraza|lavanderia|planchado|limpieza|estacionamiento|taxi|movilidad|salon|turismo)\b/.test(text);
  if (!topic) return false;
  return /[?¿]/.test(message) ||
    /\b(?:que|cuales|cual|incluye|incluyen|tienen|ofrecen|cuanto|cuesta|hay|hablame|cuentame|explicame)\b/.test(text);
}

export function formatHotelServicesReply(services, message) {
  const text = normalized(message);
  if (/\bdesayuno\b/.test(text)) {
    return "El desayuno no está incluido en la tarifa de habitación. Si deseas consultar opciones de desayuno, el equipo puede confirmar si hay alguna disponible y cuánto cuesta.";
  }

  const all = (Array.isArray(services) ? services : [])
    .filter((service) => service && service.name);
  const matchers = [
    [/\b(?:wifi|internet)\b/, /wifi/i],
    [/\bcocina\b/, /cocina/i],
    [/\bterraza\b/, /terraza/i],
    [/\blavanderia\b|\bplanchado\b/, /lavander/i],
    [/\blimpieza\b/, /limpieza/i],
    [/\bestacionamiento\b/, /estacionamiento/i],
    [/\b(?:taxi|movilidad)\b/, /taxi|movilidad/i],
    [/\b(?:turismo|orientacion turistica)\b/, /turism|orientaci[oó]n/i],
    [/\bsalon\b/, /sal[oó]n/i],
  ];
  const matched = matchers.find(([pattern]) => pattern.test(text));
  const chosen = matched ? all.filter((service) => matched[1].test(service.name)) : all;
  if (!chosen.length) {
    return "No tengo un servicio confirmado para esa consulta. El equipo puede revisar tu consulta.";
  }

  if (matched && /estacionamiento/i.test(chosen[0].name)) {
    return "Podemos orientarte sobre estacionamiento cercano, pero no está confirmado que el hospedaje cuente con estacionamiento propio. El equipo puede revisar opciones, disponibilidad y posibles costos.";
  }
  if (matched && /lavander/i.test(chosen[0].name)) {
    return "La lavandería y el planchado están sujetos a disponibilidad y coordinación previa. El equipo confirmará la tarifa antes de contratar el servicio.";
  }
  if (matched && /taxi|movilidad/i.test(chosen[0].name)) {
    return "El equipo puede ayudarte a coordinar un taxi local. El servicio depende de la disponibilidad y de la tarifa del proveedor.";
  }
  if (matched && /wifi/i.test(chosen[0].name)) {
    return "Sí, el alojamiento ofrece Wi-Fi gratuito para los huéspedes.";
  }
  if (matched && /cocina/i.test(chosen[0].name)) {
    return "El alojamiento cuenta con una cocina compartida para huéspedes. Consulta con el equipo las condiciones de uso.";
  }
  if (matched && /terraza/i.test(chosen[0].name)) {
    return "El alojamiento dispone de terraza y espacios al aire libre. La vista puede variar según la habitación.";
  }
  if (matched && /limpieza/i.test(chosen[0].name)) {
    return "La información pública del alojamiento indica que se ofrece limpieza diaria.";
  }
  if (matched && /turism|orientaci[oó]n/i.test(chosen[0].name)) {
    return "Podemos orientarte sobre lugares y actividades cercanas a Pimentel y Lambayeque.";
  }
  if (matched && /sal[oó]n/i.test(chosen[0].name)) {
    return "El alojamiento dispone de un salón compartido para descansar durante la estadía.";
  }

  const coordinated = all.filter((service) =>
    service.requires_coordination || service.price_type === "on_request"
  );
  const listed = all.filter((service) =>
    !service.requires_coordination && service.price_type !== "on_request"
  );
  return [
    "¡Claro! 😊 En la información del hospedaje figuran estos servicios:",
    ...listed.map((service) => "- " + service.name),
    ...(coordinated.length ? [
      "",
      "Requieren coordinación previa:",
      ...coordinated.map((service) => "- " + service.name),
    ] : []),
    "",
    "El desayuno no está incluido en la tarifa de habitación. El equipo confirma disponibilidad y tarifas de los servicios que requieren coordinación.",
  ].join("\n");
}
