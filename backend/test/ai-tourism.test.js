import test from "node:test";
import assert from "node:assert/strict";
import OpenAI from "openai";
import { pool } from "../src/config/db.js";
import {
  TOURISM_PLACES, isTourismInquiry, formatTourismReply, tourismMapsUrl,
} from "../src/modules/ai/ai.tourism.js";
import { generateAiReply } from "../src/modules/ai/ai.service.js";

test("los lugares turísticos tienen fuente, dirección y un ID único; sin precios", () => {
  assert.ok(TOURISM_PLACES.length >= 20);
  assert.equal(new Set(TOURISM_PLACES.map((p) => p.id)).size, TOURISM_PLACES.length);
  for (const place of TOURISM_PLACES) {
    assert.ok(place.name.length >= 5);
    assert.ok(place.address.length >= 10, place.name);
    assert.match(place.source, /^https:\/\//);
    assert.ok(["dining", "coast", "city", "museum", "nature"].includes(place.kind));
    assert.equal("price" in place, false);
    assert.equal("menu" in place, false);
    assert.equal("hours" in place, false);
  }
});

test("responde restaurantes próximos a Pimentel por nombre y ubicación sin promoción", () => {
  const reply = formatTourismReply("¿Hay restaurantes cerca de Pimentel?");
  assert.match(reply, /Picantería La Tintorera/);
  assert.match(reply, /Manuel Seoane 733/);
  assert.match(reply, /Bertika/);
  assert.match(reply, /Lima 200/);
  assert.match(reply, /La Tienda del Pato/);
  assert.doesNotMatch(reply, /S\/\s*\d|precio por persona|promoci[oó]n|reserva tu mesa|aprovecha/i);
});

test("responde direcciones puntuales y marca la ubicación no confirmada", () => {
  assert.match(formatTourismReply("¿Dónde está Bertika's?"), /Calle Lima 200/);
  assert.match(formatTourismReply("¿Dónde está La Tintorera?"), /Manuel Seoane 733/);
  assert.match(formatTourismReply("¿Dónde está La Tienda del Pato?"), /numeraci[oó]n por confirmar/i);
  assert.match(formatTourismReply("¿Dónde queda el Museo Tumbas Reales de Sipán?"), /Vizcardo y Guzmán 895/);
});

test("distingue Pimentel de los museos y reservas naturales más alejados", () => {
  const museums = formatTourismReply("¿Qué museos hay cerca de Pimentel?");
  assert.match(museums, /Museo Tumbas Reales de Sipán/);
  assert.match(museums, /fuera de Pimentel/);
  const nature = formatTourismReply("¿Qué lugares de naturaleza podemos visitar?");
  assert.match(nature, /Bosque de Pómac/);
  assert.match(nature, /Chaparrí/);
  assert.match(nature, /requieren desplazamiento/);
});

test("consulta general sobre Pimentel prioriza solo lugares del propio distrito", () => {
  const reply = formatTourismReply("¿Qué hacer en Pimentel?");
  assert.match(reply, /Muelle de Pimentel/);
  assert.match(reply, /Playa de Pimentel/);
  assert.doesNotMatch(reply, /Museo Tumbas Reales de Sipán/);
});

test("mantiene el catálogo de restaurantes para una ampliación", () => {
  const reply = formatTourismReply("¿Hay otros restaurantes en Pimentel?");
  assert.match(reply, /Mintha Café Pimentel|El Muelle Café/);
  assert.doesNotMatch(reply, /La Tintorera/);
});

test("una pregunta de turismo no se confunde con una consulta externa ni reservas", () => {
  for (const text of [
    "Dame una receta de ceviche", "Redacta una tesis sobre museos",
    "Quiero una habitación con vista al muelle",
    "Necesito cambiar las fechas de mi reserva en Pimentel",
    "¿Tienen restaurante en el hotel?",
    "Ayúdame con la programación de un restaurante",
  ]) {
    assert.equal(isTourismInquiry(text), false, text);
  }
  assert.equal(formatTourismReply("¿Cómo llegar al hospedaje?"), null);
  assert.equal(formatTourismReply("¿Qué museos visitar en Lambayeque?") !== null, true);
});

test("las consultas turísticas son deterministas en WhatsApp, Facebook e Instagram", async (t) => {
  t.mock.method(OpenAI.Responses.prototype, "create", async () => {
    throw new Error("No se debe llamar OpenAI para lugares del catálogo");
  });
  t.mock.method(pool, "query", async () => {
    throw new Error("Una consulta turística no debe alterar el contexto de reserva");
  });
  const requested = "¿Dónde puedo comer en Pimentel?";
  const replies = [];
  for (const channel of ["whatsapp", "facebook", "instagram"]) {
    const result = await generateAiReply({
      channel, externalUserId: "tourism-test-"+channel, message: requested,
    });
    assert.equal(result.mode, "nearby_tourist_information");
    assert.equal(result.deterministic, true);
    replies.push(result.reply);
  }
  assert.equal(new Set(replies).size, 1);
});

test("respeta inglés en respuestas y no inventa horarios o tiempos", () => {
  const reply = formatTourismReply("Are there restaurants near Pimentel?");
  assert.match(reply, /restaurants and caf[eé]s in Pimentel/i);
  assert.match(reply, /Location|hours|Opening hours/i);
  assert.doesNotMatch(reply, /10 min|walking distance|open now|best restaurant/i);
});

test("cada recomendación guardada lleva dirección y enlace de ubicación",()=>{
  for(const place of TOURISM_PLACES) {
    const url=new URL(tourismMapsUrl(place));
    assert.equal(url.origin,"https://www.google.com");
    assert.equal(url.pathname,"/maps/search/");
    assert.equal(url.searchParams.get("api"),"1");
    assert.ok(url.searchParams.get("query").length>5,place.name);
    const reply=formatTourismReply(place.name);
    assert.ok(reply.includes(place.address),place.name);
    assert.ok(reply.includes(tourismMapsUrl(place)),place.name);
  }
});
test("las listas y ampliaciones mantienen una ubicación por lugar",()=>{
  for(const question of ["¿Hay restaurantes cerca de Pimentel?","¿Hay otros restaurantes en Pimentel?",
    "¿Qué museos visitar?","¿Qué otros museos visitar?","¿Qué hacer en Pimentel?",
    "¿Qué lugares de naturaleza podemos visitar?","Paseos en Chiclayo"]) {
    const reply=formatTourismReply(question);
    const count=reply.split("\n").filter(line=>line.startsWith("- ")).length;
    assert.ok(count>0);
    assert.equal((reply.match(/https:\/\/www\.google\.com\/maps\/search\//g)||[]).length,count);
    assert.equal((reply.match(/📍 Ubicación:/g)||[]).length,count);
    assert.ok(reply.length<2000,question);
  }
});
test("no convierte una dirección pendiente en una dirección exacta",()=>{
  const reply=formatTourismReply("¿Dónde está La Tienda del Pato?");
  assert.match(reply,/numeración por confirmar/);
  const query=new URL(tourismMapsUrl(TOURISM_PLACES.find(p=>p.id==="tienda-pato"))).searchParams.get("query");
  assert.match(query,/La Tienda del Pato.*Pimentel/);
  assert.doesNotMatch(query,/por confirmar/);
});
