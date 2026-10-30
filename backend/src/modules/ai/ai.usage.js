import { createHmac } from "node:crypto";
import { pool } from "../../config/db.js";
import { env } from "../../config/env.js";

// Tarifas estándar de referencia (USD por 1M tokens), 2026-10-30.
// No incluye herramientas externas, impuestos ni ajustes de facturación.
// https://developers.openai.com/api/docs/models/gpt-5.6-luna
const STANDARD_RATES = {
  "gpt-5.6-luna": { input: 0.20, cached: 0.02, output: 1.20 },
};

function tokenCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function parseResponseUsage(response) {
  if (!response?.usage || typeof response.usage !== "object") return null;
  const usage = response.usage;
  const inputTokens = tokenCount(usage.input_tokens);
  const outputTokens = tokenCount(usage.output_tokens);
  return {
    model: String(response.model || "unknown").slice(0, 100),
    responseId: String(response.id || "").slice(0, 128),
    serviceTier: response.service_tier || null,
    inputTokens,
    cachedInputTokens: Math.min(inputTokens, tokenCount(usage.input_tokens_details?.cached_tokens)),
    outputTokens,
    reasoningOutputTokens: Math.min(outputTokens, tokenCount(usage.output_tokens_details?.reasoning_tokens)),
  };
}

export function estimatedStandardCostUsd({ model, inputTokens, cachedInputTokens, outputTokens, serviceTier } = {}) {
  const rates = STANDARD_RATES[model];
  // Los precios para fast/priority/flex y otros modelos no se asumen.
  if (!rates || (serviceTier && !["default", "auto", "standard"].includes(serviceTier))) return null;
  const input = tokenCount(inputTokens);
  const cached = Math.min(input, tokenCount(cachedInputTokens));
  const output = tokenCount(outputTokens);
  const longContext = input > 272_000;
  const inputMultiplier = longContext ? 2 : 1;
  const outputMultiplier = longContext ? 1.5 : 1;
  return Number(((
    (input - cached) * rates.input * inputMultiplier +
    cached * rates.cached * inputMultiplier +
    output * rates.output * outputMultiplier
  ) / 1_000_000).toFixed(10));
}

function conversationTag(channel, externalUserId) {
  // HMAC con secreto privado; jamás se guardan identificadores sin protección.
  if (!env.jwtSecret || !externalUserId) return null;
  return createHmac("sha256", env.jwtSecret)
    .update(String(channel) + ":" + String(externalUserId))
    .digest("hex").slice(0, 24);
}

export async function recordOpenAiUsage(response, { channel = "other", operation = "assistant_response", externalUserId = "" } = {}, db = pool) {
  const metrics = parseResponseUsage(response);
  if (!metrics?.responseId) return false;
  const allowedChannels = ["whatsapp", "instagram", "facebook", "web"];
  const safeChannel = allowedChannels.includes(channel) ? channel : "other";
  const allowedOperations = ["scope_classifier", "assistant_response", "tool_followup"];
  const safeOperation = allowedOperations.includes(operation) ? operation : "assistant_response";
  const estimatedCost = estimatedStandardCostUsd(metrics);
  try {
    await db.query(
      `INSERT INTO public.ai_usage_events
        (response_id, channel, operation, model, conversation_tag, input_tokens,
         cached_input_tokens, output_tokens, reasoning_output_tokens, estimated_cost_usd)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (response_id) DO NOTHING`,
      [
        metrics.responseId, safeChannel, safeOperation, metrics.model,
        conversationTag(safeChannel, externalUserId),
        metrics.inputTokens, metrics.cachedInputTokens,
        metrics.outputTokens, metrics.reasoningOutputTokens, estimatedCost,
      ]
    );
    return true;
  } catch (error) {
    // La telemetría nunca debe impedir una respuesta del asesor.
    // No registrar request/response ni datos del huésped.
    console.warn(JSON.stringify({
      component: "ai_usage",
      event: "write_failed",
      code: String(error?.code || "unknown").slice(0, 40),
    }));
    return false;
  }
}

function normalizedRollup(row) {
  const result = { ...row };
  for (const key of ["requests", "conversations", "unpriced_requests", "input_tokens", "cached_input_tokens", "output_tokens", "reasoning_output_tokens", "estimated_cost_usd"]) {
    if (Object.hasOwn(result, key)) result[key] = Number(result[key] || 0);
  }
  return result;
}

export async function getOpenAiUsageDashboard(days = 7, db = pool) {
  const safeDays = [1, 7, 30].includes(Number(days)) ? Number(days) : 7;
  const filter = "WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')";
  const [breakdown, daily, conversations] = await Promise.all([
    db.query(`SELECT channel, model, operation, COUNT(*)::int AS requests,
      COUNT(DISTINCT conversation_tag)::int AS conversations,
      COUNT(*) FILTER (WHERE estimated_cost_usd IS NULL)::int AS unpriced_requests,
      COALESCE(SUM(input_tokens),0)::bigint AS input_tokens,
      COALESCE(SUM(cached_input_tokens),0)::bigint AS cached_input_tokens,
      COALESCE(SUM(output_tokens),0)::bigint AS output_tokens,
      COALESCE(SUM(reasoning_output_tokens),0)::bigint AS reasoning_output_tokens,
      COALESCE(SUM(estimated_cost_usd),0)::float8 AS estimated_cost_usd
      FROM public.ai_usage_events ${filter}
      GROUP BY channel, model, operation ORDER BY requests DESC`, [safeDays]),
    db.query(`SELECT (created_at AT TIME ZONE 'America/Lima')::date::text AS day,
      channel, COUNT(*)::int AS requests,
      COALESCE(SUM(input_tokens),0)::bigint AS input_tokens,
      COALESCE(SUM(output_tokens),0)::bigint AS output_tokens,
      COALESCE(SUM(estimated_cost_usd),0)::float8 AS estimated_cost_usd
      FROM public.ai_usage_events ${filter}
      GROUP BY day,channel ORDER BY day ASC,channel`, [safeDays]),
    db.query(`SELECT conversation_tag, channel, COUNT(*)::int AS requests,
      COALESCE(SUM(input_tokens),0)::bigint AS input_tokens,
      COALESCE(SUM(output_tokens),0)::bigint AS output_tokens,
      COALESCE(SUM(estimated_cost_usd),0)::float8 AS estimated_cost_usd
      FROM public.ai_usage_events ${filter} AND conversation_tag IS NOT NULL
      GROUP BY conversation_tag,channel ORDER BY estimated_cost_usd DESC LIMIT 10`, [safeDays]),
  ]);
  return {
    days: safeDays,
    periodEndsAt: new Date().toISOString(),
    priceNote: "Estimación USD a tarifa estándar GPT-5.6 Luna; no equivale al cobro de OpenAI. Modelos o tiers sin tarifa conocida no se estiman.",
    breakdown: breakdown.rows.map(normalizedRollup),
    daily: daily.rows.map(normalizedRollup),
    conversations: conversations.rows.map(normalizedRollup),
  };
}
