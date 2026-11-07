import test from "node:test";
import assert from "node:assert/strict";
import {
  BOOKING_ALERT_TEMPLATE_BODY,
  buildBookingAlertPayload,
  formatBookingAlertParameters,
  sendBookingAlert,
  deliverPendingBookingAlerts,
  buildPilotBookingAlertPayload,
} from "../src/services/booking-alerts.service.js";

const accepted = {
  id: 14,
  attempts: 1,
  channel: "whatsapp",
  external_user_id: "51987654321",
  customer_name: "Cliente de prueba",
  payload: {
    check_in: "2026-11-20",
    check_out: "2026-11-22",
    adults: 2,
    children: 0,
    pets: 0,
    category_name: "Matrimonial Ejecutiva",
    preferences: "vista al mar",
    total_amount: 280,
  },
};

test("la plantilla de utilidad exige exactamente ocho variables", () => {
  assert.deepEqual([...BOOKING_ALERT_TEMPLATE_BODY.matchAll(/\{\{\d+\}\}/g)].map(x => x[0]),
    Array.from({ length: 8 }, (_, i) => "{{" + (i + 1) + "}}"));
  const result = formatBookingAlertParameters(accepted);
  assert.equal(result.length, 8);
  assert.deepEqual(result, [
    "WhatsApp", "Cliente de prueba", "+51987654321",
    "20/11/2026 al 22/11/2026", "2 adulto(s), 0 niño(s)",
    "Matrimonial Ejecutiva", "vista al mar", "S/ 280.00",
  ]);
});

test("Facebook e Instagram no suponen que el identificador privado sea el teléfono del huésped", () => {
  for (const channel of ["facebook", "instagram"]) {
    const result = formatBookingAlertParameters({
      ...accepted, channel, external_user_id: "123456789",
      payload: { ...accepted.payload, customer_phone: null },
    });
    assert.match(result[2], /Sin número/);
    assert.equal(result[0].toLowerCase(), channel);
  }
  const fbWithPhone = formatBookingAlertParameters({
    ...accepted, channel: "facebook", payload: { ...accepted.payload, customer_phone: "+51912345678" },
  });
  assert.equal(fbWithPhone[2], "+51912345678");
});

test("respeta las preferencias solicitadas sobre un fallback ofrecido", () => {
  const params = formatBookingAlertParameters({
    ...accepted, payload: { ...accepted.payload, preferences: "vista interior",
      requested_preferences: { view: "sea", near_window: true } },
  });
  assert.equal(params[6], "vista al mar; cerca de una ventana");
});

test("la solicitud WhatsApp usa la plantilla aprobada y solo el destinatario configurado", () => {
  const payload = buildBookingAlertPayload(accepted, {
    to: "+51 938 345 478", templateName: "solicitud_reserva_admin",
  });
  assert.equal(payload.to, "51938345478");
  assert.equal(payload.type, "template");
  assert.equal(payload.template.components[0].parameters.length, 8);
  assert.equal(payload.template.language.code, "es");
  assert.throws(() => buildBookingAlertPayload(accepted, {
    to: "+51 123", templateName: "solicitud_reserva_admin",
  }));
});

test("envío simulado a Meta: recibe un ID sin hacer una llamada externa", async () => {
  let request;
  const sent = await sendBookingAlert(accepted, {
    to: "51938345478",
    templateName: "solicitud_reserva_admin",
    accessToken: "TOKEN_DE_PRUEBA",
    phoneNumberId: "123456",
    graphVersion: "v26.0",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, status: 200, json: async () => ({ messages: [{ id: "wamid.mock" }] }) };
    },
  });
  assert.equal(sent.messageId, "wamid.mock");
  assert.match(request.url, /123456\/messages$/);
  assert.equal(JSON.parse(request.options.body).to, "51938345478");
});

test("si Meta rechaza la plantilla no se registra el envío como aceptado", async () => {
  await assert.rejects(
    () => sendBookingAlert(accepted, {
      to: "51938345478",
      templateName: "solicitud_reserva_admin",
      accessToken: "TOKEN_DE_PRUEBA",
      phoneNumberId: "123456",
      fetchImpl: async () => ({
        ok: false, status: 400,
        json: async () => ({ error: { code: 132001 } }),
      }),
    }),
    /132001/
  );
});

test("la recuperación consume una alerta y borra los datos personales tras el envío", async () => {
  const queries = [];
  let available = true;
  const db = { async query(sql, params) {
    queries.push({ sql, params });
    if (sql.includes("RETURNING o.id")) {
      if (!available) return { rows: [] };
      available = false;
      return { rows: [{ ...accepted }] };
    }
    if (sql.includes("SELECT customer_name")) return { rows: [{ customer_name: "Cliente de prueba" }] };
    return { rows: [] };
  }};
  const result = await deliverPendingBookingAlerts(db, {
    force: true,
    send: async () => ({ messageId: "wamid.mock" }),
  });
  assert.deepEqual(result, { attempted: 1, sent: 1, failed: 0 });
  assert.ok(queries.some(item => item.sql.includes("payload = '{}'::jsonb")));
});

test("el texto de piloto se etiqueta como prueba y no como reserva real", () => {
  const payload = buildPilotBookingAlertPayload(accepted, { to: "51938345478" });
  assert.equal(payload.type, "text");
  assert.match(payload.text.body, /NO ES UNA RESERVA REAL/);
});

test("solo envía texto de sesión al mismo usuario con mensaje reciente", async () => {
  const posted = [];
  const userAlert = { ...accepted, external_user_id: "51938345478" };
  const sent = await sendBookingAlert(userAlert, {
    mode: "session_text", to: "51938345478", pilotSource: "51938345478",
    db: { query: async () => ({ rows: [{ allowed: true }] }) },
    accessToken: "token_test", phoneNumberId: "123456", graphVersion: "v26.0",
    fetchImpl: async (url, options) => {
      posted.push(JSON.parse(options.body));
      return { ok: true, status: 200, json: async () => ({ messages: [{ id: "wamid.demo" }] }) };
    },
  });
  assert.equal(sent.messageId, "wamid.demo");
  assert.equal(posted[0].to, "51938345478");
  assert.equal(posted[0].type, "text");
  await assert.rejects(() => sendBookingAlert(userAlert, {
    mode: "session_text", to: "51943030098", pilotSource: "51938345478",
    accessToken: "token_test", phoneNumberId: "123456",
  }), /restringido/);
  await assert.rejects(() => sendBookingAlert(userAlert, {
    mode: "session_text", to: "51938345478", pilotSource: "51938345478",
    db: { query: async () => ({ rows: [{ allowed: false }] }) },
    accessToken: "token_test", phoneNumberId: "123456",
  }), /ventana WhatsApp vigente/);
});

test("piloto de plantilla filtra únicamente por el prefijo de prueba", async () => {
  const requests = [];
  const db = {
    async query(sql, params = []) {
      requests.push({ sql, params });
      if (sql.includes("RETURNING o.id")) return { rows: [] };
      return { rows: [] };
    },
  };
  const result = await deliverPendingBookingAlerts(db, {
    force: true, testKeyPrefix: "qa-template-20261107", pilotSource: "51938345478",
  });
  assert.deepEqual(result, { attempted: 0, sent: 0, failed: 0 });
  assert.match(requests[0].sql, /alert_key LIKE/);
  assert.deepEqual(requests[0].params, ["51938345478", "qa-template-20261107"]);
});
