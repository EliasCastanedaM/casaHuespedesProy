import test from "node:test";
import assert from "node:assert/strict";
import { BOOKING_ALERT_TEMPLATE_BODY } from "../src/services/booking-alerts.service.js";
import {
  RESERVATION_ADMIN_TEMPLATE_NAME,
  reservationAdminTemplateDefinition,
  processMetaTemplateReview,
} from "../src/services/booking-template-review.service.js";

const job = {
  id: 101,
  template_name: "solicitud_reserva_admin",
  language_code: "es",
  waba_id: "1568903304317286",
  provider_template_id: null,
  attempt_count: 1,
};

function fakeDb(item = job) {
  const writes = [];
  let claimed = false;
  return {
    writes,
    async query(sql, params) {
      if (sql.includes("RETURNING t.id")) {
        if (claimed) return { rows: [] };
        claimed = true;
        return { rows: item ? [item] : [] };
      }
      writes.push({ sql, params });
      return { rows: [] };
    },
  };
}

function mockResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const defaults = { token: "token_de_prueba", phoneNumberId: "1355357567671600", graphVersion: "v26.0" };

test("la plantilla usa ocho variables con ejemplos y categoría de utilidad", () => {
  const payload = reservationAdminTemplateDefinition();
  assert.equal(payload.name, RESERVATION_ADMIN_TEMPLATE_NAME);
  assert.equal(payload.category, "UTILITY");
  assert.equal(payload.allow_category_change, false);
  assert.equal(payload.components[0].text, BOOKING_ALERT_TEMPLATE_BODY);
  assert.equal(payload.components[0].example.body_text[0].length, 8);
});

test("crea una plantilla solo tras comprobar que la WABA contiene el número emisor", async () => {
  const requests = [];
  const db = fakeDb();
  const result = await processMetaTemplateReview(db, {
    ...defaults,
    fetchImpl: async (url, options) => {
      requests.push({ url, method: options.method, body: options.body });
      if (url.includes("/message_templates?")) return mockResponse({ data: [] });
      if (url.includes("/phone_numbers?")) return mockResponse({ data: [{ id: "1355357567671600" }] });
      if (options.method === "POST") return mockResponse({
        id: "258777111", status: "PENDING", category: "UTILITY",
      });
      throw Error("Solicitud no prevista");
    },
  });
  assert.equal(result.status, "submitted");
  assert.equal(requests.filter((x) => x.method === "POST").length, 1);
  assert.equal(JSON.parse(requests.find((x) => x.method === "POST").body).components[0].example.body_text[0].length, 8);
  assert.equal(db.writes[0].params[1], "submitted");
});

test("si Meta ya aprobó la misma plantilla, consulta y no vuelve a crearla", async () => {
  const db = fakeDb({ ...job, provider_template_id: "258777111" });
  let posts = 0;
  const result = await processMetaTemplateReview(db, {
    ...defaults,
    fetchImpl: async (url, options) => {
      if (options.method === "POST") posts += 1;
      return mockResponse({ data: [{
        id: "258777111", name: "solicitud_reserva_admin", language: "es",
        status: "APPROVED", category: "UTILITY",
        components: [{ type: "BODY", text: BOOKING_ALERT_TEMPLATE_BODY }],
      }] });
    },
  });
  assert.equal(result.status, "approved");
  assert.equal(posts, 0);
});

test("una categoría distinta bloquea la plantilla y no autoriza el envío", async () => {
  const db = fakeDb();
  const result = await processMetaTemplateReview(db, {
    ...defaults,
    fetchImpl: async () => mockResponse({ data: [{
      id: "258777111", name: "solicitud_reserva_admin",
      language: "es", status: "APPROVED", category: "MARKETING",
      components: [{ type: "BODY", text: BOOKING_ALERT_TEMPLATE_BODY }],
    }] }),
  });
  assert.equal(result.status, "conflict");
  assert.equal(db.writes[0].params[1], "conflict");
});

test("no crea plantilla si la WABA no tiene el emisor configurado", async () => {
  let postCount = 0;
  const db = fakeDb();
  const result = await processMetaTemplateReview(db, {
    ...defaults,
    fetchImpl: async (url, options) => {
      if (options.method === "POST") postCount += 1;
      if (url.includes("/message_templates?")) return mockResponse({ data: [] });
      return mockResponse({ data: [{ id: "no-es-emisor" }] });
    },
  });
  assert.equal(result.status, "failed");
  assert.equal(postCount, 0);
});

test("si no hay tarea en la cola no contacta con Meta", async () => {
  const db = fakeDb(null);
  const result = await processMetaTemplateReview(db, {
    ...defaults, fetchImpl: async () => { throw Error("No debe llamar a Meta"); },
  });
  assert.deepEqual(result, { processed: false });
});
