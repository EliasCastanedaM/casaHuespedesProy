import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/db.js";
import { generateAiReply } from "../src/modules/ai/ai.service.js";
import { buildHotelAssistantPrompt } from "../src/modules/ai/ai.prompt.js";
import { humanReviewReply } from "../src/modules/ai/ai.guest-rules.js";
import { processMetaMessage, getHumanAssistanceContext } from "../src/modules/meta/meta.service.js";
import {
  HUMAN_ASSISTANCE_OFFER, HUMAN_ASSISTANCE_REPLY, SPECIFIC_INQUIRY_REPLY,
  isHumanAssistanceRequest, isSpecificInquiryRequest,
} from "../src/modules/ai/ai.human-assistance.js";

function fixture(channel) {
  const outbox = [];
  const sent = [];
  const generated = [];
  let handoff = false;
  let nextId = 100;
  const db = { query: async (sql, params) => {
    assert.match(sql, /SELECT EXISTS/);
    assert.deepEqual(params, [channel, "human-test", HUMAN_ASSISTANCE_OFFER]);
    return { rows: [{
      offered: outbox.some((row) => row.content === params[2]),
      awaiting_confirmation: outbox.at(-1)?.content === params[2],
    }] };
  } };
  const incoming = (text, id = ++nextId) => ({
    channel, externalUserId: "human-test", messageId: "contact-" + id,
    text, messageType: "text", timestamp: "1794016800",
  });
  // Construct dependencies anew for each turn, keeping only the durable outbox.
  const dependencies = (id, overrides = {}) => ({
    claim: async () => ({ id }),
    findOutgoing: async (incomingId) => outbox.find((row) => row.in_reply_to_message_id === incomingId),
    humanAssistanceContext: (channel, user) => getHumanAssistanceContext(channel, user, db),
    getHandoff: async () => handoff,
    setHandoff: async (_channel, _user, active) => { handoff = active; },
    loadHistory: async () => [],
    isFirstMetaIncomingMessage: async () => false,
    createOutgoing: async (_message, content, author, incomingId) => {
      const row = { id: outbox.length + 1, content, author, status: "pending", in_reply_to_message_id: incomingId };
      outbox.push(row);
      return row;
    },
    generateReply: async (input) => { generated.push(input.message); return { reply: "Respuesta sobre el hospedaje." }; },
    sendReply: async (_message, reply) => { sent.push(reply); return { messages: [{ id: "accepted-" + sent.length }] }; },
    recordOutgoing: async (_message, outgoing) => ({ ...outgoing, status: "sent" }),
    complete: async () => {}, release: async () => {}, sleep: async () => {},
    ...overrides,
  });
  const turn = async (text) => {
    const id = ++nextId;
    return processMetaMessage(incoming(text, id), dependencies(id));
  };
  return { outbox, sent, generated, incoming, dependencies, turn, handoff: () => handoff };
}

for (const channel of ["whatsapp", "instagram", "facebook"]) {
  test(`${channel}: ofrece continuar una vez y deriva a Pepe cuando el huésped insiste`, async () => {
    const f = fixture(channel);
    assert.equal((await f.turn("Quiero hablar con una persona")).status, "human_assistance_offered");
    assert.equal(f.sent[0], HUMAN_ASSISTANCE_OFFER);
    assert.equal(f.handoff(), false);
    await f.turn("¿Cuáles son las tarifas?");
    assert.deepEqual(f.generated, ["¿Cuáles son las tarifas?"]);
    assert.equal((await f.turn("Prefiero un asesor humano")).status, "handoff_requested");
    assert.equal(f.sent.at(-1), HUMAN_ASSISTANCE_REPLY);
    assert.match(f.sent.at(-1), /señor Pepe, dueño del hotel, al \+51 943 030 098/);
    assert.equal(f.outbox.filter((row) => row.content === HUMAN_ASSISTANCE_OFFER).length, 1);
    assert.equal(f.handoff(), true);
    const sentBefore = f.sent.length;
    assert.equal((await f.turn("Hola")).status, "handoff_active");
    assert.equal(f.sent.length, sentBefore);
  });

  test(`${channel}: aceptar el contacto con Sí entrega el número y pausa el chat`, async () => {
    const f = fixture(channel);
    await f.turn("Necesito un asesor humano");
    await f.turn("Sí, por favor");
    assert.deepEqual(f.sent, [HUMAN_ASSISTANCE_OFFER, HUMAN_ASSISTANCE_REPLY]);
    assert.equal(f.handoff(), true);
    assert.deepEqual(f.generated, []);
  });

  test(`${channel}: si prefiere seguir con la IA, conserva el chat y no vuelve a ofrecer`, async () => {
    const f = fixture(channel);
    await f.turn("Quiero hablar con una persona");
    await f.turn("No, gracias");
    assert.equal(f.sent.at(-1), SPECIFIC_INQUIRY_REPLY);
    assert.equal(f.handoff(), false);
    await f.turn("Quiero hablar con una persona");
    assert.equal(f.sent.at(-1), HUMAN_ASSISTANCE_REPLY);
    assert.equal(f.sent.filter((reply) => reply === HUMAN_ASSISTANCE_OFFER).length, 1);
  });
}

