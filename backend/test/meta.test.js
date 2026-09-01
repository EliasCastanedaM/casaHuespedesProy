import test from "node:test";
import assert from "node:assert/strict";
import { parseMetaWebhook } from "../src/modules/meta/meta.service.js";

test("extrae mensajes de WhatsApp", () => {
  const messages = parseMetaWebhook({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                { id: "wamid.1", from: "51999999999", text: { body: "Hola" } },
              ],
            },
          },
        ],
      },
    ],
  });

  assert.deepEqual(messages, [
    {
      channel: "whatsapp",
      externalUserId: "51999999999",
      messageId: "wamid.1",
      text: "Hola",
    },
  ]);
});

test("extrae mensajes de Instagram e ignora ecos", () => {
  const messages = parseMetaWebhook({
    object: "instagram",
    entry: [
      {
        messaging: [
          { sender: { id: "ig-user" }, message: { mid: "m1", text: "Precio" } },
          {
            sender: { id: "ig-user" },
            message: { mid: "m2", text: "eco", is_echo: true },
          },
        ],
      },
    ],
  });

  assert.equal(messages.length, 1);
  assert.equal(messages[0].channel, "instagram");
  assert.equal(messages[0].text, "Precio");
});
