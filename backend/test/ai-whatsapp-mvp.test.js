import test from "node:test";
import assert from "node:assert/strict";
import {
  handleWhatsAppMvpTurn,
  formatWhatsAppHandoffSummary,
  prepareWhatsAppMvpReservation,
} from "../src/modules/ai/ai.whatsapp-mvp.js";

function turn(message, context = {}, now = new Date(), extra = {}) {
  return handleWhatsAppMvpTurn({ message, context, now, ...extra });
}

test("MVP pregunta solamente los datos pendientes antes de pasar al equipo", () => {
  const start = turn("Hola, quiero reservar");
  assert.equal(start.mode, "whatsapp_mvp_collecting");
  assert.match(start.reply, /fechas de entrada y salida/);
  const dates = turn("Del 20/11/2026 al 22/11/2026", start.context);
  assert.match(dates.reply, /Cuántas personas|Cuántas|Cu[aá]ntas personas/);
  const guests = turn("Somos 2 adultos y 1 niño", dates.context);
  assert.match(guests.reply, /edades/i);
  const ages = turn("6", guests.context);
  assert.match(ages.reply, /mascotas/i);
  const done = turn("No", ages.context);
  assert.equal(done.mode, "human_review_required");
  assert.match(done.reply, /una persona de nuestro equipo/i);
  assert.deepEqual(done.context.whatsapp_mvp.child_ages, [6]);
  assert.equal(done.context.whatsapp_mvp.total_guests, 3);
  assert.equal(done.context.whatsapp_mvp.pets, 0);
  assert.equal(done.context.whatsapp_mvp.state, "handoff");
  const summary = formatWhatsAppHandoffSummary(done.context.whatsapp_mvp);
  assert.match(summary, /20\/11\/2026/);
  assert.match(summary, /22\/11\/2026/);
  assert.match(summary, /todavía no existe reserva/);
});

test("intención tras consulta de habitaciones retiene datos sin iniciar reserva prematuramente", () => {
  const info = turn("Somos 2 adultos y queremos una doble");
  assert.equal(info.handled, false);
  assert.equal(info.context.whatsapp_mvp.state, "browsing");
  const booking = turn("Quiero reservar del 20/11/2026 al 22/11/2026 sin mascotas y sin niños", info.context);
  assert.equal(booking.mode, "human_review_required");
  assert.equal(booking.context.whatsapp_mvp.category_slug, "doble");
  assert.equal(booking.context.whatsapp_mvp.adults, 2);
});

test("menú opcional no obliga a elegir ni elimina contexto", () => {
  const info = turn("Quiero reservar");
  const menu = turn("¿Qué opciones hay en el menú?", info.context);
  assert.equal(menu.mode, "whatsapp_mvp_menu");
  assert.match(menu.reply, /Habitaciones y tarifas/);
  assert.deepEqual(menu.context, info.context);
});

