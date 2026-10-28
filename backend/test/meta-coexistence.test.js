import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCoexistenceEvents,
  persistCoexistenceEvents,
} from "../src/modules/meta/meta.coexistence.js";
import { processMetaMessage } from "../src/modules/meta/meta.service.js";

const envelope = (field, value) => ({
  object: "whatsapp_business_account",
  entry: [{ id: "waba-test", changes: [{ field, value }] }],
});

function echoPayload(id = "wamid.echo1") {
  return envelope("smb_message_echoes", {
    metadata: { phone_number_id: "phone-test" },
    message_echoes: [{
      id, from: "51988888888", to: "51977777777",
      type: "text", text: { body: "Lo revisamos en recepción" },
      timestamp: "1793200000",
    }],
  });
}

function fakeDatabase({ failMessage = false } = {}) {
  const events = new Set();
  const messages = new Set();
  const conversations = new Map();
  const operations = [];
  const db = {
    async connect() {
      return {
        async query(sql, values = []) {
          const cmd = sql.replace(/\s+/g, " ").trim().toLowerCase();
          operations.push(cmd.split(" ").slice(0, 4).join(" "));
          if (cmd === "begin" || cmd === "commit" || cmd === "rollback") {
            return { rows: [] };
          }
          if (cmd.startsWith("insert into meta_coexistence_events")) {
            if (events.has(values[0])) return { rows: [] };
            events.add(values[0]);
            return { rows: [{ event_id: values[0] }] };
          }
          if (cmd.startsWith("insert into meta_conversations")) {
            if (!conversations.has(values[0])) {
              conversations.set(values[0], { handoff_active: false, timestamp: values[1] });
            }
            return { rows: [] };
          }
          if (cmd.startsWith("update meta_conversations")) {
            conversations.get(values[0]).handoff_active = true;
            return { rows: [] };
          }
          if (cmd.startsWith("insert into meta_messages")) {
            if (failMessage) throw new Error("Fallo simulado de Supabase");
            if (messages.has(values[1])) return { rows: [] };
            messages.add(values[1]);
            assert.equal(values[0], "51977777777");
            assert.equal(values[2], "text");
            assert.equal(values[3], "Lo revisamos en recepción");
            return { rows: [{ id: 1 }] };
          }
          throw new Error("SQL inesperado: " + cmd);
        },
        release() { operations.push("release"); },
      };
    },
  };
  return { db, events, messages, conversations, operations };
}

test("reconoce solo campos de coexistencia, sin interpretar mensajes normales", () => {
  assert.deepEqual(parseCoexistenceEvents(envelope("messages", { messages: [] })), []);
  assert.deepEqual(parseCoexistenceEvents({ object: "instagram", entry: [] }), []);
  assert.deepEqual(parseCoexistenceEvents(null), []);
  const [event] = parseCoexistenceEvents(echoPayload());
  assert.equal(event.field, "smb_message_echoes");
  assert.equal(event.echoes[0].externalUserId, "51977777777");
  assert.equal(event.echoes[0].content, "Lo revisamos en recepción");
  assert.equal(event.eventId.length, 64);
});

test("ecos móviles son salientes humanos: no ingresan a la cola del bot", async () => {
  const state = fakeDatabase();
  const result = await persistCoexistenceEvents(echoPayload(), state.db);
  assert.deepEqual(result, { archived: 1, echoes: 1 });
  assert.equal(state.conversations.get("51977777777").handoff_active, true);
  assert.equal(state.messages.has("wamid.echo1"), true);
  assert.ok(state.operations.includes("commit"));
  assert.ok(state.operations.includes("release"));
  const second = await persistCoexistenceEvents(echoPayload(), state.db);
  assert.deepEqual(second, { archived: 0, echoes: 0 });
  assert.equal(state.messages.size, 1);

  // Meta puede entregar el mismo mensaje en un lote con diferente metadata:
  // deduplicar por el ID del mensaje evita reabrir un handoff ya resuelto.
  state.conversations.get("51977777777").handoff_active = false;
  const altered = echoPayload();
  altered.entry[0].changes[0].value.metadata.delivery = "retry";
  assert.deepEqual(await persistCoexistenceEvents(altered, state.db), {
    archived: 1, echoes: 0,
  });
  assert.equal(state.conversations.get("51977777777").handoff_active, false);
});

test("historial y contactos se guardan sin generar mensajes automáticos", async () => {
  const state = fakeDatabase();
  const history = envelope("history", { history: [{ metadata: { phase: 0 }, threads: [] }] });
  const contacts = envelope("smb_app_state_sync", { state_sync: [{ contacts: [] }] });
  assert.deepEqual(await persistCoexistenceEvents(history, state.db), {
    archived: 1, echoes: 0,
  });
  assert.deepEqual(await persistCoexistenceEvents(contacts, state.db), {
    archived: 1, echoes: 0,
  });
  assert.equal(state.events.size, 2);
  assert.equal(state.messages.size, 0);
  assert.equal(state.conversations.size, 0);
});

test("nunca reconoce un eco sin destinatario o ID", async () => {
  const bad = echoPayload();
  delete bad.entry[0].changes[0].value.message_echoes[0].to;
  assert.throws(() => parseCoexistenceEvents(bad), /destinatario válido/);
});

test("falla y solicita reintento de Meta si Supabase no guarda un eco", async () => {
  const state = fakeDatabase({ failMessage: true });
  await assert.rejects(persistCoexistenceEvents(echoPayload(), state.db), /Supabase/);
  assert.ok(state.operations.includes("rollback"));
  assert.ok(!state.operations.includes("commit"));
});

test("reanálisis del handoff evita respuesta si alguien respondió durante OpenAI", async () => {
  let handoffReads = 0;
  let sends = 0;
  let completed = 0;
  const result = await processMetaMessage({
    channel: "whatsapp", externalUserId: "51977777777",
    messageId: "wamid.guest1", text: "¿Precio?", messageType: "text",
  }, {
    claim: async () => true,
    release: async () => {},
    complete: async () => { completed++; },
    getHandoff: async () => ++handoffReads > 1,
    setHandoff: async () => {},
    loadHistory: async () => [],
    isFirstMetaIncomingMessage: async () => false,
    hasPreviouslySentCatalog: async () => false,
    generateReply: async () => ({ mode: "answer", reply: "Respuesta IA" }),
    createOutgoing: async () => { throw new Error("No debe crear respuesta"); },
    sendReply: async () => { sends++; },
    sleep: async () => {},
  });
  assert.equal(result.status, "handoff_active_after_generation");
  assert.equal(sends, 0);
  assert.equal(completed, 1);
  assert.equal(handoffReads, 2);
});
