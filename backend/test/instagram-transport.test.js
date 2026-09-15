import test from "node:test";
import assert from "node:assert/strict";
import {
  INSTAGRAM_MESSAGE_LIMIT,
  sendInstagramMessageParts,
  splitInstagramMessage,
} from "../src/modules/meta/instagram.transport.js";

test("Instagram conserva en una parte un texto menor a 1000 caracteres", () => {
  const text = "Respuesta breve para Instagram.";
  assert.deepEqual(splitInstagramMessage(text), [text]);
});

test("Instagram conserva en una parte un texto de exactamente 1000 caracteres", () => {
  const text = "a".repeat(INSTAGRAM_MESSAGE_LIMIT);
  assert.deepEqual(splitInstagramMessage(text), [text]);
});

test("Instagram divide un texto mayor a 1000 sin cortar una palabra evitable", () => {
  const text = `${"a".repeat(990)} palabra-final ${"b".repeat(30)}`;
  const parts = splitInstagramMessage(text);
  assert.equal(parts.length, 2);
  assert.ok(parts.every((part) => part.length <= INSTAGRAM_MESSAGE_LIMIT));
  assert.equal(parts.join(""), text);
  assert.match(parts[0], / $/);
  assert.match(parts[1], /^palabra-final/);
});

test("Instagram divide textos largos en varias partes y conserva orden y contenido", async () => {
  const text = Array.from(
    { length: 90 },
    (_, index) => `Oración ${index + 1} con información de la habitación.\n`
  ).join("");
  const parts = splitInstagramMessage(text);
  const sent = [];
  await sendInstagramMessageParts(text, async (part) => {
    sent.push(part);
    return { message_id: `ig-${sent.length}` };
  });

  assert.ok(parts.length >= 4);
  assert.ok(parts.every((part) => part.length <= INSTAGRAM_MESSAGE_LIMIT));
  assert.deepEqual(sent, parts);
  assert.equal(sent.join(""), text);
});

test("Instagram detiene el orden cuando falla una parte y propaga el error", async () => {
  const text = `${"a".repeat(1000)}${"b".repeat(1000)}${"c".repeat(100)}`;
  const attempts = [];
  await assert.rejects(
    sendInstagramMessageParts(text, async (part) => {
      attempts.push(part);
      if (attempts.length === 2) throw new Error("falló parte 2");
      return {};
    }),
    /falló parte 2/
  );
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0], "a".repeat(1000));
  assert.equal(attempts[1], "b".repeat(1000));
});