test("reserva en inglés recoge datos y deriva en su idioma", () => {
  const start = turn("I want to book a room");
  assert.match(start.reply, /check-in and check-out/i);
  const details = turn("20/11/2026 to 22/11/2026, 2 adults, no pets, no children", start.context);
  assert.equal(details.mode, "human_review_required");
  assert.match(details.reply, /I'll connect you with our team/);
});

test("el MVP no ofrece pago ni registra reserva antes de la aprobación humana", () => {
  const result = turn("Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos sin mascotas y sin niños");
  assert.equal(result.mode, "human_review_required");
  assert.match(result.reply, /confirmar disponibilidad/);
  assert.doesNotMatch(result.reply, /Pagar en el establecimiento|Pagar ahora|enlace de Culqi/i);
  assert.equal(result.context.whatsapp_mvp.state, "handoff");
});

test("reserva con niños sin edad pregunta antes de escalar", () => {
  const result = turn("Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos y 1 niño sin mascotas");
  assert.equal(result.mode, "whatsapp_mvp_collecting");
  assert.match(result.reply, /edades/i);
});


test("nunca supone que dos adultos implica ausencia de niños", () => {
  const start = turn("Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos sin mascotas");
  assert.equal(start.mode, "whatsapp_mvp_collecting");
  assert.match(start.reply, /Viajan niños/i);
  const done = turn("No", start.context);
  assert.equal(done.mode, "human_review_required");
  assert.equal(done.context.whatsapp_mvp.children, 0);
});

test("un mensaje autónomo sobre el menú no inicia reserva", () => {
  const menu = turn("¿Qué opciones hay en el menú?");
  assert.equal(menu.mode, "whatsapp_mvp_menu");
  assert.equal(menu.context.whatsapp_mvp, undefined);
});


test("una consulta de información no reinicia una reserva en curso", () => {
  const progress = turn("Quiero reservar");
  const info = turn("¿Cuáles son las tarifas?", progress.context);
  assert.equal(info.handled, false);
  assert.deepEqual(info.context, progress.context);
  const resumed = turn("20/11/2026 al 22/11/2026", info.context);
  assert.equal(resumed.mode, "whatsapp_mvp_collecting");
  assert.match(resumed.reply, /personas/i);
});


test("reconoce números escritos con palabras y conserva el contexto de la reserva", () => {
  const now = new Date("2026-10-30T15:00:00.000Z");
  const start = turn("Me podría ayudar a reservar por favor", {}, now);
  const dates = turn("Fecha: 8/12 Salida: 10/12", start.context, now);
  assert.equal(dates.context.whatsapp_mvp.check_in, "2026-12-08");
  assert.equal(dates.context.whatsapp_mvp.check_out, "2026-12-10");
  const guests = turn("Dos adultos, sin niños", dates.context, now);
  assert.equal(guests.context.whatsapp_mvp.adults, 2);
  assert.equal(guests.context.whatsapp_mvp.children, 0);
  assert.equal(guests.context.whatsapp_mvp.total_guests, 2);
  assert.match(guests.reply, /mascotas/i);
  const done = turn("No llevamos mascotas", guests.context, now);
  assert.equal(done.mode, "human_review_required");
  assert.equal(done.context.whatsapp_mvp.pets, 0);
  const summary = formatWhatsAppHandoffSummary(done.context.whatsapp_mvp);
  assert.match(summary, /Adultos: 2/);
  assert.match(summary, /Niños: 0/);
  assert.match(summary, /Huéspedes totales: 2/);
});

test("interpreta respuestas cortas, edades con años y preguntas con número escrito", () => {
  const now = new Date("2026-10-30T15:00:00.000Z");
  const start = turn("Quiero reservar", {}, now);
  const dates = turn("20/11/2026 al 22/11/2026", start.context, now);
  const guests = turn("Somos dos adultos y dos niños", dates.context, now);
  assert.match(guests.reply, /edades/i);
  const ages = turn("5 años y 7 años", guests.context, now);
  assert.deepEqual(ages.context.whatsapp_mvp.child_ages, [5, 7]);
  assert.match(ages.reply, /mascotas/i);
  const done = turn("No.", ages.context, now);
  assert.equal(done.mode, "human_review_required");
  assert.equal(done.context.whatsapp_mvp.total_guests, 4);
});

test("infiere el año siguiente para fechas sin año y acepta 'dos adultos?' como respuesta", () => {
  const now = new Date("2026-10-30T15:00:00.000Z");
  const start = turn("Quiero reservar", {}, now);
  const dates = turn("8/1 al 10/1", start.context, now);
  assert.equal(dates.context.whatsapp_mvp.check_in, "2027-01-08");
  assert.equal(dates.context.whatsapp_mvp.check_out, "2027-01-10");
  const guests = turn("Dos adultos?", dates.context, now);
  assert.equal(guests.context.whatsapp_mvp.adults, 2);
  assert.match(guests.reply, /niños/i);
  const noChildren = turn("No hay niños", guests.context, now);
  assert.equal(noChildren.context.whatsapp_mvp.children, 0);
  assert.match(noChildren.reply, /mascotas/i);
});


test("normaliza fechas sin año que ya estaban guardadas en el contexto", () => {
  const now = new Date("2026-10-30T15:00:00.000Z");
  const context = {
    state: "whatsapp_mvp",
    whatsapp_mvp: {
      state: "collecting",
      awaiting: "guests",
      check_in: "10/12",
      check_out: "12/12",
      children: 0,
      child_ages: [],
      language: "es"
    }
  };
  const result = turn("Dos adultos", context, now);
  assert.equal(result.context.whatsapp_mvp.check_in, "2026-12-10");
  assert.equal(result.context.whatsapp_mvp.check_out, "2026-12-12");
  assert.equal(result.context.whatsapp_mvp.adults, 2);
  assert.match(result.reply, /mascotas/i);
});

test("reconoce negaciones naturales de mascotas con tampoco y futuro", () => {
  const now = new Date("2026-10-30T15:00:00.000Z");
  for (const answer of [
    "Perfecto, y tampoco llevamos mascotas.",
    "No llevaremos mascotas.",
    "No traemos mascotas.",
  ]) {
    const start = turn("Quiero reservar del 8/12 al 10/12 para dos adultos sin niños", {}, now);
    assert.match(start.reply, /mascotas/i);
    const done = turn(answer, start.context, now);
    assert.equal(done.mode, "human_review_required", answer);
    assert.equal(done.context.whatsapp_mvp.pets, 0, answer);
  }
});

test("actualiza una corrección después de derivar y responde el total de huéspedes", () => {
  const context = {
    state: "whatsapp_mvp",
    whatsapp_mvp: {
      state: "handoff",
      language: "es",
      check_in: "2026-12-08",
      check_out: "2026-12-10",
      adults: 2,
      children: 0,
      child_ages: [],
      pets: 0,
      total_guests: 2,
    },
  };
  const correction = turn("En realidad, somos dos adultos y mi mamá.", context);
  assert.equal(correction.mode, "whatsapp_mvp_handoff_update");
  assert.equal(correction.context.whatsapp_mvp.adults, 3);
  assert.equal(correction.context.whatsapp_mvp.total_guests, 3);
  assert.match(correction.reply, /3 huéspedes en total/);

  const summary = turn("¿Entonces cuántas personas serían en total?", correction.context);
  assert.equal(summary.mode, "whatsapp_mvp_summary");
  assert.match(summary.reply, /3 huéspedes en total/);

  const information = turn("¿Puedo llegar un poco antes del horario habitual?", correction.context);
  assert.equal(information.handled, false);
  assert.deepEqual(information.context, correction.context);
});


test("la recomendación elige la categoría de menor capacidad que admite al grupo", () => {
  const categories = [
    { slug: "familiar", name: "Familiar 1", capacity: 5, price_per_night: 250 },
    { slug: "triple", name: "Triple", capacity: 3, price_per_night: 210 },
    { slug: "matrimonial", name: "Matrimonial", capacity: 2, price_per_night: 120 },
  ];
  const start = turn(
    "Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos y 1 niño sin mascotas",
    {},
    new Date("2026-10-30T15:00:00.000Z"),
    { categories }
  );
  const done = turn("6 años", start.context, new Date("2026-10-30T15:00:00.000Z"), { categories });
  const handoff = done;
  assert.equal(handoff.context.whatsapp_mvp.recommended_category.slug, "triple");
  assert.match(handoff.reply, /Triple/);
  const summary = formatWhatsAppHandoffSummary(handoff.context.whatsapp_mvp);
  assert.match(summary, /50 % del diferencial/);
});

test("la aprobación humana habilita datos del huésped y dos métodos de pago", () => {
  const request = turn(
    "Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos sin niños y sin mascotas"
  );
  const approved = prepareWhatsAppMvpReservation({
    context: request.context,
    category: { slug: "matrimonial", name: "Matrimonial Estándar", capacity: 2, price_per_night: 120 },
    totalAmount: 240,
    externalUserId: "51987654321",
  });
  assert.equal(approved.context.whatsapp_mvp.state, "awaiting_customer_name");
  assert.ok(approved.reply.includes("S/ 240.00"));

  const name = turn("Ana Torres", approved.context, new Date(), { externalUserId: "51987654321" });
  assert.equal(name.context.whatsapp_mvp.customer_name, "Ana Torres");
  assert.match(name.reply, /correo electrónico/i);

  const email = turn("ana@example.com", name.context, new Date(), { externalUserId: "51987654321" });
  assert.equal(email.context.whatsapp_mvp.customer_email, "ana@example.com");
  assert.match(email.reply, /Pagar en el establecimiento/);
  assert.match(email.reply, /Pagar ahora/);

  const onSite = turn("1", email.context, new Date(), { externalUserId: "51987654321" });
  assert.equal(onSite.action, "create_booking");
  assert.equal(onSite.paymentMethod, "pay_at_property");
  assert.equal(onSite.context.whatsapp_mvp.state, "creating_booking");

  const online = turn("2", email.context, new Date(), { externalUserId: "51987654321" });
  assert.equal(online.action, "create_booking");
  assert.equal(online.paymentMethod, "culqi_link");
});

test("si WhatsApp no entrega un teléfono numérico, el asesor lo solicita", () => {
  const request = turn(
    "Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos sin niños y sin mascotas"
  );
  const approved = prepareWhatsAppMvpReservation({
    context: request.context,
    category: { slug: "matrimonial", name: "Matrimonial Estándar", capacity: 2, price_per_night: 120 },
    totalAmount: 240,
    externalUserId: "bsuid-example",
  });
  const name = turn("Ana Torres", approved.context, new Date(), { externalUserId: "bsuid-example" });
  assert.equal(name.context.whatsapp_mvp.state, "awaiting_customer_phone");
  const phone = turn("+51 987 654 321", name.context, new Date(), { externalUserId: "bsuid-example" });
  assert.equal(phone.context.whatsapp_mvp.customer_phone, "51987654321");
  assert.match(phone.reply, /correo electrónico/i);
});

test("una modificación posterior a la aprobación invalida la validación y devuelve el caso al equipo", () => {
  const request = turn(
    "Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos sin niños y sin mascotas"
  );
  const approved = prepareWhatsAppMvpReservation({
    context: request.context,
    category: { slug: "matrimonial", name: "Matrimonial Estándar", capacity: 2, price_per_night: 120 },
    totalAmount: 240,
    externalUserId: "51987654321",
  });
  const changed = turn("Del 21/11/2026 al 23/11/2026", approved.context, new Date(), { externalUserId: "51987654321" });
  assert.equal(changed.mode, "human_review_required");
  assert.equal(changed.context.whatsapp_mvp.state, "handoff");
  assert.equal(changed.context.whatsapp_mvp.staff_confirmation, undefined);
});

test("los grupos de 8 o más no pueden usar el registro automático de una sola habitación", () => {
  const request = turn(
    "Quiero reservar del 20/11/2026 al 22/11/2026 para 8 adultos sin niños y sin mascotas"
  );
  assert.equal(request.mode, "human_review_required");
  assert.match(request.reply, /8 o más/);
  assert.throws(() => prepareWhatsAppMvpReservation({
    context: request.context,
    category: { slug: "familiar", name: "Familiar 1", capacity: 5, price_per_night: 250 },
    totalAmount: 1000,
    externalUserId: "51987654321",
  }), /gestión manual/);
});

test("un aviso de pago genera una acción de reporte solo para una reserva Culqi", () => {
  const context = {
    state: "whatsapp_mvp",
    whatsapp_mvp: {
      state: "booked",
      language: "es",
      intent_id: "22222222-2222-4222-8222-222222222222",
      payment_method: "culqi_link",
    },
  };
  const reported = turn("Ya pagué", context);
  assert.equal(reported.action, "report_payment");
  const onSiteContext = {
    state: "whatsapp_mvp",
    whatsapp_mvp: { ...context.whatsapp_mvp, payment_method: "pay_at_property" },
  };
  const onSite = turn("Ya pagué", onSiteContext);
  assert.equal(onSite.action, undefined);
  assert.match(onSite.reply, /pago quedó pendiente/i);
});


test("grupos que superan la capacidad máxima actual también requieren varias habitaciones", () => {
  const categories = [
    { slug: "familiar", name: "Familiar 1", capacity: 5, price_per_night: 250 },
    { slug: "triple", name: "Triple", capacity: 3, price_per_night: 210 },
  ];
  const result = turn(
    "Quiero reservar del 20/11/2026 al 22/11/2026 para 6 adultos sin niños y sin mascotas",
    {},
    new Date("2026-10-30T15:00:00.000Z"),
    { categories }
  );
  assert.equal(result.context.whatsapp_mvp.max_single_room_capacity, 5);
  assert.match(result.reply, /más de un cuarto|varias habitaciones/i);
  assert.throws(() => prepareWhatsAppMvpReservation({
    context: result.context,
    category: { slug: "familiar", name: "Familiar 1", capacity: 5, price_per_night: 250 },
    totalAmount: 500,
    externalUserId: "51987654321",
  }), /varias habitaciones/);
});

test("una pregunta sobre pagar en el establecimiento no se interpreta como elección", () => {
  const context = {
    state: "whatsapp_mvp",
    whatsapp_mvp: {
      state: "awaiting_payment_choice",
      language: "es",
      staff_confirmation: { total_amount: 240 },
      customer_name: "Ana Torres",
      customer_email: "ana@example.com",
      customer_phone: "51987654321",
    },
  };
  const result = turn("¿Qué pasa si pago en el establecimiento?", context);
  assert.equal(result.handled, false);
  assert.equal(result.action, undefined);
  assert.equal(result.context, context);
});


test("la aprobación humana exige autorizar mascotas y verificar camas para niños de 0 a 4 años", () => {
  const request = turn(
    "Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos, 1 niño de 3 años y 1 mascota"
  );
  assert.equal(request.context.whatsapp_mvp.state, "handoff");
  const base = {
    context: request.context,
    category: { slug: "triple", name: "Triple", capacity: 3, price_per_night: 210 },
    totalAmount: 500,
    externalUserId: "51987654321",
  };
  assert.throws(() => prepareWhatsAppMvpReservation(base), /autorización previa/);
  assert.throws(() => prepareWhatsAppMvpReservation({
    ...base,
    petAuthorized: true,
  }), /camas disponibles/);
  const approved = prepareWhatsAppMvpReservation({
    ...base,
    petAuthorized: true,
    childBedAvailabilityConfirmed: true,
  });
  assert.equal(approved.context.whatsapp_mvp.staff_confirmation.pet_authorized, true);
  assert.equal(approved.context.whatsapp_mvp.staff_confirmation.child_bed_availability_confirmed, true);
});
