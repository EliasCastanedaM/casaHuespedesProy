import test from "node:test";
import assert from "node:assert/strict";
import OpenAI from "openai";
import { env } from "../src/config/env.js";
import { pool } from "../src/config/db.js";
import { generateAiReply } from "../src/modules/ai/ai.service.js";

function setup(t, state, interpret) {
  let context = Object.keys(state).length ? { whatsapp_mvp: structuredClone(state) } : {};
  const requests = [];
  const previousKey = env.openai.apiKey;
  env.openai.apiKey = "mock-only-no-network";
  t.after(() => { env.openai.apiKey = previousKey; });
  t.mock.method(pool, "query", async (sql, params = []) => {
    if (/INSERT INTO .*bookings|UPDATE .*bookings/i.test(sql)) throw new Error("No se autorizan reservas en esta prueba");
    if (sql.includes("SELECT booking_context")) return { rows: [{ booking_context: context, booking_context_expires_at: new Date(Date.now() + 3600000) }] };
    if (sql.includes("INSERT INTO ai_conversations") && sql.includes("booking_context")) context = JSON.parse(params[2]);
    return { rows: [] };
  });
  t.mock.method(OpenAI.Responses.prototype, "create", async (request, options) => {
    requests.push({ request, options });
    assert.equal(request.text?.format?.name, "hotel_booking_understanding");
    const answer = await interpret(JSON.parse(request.input));
    return { id: "mock-understanding", status: "completed", output_text: JSON.stringify(answer) };
  });
  return { requests, context: () => context };
}

const active = { state: "collecting", awaiting: "guests", check_in: "2026-11-25", check_out: "2026-11-28", language: "es" };
for (const channel of ["whatsapp", "instagram", "facebook"]) test(channel + ": usa interpretación real del flujo antes de las reglas de reserva", async t => {
  const message = "Voy con mi señora y mis dos peques de tres y siete";
  const db = setup(t, { ...active, customer_email: "private@example.com" }, () => ({
    intent: "details", updates: [["adults", 2], ["children", 2], ["child_ages", [3, 7]]].map(([field, value]) => ({ field, value, evidence: message })), clarification: null,
  }));
  const result = await generateAiReply({ channel, externalUserId: "semantic-family-" + channel, message });
  assert.match(result.reply, /mascotas/);
  assert.equal(db.context().whatsapp_mvp.adults, 2);
  assert.deepEqual(db.context().whatsapp_mvp.child_ages, [3, 7]);
  assert.equal(db.requests.length, 1);
  assert.doesNotMatch(db.requests[0].request.input, /private@example|historial|pricing_quote/);
  assert.equal(db.requests[0].request.store, false);
  assert.equal(db.requests[0].request.previous_response_id, undefined);
  assert.equal(db.requests[0].options.maxRetries, 0);
});

test("una consulta hipotética no cambia ocupantes aunque contenga números reconocibles", async t => {
  const state = { ...active, state: "quoted", adults: 2, children: 0, child_ages: [], pets: 0 };
  const db = setup(t, state, () => ({ intent: "hypothetical", updates: [], clarification: null }));
  const result = await generateAiReply({ channel: "instagram", externalUserId: "hypothetical", message: "¿Y si fuéramos cuatro adultos?" });
  assert.match(result.reply, /cambiar|consultar/);
  assert.deepEqual(db.context().whatsapp_mvp, state);
});

test("una reserva independiente no envía ocupantes anteriores al intérprete", async t => {
  const db = setup(t, { ...active, adults: 4, children: 2, child_ages: [4, 7], pets: 1 }, input => {
    assert.equal(input.solicitud_actual.adults, undefined);
    assert.equal(input.solicitud_actual.child_ages, undefined);
    return { intent: "new_request", updates: [
      { field: "check_in", value: "2026-12-25", evidence: "25 al 28 de diciembre de 2026" },
      { field: "check_out", value: "2026-12-28", evidence: "25 al 28 de diciembre de 2026" },
    ], clarification: null };
  });
  const result = await generateAiReply({ channel: "facebook", externalUserId: "fresh-semantic", message: "Quiero reservar del 25 al 28 de diciembre de 2026" });
  assert.match(result.reply, /Cuántas personas/);
  assert.equal(db.context().whatsapp_mvp.adults, undefined);
});

test("fallo del proveedor mantiene respuesta de aclaración y no modifica una consulta", async t => {
  const state = { ...active, state: "quoted", adults: 2, children: 0, child_ages: [], pets: 0 };
  const db = setup(t, state, () => { throw Object.assign(new Error("mock timeout"), { code: "ETIMEDOUT" }); });
  const result = await generateAiReply({ channel: "instagram", externalUserId: "semantic-failure", message: "¿Y si fuéramos cuatro adultos?" });
  assert.match(result.reply, /cambio|consultar/);
  assert.deepEqual(db.context().whatsapp_mvp, state);
});

