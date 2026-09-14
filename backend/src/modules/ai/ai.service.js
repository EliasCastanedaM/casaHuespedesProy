import OpenAI from "openai";
import { env } from "../../config/env.js";
import { pool } from "../../config/db.js";
import {
  listRoomsForAvailabilityService,
  searchAvailableRoomsService,
} from "../availability/availability.service.js";
import { buildHotelAssistantPrompt } from "./ai.prompt.js";

const memoryResponses = new Map();
let client;
let warnedMissingConversationTable = false;

const tools = [
  {
    type: "function",
    name: "consultar_disponibilidad",
    description:
      "Busca todas las habitaciones realmente disponibles para fechas y huéspedes concretos.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        check_in: {
          type: "string",
          description: "Fecha de entrada en formato AAAA-MM-DD.",
        },
        check_out: {
          type: "string",
          description: "Fecha de salida en formato AAAA-MM-DD.",
        },
        guests_count: {
          type: "integer",
          minimum: 1,
          maximum: 30,
          description: "Cantidad total de huéspedes.",
        },
      },
      required: ["check_in", "check_out", "guests_count"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "listar_habitaciones",
    description:
      "Lista las habitaciones activas, sus precios, capacidad y características.",
    strict: true,
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
];

function conversationKey(channel, externalUserId) {
  return `${channel}:${externalUserId}`;
}

function getClient() {
  if (!env.openai.apiKey) {
    const error = new Error(
      "El asesor todavía no está configurado. Falta OPENAI_API_KEY."
    );
    error.statusCode = 503;
    throw error;
  }

  client ??= new OpenAI({ apiKey: env.openai.apiKey });
  return client;
}

async function getPreviousResponseId(channel, externalUserId) {
  const key = conversationKey(channel, externalUserId);

  try {
    const result = await pool.query(
      `
      SELECT last_response_id
      FROM ai_conversations
      WHERE channel = $1 AND external_user_id = $2
      LIMIT 1;
      `,
      [channel, externalUserId]
    );
    return result.rows[0]?.last_response_id || memoryResponses.get(key) || null;
  } catch (error) {
    if (!warnedMissingConversationTable) {
      console.warn(
        "No se pudo usar ai_conversations; se utilizará memoria temporal:",
        error.message
      );
      warnedMissingConversationTable = true;
    }
    return memoryResponses.get(key) || null;
  }
}

async function savePreviousResponseId(channel, externalUserId, responseId) {
  const key = conversationKey(channel, externalUserId);
  memoryResponses.set(key, responseId);

  try {
    await pool.query(
      `
      INSERT INTO ai_conversations (
        channel,
        external_user_id,
        last_response_id,
        updated_at
      )
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (channel, external_user_id)
      DO UPDATE SET
        last_response_id = EXCLUDED.last_response_id,
        updated_at = CURRENT_TIMESTAMP;
      `,
      [channel, externalUserId, responseId]
    );
  } catch {
    // La memoria permite probar el agente antes de ejecutar la migración SQL.
  }
}

function publicRoom(room) {
  return {
    id: room.id,
    name: room.name,
    room_number: room.room_number,
    room_type: room.room_type,
    description: room.description,
    capacity: Number(room.capacity),
    price_per_night: Number(room.price_per_night),
    floor_label: room.floor_label,
    amenities: Array.isArray(room.amenities) ? room.amenities : [],
    main_image_url: room.main_image_url,
  };
}

async function executeTool(call) {
  try {
    const args = JSON.parse(call.arguments || "{}");

    if (call.name === "consultar_disponibilidad") {
      const result = await searchAvailableRoomsService({
        check_in: args.check_in,
        check_out: args.check_out,
        guests_count: args.guests_count,
      });

      return JSON.stringify({
        success: true,
        check_in: result.check_in,
        check_out: result.check_out,
        nights: result.nights,
        available_count: result.available_count,
        rooms: result.rooms.map(publicRoom),
        reservation_created: false,
      });
    }

    if (call.name === "listar_habitaciones") {
      const rooms = await listRoomsForAvailabilityService();
      return JSON.stringify({
        success: true,
        rooms: rooms
          .filter((room) => room.status === "active")
          .map(publicRoom),
      });
    }

    return JSON.stringify({ success: false, error: "Función no reconocida." });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.message || "No se pudo ejecutar la consulta.",
    });
  }
}

function responseInput(history, message) {
  const recent = Array.isArray(history) ? history : [];
  const input = recent
    .filter((item) => typeof item?.content === "string" && item.content.trim())
    .map((item) => ({
      role: item.author === "client" ? "user" : "assistant",
      content: item.content.trim(),
    }));

  input.push({ role: "user", content: message });
  return input;
}

async function createFirstResponse(
  openai,
  { message, previousResponseId, history }
) {
  const request = {
    model: env.openai.model,
    instructions: buildHotelAssistantPrompt(),
    input: responseInput(history, message),
    tools,
    parallel_tool_calls: false,
    max_output_tokens: env.ai.maxOutputTokens,
    store: true,
  };

  if (!previousResponseId) return openai.responses.create(request);

  try {
    return await openai.responses.create({
      ...request,
      previous_response_id: previousResponseId,
    });
  } catch {
    // El historial explícito conserva el tramo manual si OpenAI perdió el id previo.
    return openai.responses.create(request);
  }
}

export async function generateAiReply({
  channel,
  externalUserId,
  message,
  history = [],
}) {
  const openai = getClient();
  const previousResponseId = await getPreviousResponseId(
    channel,
    externalUserId
  );

  let response = await createFirstResponse(openai, {
    message,
    previousResponseId,
    history,
  });

  for (let round = 0; round < 4; round += 1) {
    const calls = response.output.filter(
      (item) => item.type === "function_call"
    );
    if (calls.length === 0) break;

    const toolOutputs = await Promise.all(
      calls.map(async (call) => ({
        type: "function_call_output",
        call_id: call.call_id,
        output: await executeTool(call),
      }))
    );

    response = await openai.responses.create({
      model: env.openai.model,
      instructions: buildHotelAssistantPrompt(),
      previous_response_id: response.id,
      input: toolOutputs,
      tools,
      parallel_tool_calls: false,
      max_output_tokens: env.ai.maxOutputTokens,
      store: true,
    });
  }

  await savePreviousResponseId(channel, externalUserId, response.id);

  const reply = response.output_text?.trim();
  if (!reply) {
    const error = new Error(
      "El asesor no pudo generar una respuesta. Inténtalo nuevamente."
    );
    error.statusCode = 502;
    throw error;
  }

  return { reply, responseId: response.id };
}
