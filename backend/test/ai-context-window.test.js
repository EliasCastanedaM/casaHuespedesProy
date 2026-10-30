import test from "node:test";
import assert from "node:assert/strict";
import {
  responseInput, shouldReuseOpenAiResponseId,
} from "../src/modules/ai/ai.context-window.js";
import { setHandoffState } from "../src/modules/meta/meta.service.js";

test("WhatsApp corta cadena remota para evitar crecer sin límite", () => {
  assert.equal(shouldReuseOpenAiResponseId("whatsapp", "resp_old"), false);
  assert.equal(shouldReuseOpenAiResponseId("instagram", "resp_old"), true);
  assert.equal(shouldReuseOpenAiResponseId("facebook", null), false);
});

test("la ventana conserva solo mensajes recientes sin repetir el actual", () => {
  const history = [
    { author: "client", content: "fecha antigua de llegada 8/12" },
    { author: "assistant", content: "cotización anterior" },
    { author: "client", content: "nuevo mensaje" },
  ];
  const input = responseInput(history, "nuevo mensaje", {
    maxHistoryMessages: 3,
    maxHistoryCharacters: 18,
  });
  assert.deepEqual(input, [
    { role: "assistant", content: "cotización anterior" },
    { role: "user", content: "nuevo mensaje" },
  ]);
});

test("ningún historial puede truncar el mensaje actual", () => {
  const history = [{ author: "client", content: "X".repeat(5000) }];
  const current = "Consulta del huésped con los datos de la reserva";
  const result = responseInput(history, current, {
    maxHistoryCharacters: 20, maxHistoryMessages: 8,
  });
  assert.deepEqual(result, [{ role: "user", content: current }]);
});

test("liberar la atención humana reactiva solo borradores pendientes", async () => {
  const statements = [];
  const db = {
    query: async (sql, params) => {
      statements.push({ sql, params });
      return { rows: [{ channel: "whatsapp", external_user_id: "test", handoff_active: false }] };
    },
  };
  const result = await setHandoffState("whatsapp", "test", false, db);
  assert.equal(result.handoff_active, false);
  assert.equal(statements.length, 2);
  assert.match(statements[1].sql, /booking_context->'whatsapp_mvp'->>'state' = 'handoff'/);
  assert.match(statements[1].sql, /NOT .*staff_confirmation/);
  assert.equal(statements[1].params[0], "whatsapp");
  assert.equal(statements[1].params[1], "test");
});

test("activar handoff no debe desbloquear borradores", async () => {
  const statements = [];
  const db = { query: async (sql) => {
    statements.push(sql);
    return { rows: [{ handoff_active: true }] };
  } };
  await setHandoffState("whatsapp", "test", true, db);
  assert.equal(statements.length, 1);
});