for (const channel of ["whatsapp", "instagram", "facebook"]) test(channel + ": petición relativa nueva exige confirmar adultos, niños y mascotas", async t => {
  const message = "quiero reservar para mañana y el dia siguiente";
  let processing = 0;
  const db = setup(t, { ...active, state: "quoted", adults: 2, children: 0, child_ages: [], pets: 0,
    category_slug: "matrimonial", pricing_quote: { total_amount: 120 } }, input => {
    if (input.mensaje_actual === message) {
      assert.equal(input.solicitud_actual.adults, undefined);
      assert.equal(input.solicitud_actual.children, undefined);
      assert.equal(input.solicitud_actual.pets, undefined);
      // Even if the model chooses 'details' instead of 'new_request', the
      // application boundary must not inherit the old party.
      return { intent: "details", updates: [
        { field: "check_in", value: "2026-11-16", evidence: "mañana" },
        { field: "check_out", value: "2026-11-17", evidence: "el dia siguiente" },
      ], clarification: null };
    }
    return { intent: "details", updates: [{ field: "adults", value: 2, evidence: "2 adultos" }], clarification: null };
  });
  const send = text => generateAiReply({ channel, externalUserId: "relative-fresh-" + channel, message: text, now: new Date("2026-11-15T15:00:00Z") }, { onProcessing: () => { processing++; } });
  const fresh = await send(message);
  assert.match(fresh.reply, /Cuántas personas/);
  assert.doesNotMatch(fresh.reply, /S\//);
  for (const key of ["adults", "children", "child_ages", "pets", "pricing_quote", "category_slug"]) assert.equal(db.context().whatsapp_mvp[key], undefined, key);
  const adults = await send("2 adultos");
  assert.match(adults.reply, /Viajan niños/);
  assert.equal(db.context().whatsapp_mvp.children, undefined);
  assert.equal(db.context().whatsapp_mvp.pets, undefined);
  const children = await send("no");
  assert.match(children.reply, /mascotas/);
  assert.equal(db.context().whatsapp_mvp.children, 0);
  assert.equal(db.context().whatsapp_mvp.pets, undefined);
  assert.equal(processing, 0);
  const complete = await send("no");
  assert.equal(db.context().whatsapp_mvp.pets, 0);
  assert.equal(complete.mode, "reservation_offer");
});

test("aclarar las fechas de una petición nueva no resucita la reserva vieja", async t => {
  const message = "quiero reservar para mañana y el dia siguiente";
  const db = setup(t, { ...active, state: "quoted", adults: 2, children: 0, child_ages: [], pets: 0 }, input => {
    if (input.mensaje_actual === message) return { intent: "unclear", updates: [], clarification: "¿Qué fechas de entrada y salida deseas?" };
    return { intent: "details", updates: [
      { field: "check_in", value: "2026-11-16", evidence: "16 al 17 de noviembre de 2026" },
      { field: "check_out", value: "2026-11-17", evidence: "16 al 17 de noviembre de 2026" },
    ], clarification: null };
  });
  const send = text => generateAiReply({ channel: "instagram", externalUserId: "clarify-fresh", message: text });
  const ambiguous = await send(message);
  assert.match(ambiguous.reply, /entrada y salida/);
  assert.equal(db.context().whatsapp_mvp.state, "collecting");
  assert.equal(db.context().whatsapp_mvp.adults, undefined);
  assert.equal(db.context().whatsapp_mvp.pets, undefined);
  const dates = await send("Del 16 al 17 de noviembre de 2026");
  assert.match(dates.reply, /Cuántas personas/);
  assert.equal(db.context().whatsapp_mvp.children, undefined);
  assert.equal(db.context().whatsapp_mvp.pets, undefined);
});

for (const channel of ["whatsapp", "instagram", "facebook"]) test(channel + ": propuesta y confirmación avanzan aun si el proveedor falla después", async t => {
  const message = "Quiero reservar para mañana y el día siguiente";
  const db = setup(t, { ...active, state: "quoted", adults: 5, children: 0, pets: 0 }, input => {
    if (input.mensaje_actual === message) return { intent: "details", language: "es", updates: [], clarification: null,
      proposal: { check_in: "2026-11-16", check_out: "2026-11-18", evidence: "mañana y el día siguiente" } };
    throw Object.assign(new Error("mock timeout"), { code: "ETIMEDOUT" });
  });
  const send = message => generateAiReply({ channel, externalUserId: "proposal-" + channel, message, now: new Date("2026-11-15T12:00:00Z") });
  const offered = await send(message);
  assert.match(offered.reply, /2 noches/);
  assert.equal(db.context().whatsapp_mvp.check_in, undefined);
  assert.equal(db.context().whatsapp_mvp.adults, undefined);
  const confirmed = await send("yes please");
  assert.match(confirmed.reply, /adults/);
  assert.equal(db.context().whatsapp_mvp.check_out, "2026-11-18");
  assert.equal(db.context().whatsapp_mvp.children, undefined);
  assert.equal(db.context().whatsapp_mvp.pets, undefined);
});

for (const channel of ["whatsapp", "instagram", "facebook"]) test(channel + ": repara evidencia no contigua sin perder familia ni fechas", async t => {
  const message = "Viajamos mi esposa, mis dos hijos y yo. Quiero reservar del 5 al 7 de diciembre de 2026.";
  let attempt = 0;
  const db = setup(t, {}, input => {
    if (input.mensaje_actual === message) {
      attempt++;
      return { intent: "details", language: "es", updates: [
        {field:"adults",value:2,evidence:attempt===1 ? "mi esposa y yo" : "mi esposa, mis dos hijos y yo"},
        {field:"children",value:2,evidence:"mis dos hijos"},
        {field:"check_in",value:"2026-12-05",evidence:"5 al 7 de diciembre de 2026"},
        {field:"check_out",value:"2026-12-07",evidence:"5 al 7 de diciembre de 2026"},
      ], clarification:null };
    }
    return { intent:"details",language:"es",updates:[{field:"pets",value:0,evidence:input.mensaje_actual}],clarification:null };
  });
  const send = message => generateAiReply({channel,externalUserId:"repair-family-"+channel,message,now:new Date("2026-11-18T01:00:00Z")});
  const initial = await send(message);
  assert.equal(db.requests.length,2,"solo un reintento de interpretación");
  assert.match(initial.reply,/edad/i);
  assert.doesNotMatch(initial.reply,/qué fechas|qué datos deseas cambiar|cuántas personas/i);
  const state = db.context().whatsapp_mvp;
  assert.equal(state.adults,2); assert.equal(state.children,2);
  assert.equal(state.check_in,"2026-12-05"); assert.equal(state.check_out,"2026-12-07");
  assert.equal(state.pets,undefined);
  await send("Uno tiene 4 años y el otro 15.");
  assert.deepEqual(db.context().whatsapp_mvp.child_ages,[4,15]);
  const done = await send("No llevamos mascotas.");
  assert.equal(db.context().whatsapp_mvp.adults,2);
  assert.equal(db.context().whatsapp_mvp.check_out,"2026-12-07");
  assert.doesNotMatch(done.reply,/qué fechas|cuántas personas/i);
});

for (const channel of ['whatsapp','instagram','facebook']) test(channel+': buscar alojamiento conserva familia sin exigir la palabra reservar',async t=>{
  const message='Busco alojamiento del 10 al 12 de diciembre de 2026 para mí, mi pareja y nuestros dos peques.';
  const db=setup(t,{},()=>({intent:'details',language:'es',updates:[
    {field:'check_in',value:'2026-12-10',evidence:message},
    {field:'check_out',value:'2026-12-12',evidence:message},
    {field:'adults',value:2,evidence:message},
    {field:'children',value:2,evidence:message},
  ],clarification:null}));
  const result=await generateAiReply({channel,externalUserId:'natural-start-'+channel,message});
  assert.match(result.reply,/edad/);
  assert.doesNotMatch(result.reply,/Quieres reservar|Cuántas personas|Qué fechas/);
  assert.equal(db.context().whatsapp_mvp.state,'collecting');
  assert.equal(db.context().whatsapp_mvp.adults,2);
  assert.equal(db.context().whatsapp_mvp.children,2);
  assert.equal(db.context().whatsapp_mvp.check_out,'2026-12-12');
  assert.equal(db.context().whatsapp_mvp.pets,undefined);
  assert.equal(db.requests.length,1);
});

for (const intent of ['information','hypothetical']) test('una frase candidata '+intent+' no inicia una solicitud por sí sola',async t=>{
  const state={state:'quoted',adults:2,children:0,pets:0,check_in:'2026-12-10',check_out:'2026-12-12'};
  const db=setup(t,state,()=>({intent,updates:[],clarification:null}));
  await generateAiReply({channel:'instagram',externalUserId:'candidate-'+intent,message:'Busco alojamiento; ¿y si viajara con mis hijos?'});
  assert.deepEqual(db.context().whatsapp_mvp,state);
});
