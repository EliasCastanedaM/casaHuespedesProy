import test from "node:test";
import assert from "node:assert/strict";
import {
  getConversationDashboard,
  listConversations,
  setConversationResolved,
} from "../src/modules/meta/meta.service.js";

test("el dashboard cuenta todas las plataformas y no depende del límite de la lista", async () => {
  const calls = [];
  const db = { query: async (sql) => {
    calls.push(sql);
    return { rows: [
      { channel: "instagram", total: 7, ai: 6, manual: 1, resolved: 0, unanswered: 0 },
      { channel: "facebook", total: 4, ai: 4, manual: 0, resolved: 0, unanswered: 1 },
    ] };
  } };
  const data = await getConversationDashboard(db);
  assert.equal(data.total, 11);
  assert.equal(data.ai, 10);
  assert.equal(data.manual, 1);
  assert.equal(data.unanswered, 1);
  assert.equal(data.channels.whatsapp.total, 0);
  assert.match(calls[0], /GROUP BY c\.channel/);
});

test("la lista usa filtros parametrizados y paginación", async () => {
  let input;
  const db = { query: async (sql, params) => {
    input = { sql, params };
    return { rows: [{ channel: "instagram", external_user_id: "one" }] };
  } };
  const data = await listConversations(db, {
    channel: "instagram", status: "manual", search: "persona", limit: 25, offset: 50,
  });
  assert.equal(data.length, 1);
  assert.deepEqual(input.params, ["instagram", "persona", "manual", 25, 50]);
  assert.match(input.sql, /LIMIT \$4 OFFSET \$5/);
});

test("la lista limita tamaños de página y evita filtros arbitrarios", async () => {
  let params;
  await listConversations({ query: async (_sql, p) => { params = p; return { rows: [] }; } }, {
    channel: "fuera", status: "desconocido", search: "x".repeat(180), limit: 999,
    offset: -2,
  });
  assert.equal(params[0], null);
  assert.equal(params[2], "all");
  assert.equal(params[1].length, 100);
  assert.equal(params[3], 100);
  assert.equal(params[4], 0);
});

test("marcar resuelta guarda estado sin modificar el modo de atención", async () => {
  let captured;
  const result = await setConversationResolved("instagram", "guest-5", true, {
    query: async (sql, args) => {
      captured = { sql, args };
      return { rows: [{ channel: "instagram", external_user_id: "guest-5", resolved_at: "2026-10-19" }] };
    },
  });
  assert.equal(result.external_user_id, "guest-5");
  assert.deepEqual(captured.args, ["instagram", "guest-5", true]);
  assert.match(captured.sql, /SET resolved_at/);
  assert.doesNotMatch(captured.sql, /SET handoff_active/);
});
