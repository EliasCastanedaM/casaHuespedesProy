import test from "node:test";
import assert from "node:assert/strict";
import {
  parseResponseUsage,
  estimatedStandardCostUsd,
  recordOpenAiUsage,
  getOpenAiUsageDashboard,
} from "../src/modules/ai/ai.usage.js";

const sample = {
  id: "resp_test_1",
  model: "gpt-5.6-luna",
  usage: {
    input_tokens: 5000,
    input_tokens_details: { cached_tokens: 1000 },
    output_tokens: 250,
    output_tokens_details: { reasoning_tokens: 80 },
  },
};

test("extrae tokens de caché y razonamiento sin sumarlos dos veces", () => {
  assert.deepEqual(parseResponseUsage(sample), {
    responseId: "resp_test_1",
    model: "gpt-5.6-luna",
    serviceTier: null,
    inputTokens: 5000,
    cachedInputTokens: 1000,
    outputTokens: 250,
    reasoningOutputTokens: 80,
  });
  assert.equal(parseResponseUsage({ id: "r", model: "test" }), null);
});

test("costo estándar utiliza entrada sin caché, entrada en caché y salida", () => {
  const metrics = parseResponseUsage(sample);
  // (4000 * 0.20 + 1000 * 0.02 + 250 * 1.20) / 1M
  assert.equal(estimatedStandardCostUsd(metrics), 0.00000112);
  assert.equal(estimatedStandardCostUsd({ ...metrics, serviceTier: "priority" }), null);
  assert.equal(estimatedStandardCostUsd({ ...metrics, model: "unknown-model" }), null);
});

test("la telemetría persiste solo metadatos y no altera el resultado del asesor", async () => {
  const calls = [];
  const fakeDb = { query: async (...args) => { calls.push(args); return { rows: [] }; } };
  assert.equal(await recordOpenAiUsage(sample, {
    channel: "whatsapp", operation: "assistant_response", externalUserId: "telefono-prueba",
  }, fakeDb), true);
  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /ON CONFLICT \(response_id\) DO NOTHING/);
  assert.equal(calls[0][1][0], "resp_test_1");
  assert.equal(calls[0][1][1], "whatsapp");
  assert.equal(calls[0][1][5], 5000);
  assert.equal(calls[0][1][6], 1000);
  assert.equal(calls[0][1][7], 250);
  assert.equal(calls[0][1][8], 80);
  assert.doesNotMatch(JSON.stringify(calls[0]), /telefono-prueba/);
  assert.equal(await recordOpenAiUsage({ id: "r" }, {}, fakeDb), false);
});

test("si falla el guardado de métricas, la conversación no se bloquea", async () => {
  const warning = console.warn;
  console.warn = () => {};
  try {
    const result = await recordOpenAiUsage(sample, {}, {
      query: async () => { throw Object.assign(new Error("failed"), { code: "42P01" }); },
    });
    assert.equal(result, false);
  } finally {
    console.warn = warning;
  }
});

test("el dashboard restringe período y normaliza los agregados", async () => {
  const statements = [];
  const fakeDb = { query: async (sql, args) => {
    statements.push({ sql, args });
    if (sql.includes("GROUP BY channel, model, operation")) {
      return { rows: [{ channel: "whatsapp", model: "gpt-5.6-luna", operation: "scope_classifier",
        requests: 2, conversations: 1, input_tokens: "5000", cached_input_tokens: "100",
        output_tokens: "60", reasoning_output_tokens: "20", estimated_cost_usd: 0.001 }] };
    }
    return { rows: [] };
  }};
  const report = await getOpenAiUsageDashboard(500, fakeDb);
  assert.equal(report.days, 7);
  assert.equal(report.breakdown[0].input_tokens, 5000);
  assert.equal(report.breakdown[0].cached_input_tokens, 100);
  assert.equal(report.breakdown[0].requests, 2);
  assert.equal(statements.length, 3);
  assert.ok(statements.every((statement) => statement.args[0] === 7));
});
