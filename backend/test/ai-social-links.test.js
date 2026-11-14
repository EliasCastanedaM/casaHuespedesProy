import test from "node:test";
import assert from "node:assert/strict";
import OpenAI from "openai";
import { pool } from "../src/config/db.js";
import {
  isHotelSocialMediaInquiry,
  globalAssistantSocialLinks,
} from "../src/modules/ai/ai.guest-rules.js";
import { formatRoomDetailsReply } from "../src/modules/ai/ai.category-info.js";
import { generateAiReply } from "../src/modules/ai/ai.service.js";

test("reconoce preguntas explícitas sobre fotos, videos y redes del hotel", () => {
  const positive = [
    "¿Tienen fotos de las habitaciones?",
    "¿Me compartes su Instagram?",
    "¿Tienen un sitio web?",
    "¿Puedo ver videos de las instalaciones?",
    "¿Cuál es su Facebook?",
  ];
  for (const query of positive) assert.equal(isHotelSocialMediaInquiry(query), true, query);

  const negative = [
    "¿Tienen fotos de los museos?",
    "¿Tienen fotos de los restaurantes?",
    "¿Cómo crear una cuenta de Instagram?",
    "Redacta un ensayo sobre Instagram",
    "Quiero reservar una habitación",
  ];
  for (const query of negative) assert.equal(isHotelSocialMediaInquiry(query), false, query);
});

test("las consultas de fotos son deterministas, no consultan base y no reinician reservas", async t => {
  t.mock.method(OpenAI.Responses.prototype, "create", async () => {
    throw new Error("No se debe llamar OpenAI para enlaces oficiales");
  });
  t.mock.method(pool, "query", async () => {
    throw new Error("La consulta de fotos no debe consultar ni modificar la base de reservas");
  });

  for (const channel of ["whatsapp", "facebook", "instagram"]) {
    const result = await generateAiReply({
      channel, externalUserId: "media-test-" + channel,
      message: "¿Dónde veo fotos de las habitaciones?",
    });
    assert.equal(result.mode, "category_details");
    assert.equal(result.deterministic, true);
    assert.equal(result.reply, formatRoomDetailsReply());
  }
});