test("Sí y No fuera de la invitación conservan su significado en la conversación", async () => {
  const f = fixture("whatsapp");
  await f.turn("Quiero hablar con una persona");
  await f.turn("¿Aceptan mascotas?");
  await f.turn("Sí");
  await f.turn("No");
  assert.equal(f.handoff(), false);
  assert.deepEqual(f.generated, ["¿Aceptan mascotas?", "Sí", "No"]);
});

test("una consulta específica sin tema responde el texto acordado sin tocar la reserva", async (t) => {
  t.mock.method(pool, "query", async () => { throw new Error("No debe consultar ni modificar la reserva"); });
  for (const channel of ["whatsapp", "instagram", "facebook"]) {
    for (const message of ["Quiero hablar de algo específico", "quiero hablar algo especifico", "Quiero hablar de un tema en específico", "Tengo una consulta", "¿Puedo hacerte una pregunta?"]) {
      const result = await generateAiReply({ channel, externalUserId: "specific-test", message });
      assert.equal(result.mode, "specific_inquiry");
      assert.equal(result.reply, SPECIFIC_INQUIRY_REPLY);
    }
  }
  for (const message of ["Quiero hablar de política", "¿Cuánto cuesta una habitación?", "Tengo una consulta sobre mi reserva"]) {
    assert.equal(isSpecificInquiryRequest(message), false);
  }
});

test("la consulta específica no recibe otra bienvenida en el primer turno", async () => {
  const f = fixture("facebook");
  const result = await processMetaMessage(f.incoming("Quiero preguntar algo específico", 99), f.dependencies(99, {
    isFirstMetaIncomingMessage: async () => true,
    generateReply: async (input) => generateAiReply(input),
  }));
  assert.equal(result.status, "replied");
  assert.deepEqual(f.sent, [SPECIFIC_INQUIRY_REPLY]);
});

test("la entrega interrumpida recupera la misma invitación sin convertirla en una segunda solicitud", async () => {
  const f = fixture("whatsapp");
  const incoming = f.incoming("Necesito un asesor humano", 501);
  await assert.rejects(processMetaMessage(incoming, f.dependencies(501, {
    sendReply: async () => { throw new Error("temporal"); },
  })), /temporal/);
  assert.equal(f.outbox.length, 1);
  assert.equal((await processMetaMessage(incoming, f.dependencies(501))).status, "replied_recovered");
  assert.deepEqual(f.sent, [HUMAN_ASSISTANCE_OFFER]);
  assert.equal(f.outbox.length, 1);
  assert.equal(f.handoff(), false);
});

test("el teléfono solicitado se puede recuperar aunque la IA ya esté pausada", async () => {
  const f = fixture("whatsapp");
  await f.turn("Necesito un asesor humano");
  const incoming = f.incoming("Sí", 502);
  await assert.rejects(processMetaMessage(incoming, f.dependencies(502, {
    sendReply: async () => { throw new Error("temporal"); },
  })), /temporal/);
  assert.equal(f.handoff(), true);
  assert.equal((await processMetaMessage(incoming, f.dependencies(502))).status, "replied_recovered");
  assert.equal(f.sent.at(-1), HUMAN_ASSISTANCE_REPLY);
  assert.equal(f.outbox.length, 2);
});

test("las instrucciones y la revisión humana usan el contacto aprobado del dueño", () => {
  const prompt = buildHotelAssistantPrompt();
  assert.ok(prompt.includes(HUMAN_ASSISTANCE_OFFER));
  assert.ok(prompt.includes(HUMAN_ASSISTANCE_REPLY));
  assert.match(humanReviewReply("reserva con mascota"), /\+51 943 030 098/);
  assert.equal(isHumanAssistanceRequest("No quiero un asesor humano"), false);
  assert.equal(isHumanAssistanceRequest("No quiero IA, quiero un humano"), true);
  assert.equal(isHumanAssistanceRequest("Quiero hablar algo específico"), false);
  assert.equal(isHumanAssistanceRequest("Pásame el número de Pepe"), true);
  assert.equal(isHumanAssistanceRequest("Necesito ayuda de una persona"), true);
  assert.equal(isHumanAssistanceRequest("Quiero atención humana"), true);
  assert.equal(isHumanAssistanceRequest("Quiero una habitación para 1 persona"), false);
  assert.equal(isHumanAssistanceRequest("Prefiero una habitación para dos personas"), false);
});
