import OpenAI from "openai";
import { isDeepStrictEqual } from "node:util";
import { env } from "../src/config/env.js";
import { BOOKING_UNDERSTANDING_PROMPT, BOOKING_UNDERSTANDING_SCHEMA, bookingUnderstandingInput, validateBookingUnderstanding } from "../src/modules/ai/ai.booking-understanding.js";
import { shouldUnderstandBooking } from "../src/modules/ai/ai.booking-understanding.js";
import { handleGlobalReservationTurn, reservationContextForMessage } from "../src/modules/ai/ai.reservation.js";
import { bookingUnderstandingCases } from "../test/fixtures/booking-understanding-cases.js";
import { bookingUnderstandingHoldout, bookingUnderstandingConversations } from "../test/fixtures/booking-understanding-holdout.js";

const args = process.argv.slice(2);
const split = args.includes("--split") ? args[args.indexOf("--split") + 1] : "holdout";
const sets = { development: bookingUnderstandingCases, holdout: bookingUnderstandingHoldout, conversations: bookingUnderstandingConversations,
  all: [...bookingUnderstandingCases, ...bookingUnderstandingHoldout, ...bookingUnderstandingConversations] };
if (!sets[split]) { console.error("Usa --split development|holdout|conversations|all."); process.exit(2); }
if (!env.openai.apiKey) {
  console.error("No se ejecutó la evaluación real: falta OPENAI_API_KEY. Las pruebas con mocks no miden la precisión del modelo.");
  process.exit(2);
}
const requested = Number(args.find(value => /^\d+$/.test(value)));
const examples = sets[split].slice(0, Math.min(50, Math.max(1, requested || sets[split].length)));
const client = new OpenAI({ apiKey: env.openai.apiKey, timeout: 15000, maxRetries: 0 });
const now = new Date("2026-11-15T12:00:00Z");
let passed = 0, calls = 0;
async function interpret(message, state) {
    calls++;
    const response = await client.responses.create({
      model: env.openai.model, instructions: BOOKING_UNDERSTANDING_PROMPT,
      input: bookingUnderstandingInput(message, state, now),
      text: { format: { type: "json_schema", name: "hotel_booking_understanding", strict: true, schema: BOOKING_UNDERSTANDING_SCHEMA } },
      max_output_tokens: 1800, store: false,
    });
    return response.status === "completed" ? validateBookingUnderstanding(response.output_text, message, state) : null;
}
function matches(example, result) {
    return Boolean(result && (example.intents || [example.intent]).includes(result.intent) &&
      (!example.language || result.language === example.language) &&
      isDeepStrictEqual(result.proposal || null, example.proposal || null) &&
      Object.entries(example.fields).every(([key, value]) => equalField(key, result.fields[key], value)) &&
      Object.keys(result.fields).every(key => key in example.fields || key === "total_guests"));
}
function equalField(key, actual, expected) {
  // Ages are a multiset; swapping the order of siblings is not a pricing error.
  if (key === "child_ages" && Array.isArray(actual) && Array.isArray(expected))
    return isDeepStrictEqual([...actual].sort((a, b) => a - b), [...expected].sort((a, b) => a - b));
  return isDeepStrictEqual(actual, expected);
}
for (const example of examples) {
  try {
    let correct;
    if (example.turns) {
      let context = example.initial ? { whatsapp_mvp: example.initial } : {};
      correct = true;
      for (const step of example.turns) {
        const state = reservationContextForMessage(step.message, context).whatsapp_mvp;
        const understanding = shouldUnderstandBooking(step.message, state, true) ? await interpret(step.message, state) : null;
        if (step.intent && !matches(step, understanding)) { correct = false; break; }
        const result = handleGlobalReservationTurn({ message: step.message, context, understanding, now });
        context = result.context;
        const actual = context.whatsapp_mvp || {};
        if (!Object.entries(step.expected || {}).every(([key, value]) => equalField(key, actual[key], value)) ||
            !(step.absent || []).every(key => actual[key] === undefined)) { correct = false; break; }
      }
    } else {
      const state = reservationContextForMessage(example.message, { whatsapp_mvp: example.state }).whatsapp_mvp;
      correct = matches(example, await interpret(example.message, state));
    }
    if (correct) passed++;
    console.log(JSON.stringify({ case: example.id, passed: Boolean(correct) }));
  } catch (error) {
    // Never print provider request objects, credentials or arbitrary error bodies.
    console.log(JSON.stringify({ case: example.id, passed: false, error: String(error.code || "provider_error").slice(0, 40) }));
  }
}
console.log(JSON.stringify({ model: env.openai.model, split, syntheticCases: examples.length, providerCalls: calls, passed, failed: examples.length - passed,
  note: "Modelo real sobre datos sintéticos. Conversaciones evalúa interpretación y borrador; no ejecuta inventario, reservas ni pagos. Requiere revisión humana y no garantiza precisión general." }));
process.exitCode = passed === examples.length ? 0 : 1;
