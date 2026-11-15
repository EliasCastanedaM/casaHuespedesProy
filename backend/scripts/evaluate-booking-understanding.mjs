import OpenAI from "openai";
import { isDeepStrictEqual } from "node:util";
import { env } from "../src/config/env.js";
import { BOOKING_UNDERSTANDING_PROMPT, BOOKING_UNDERSTANDING_SCHEMA, bookingUnderstandingInput, validateBookingUnderstanding } from "../src/modules/ai/ai.booking-understanding.js";
import { bookingUnderstandingCases } from "../test/fixtures/booking-understanding-cases.js";

if (!env.openai.apiKey) {
  console.error("No se ejecutó la evaluación real: falta OPENAI_API_KEY. Las pruebas con mocks no miden la precisión del modelo.");
  process.exit(2);
}
const limit = Math.min(30, Math.max(1, Number(process.argv[2]) || 30));
const client = new OpenAI({ apiKey: env.openai.apiKey, timeout: 15000, maxRetries: 0 });
let passed = 0;
for (const example of bookingUnderstandingCases.slice(0, limit)) {
  try {
    const response = await client.responses.create({
      model: env.openai.model, instructions: BOOKING_UNDERSTANDING_PROMPT,
      input: bookingUnderstandingInput(example.message, example.intent === "new_request" ? {} : example.state, new Date("2026-11-15T12:00:00Z")),
      text: { format: { type: "json_schema", name: "hotel_booking_understanding", strict: true, schema: BOOKING_UNDERSTANDING_SCHEMA } },
      max_output_tokens: 1800, store: false,
    });
    const result = response.status === "completed" ? validateBookingUnderstanding(response.output_text, example.message, example.intent === "new_request" ? {} : example.state) : null;
    const correct = result && result.intent === example.intent &&
      Object.entries(example.fields).every(([key, value]) => isDeepStrictEqual(result.fields[key], value)) &&
      Object.keys(result.fields).every(key => key in example.fields || key === "total_guests");
    if (correct) passed++;
    console.log(JSON.stringify({ case: example.id, passed: Boolean(correct) }));
  } catch (error) {
    // Never print provider request objects, credentials or arbitrary error bodies.
    console.log(JSON.stringify({ case: example.id, passed: false, error: String(error.code || "provider_error").slice(0, 40) }));
  }
}
console.log(JSON.stringify({ model: env.openai.model, syntheticCases: limit, passed, failed: limit - passed, note: "Resultado del modelo sobre casos sintéticos; no garantiza precisión en toda conversación real." }));
process.exitCode = passed === limit ? 0 : 1;
