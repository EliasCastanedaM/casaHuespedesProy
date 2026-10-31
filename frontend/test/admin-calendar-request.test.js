import test from "node:test";
import assert from "node:assert/strict";
import { startCalendarRequest } from "../src/pages/admin/calendarRequest.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test("una consulta antigua no reemplaza los datos de un período nuevo", async () => {
  const older = deferred();
  const newer = deferred();
  const results = [];
  const errors = [];
  const finished = [];
  let oldSignal;
  const oldCancel = startCalendarRequest({
    period: { start: "2026-10-01", days: 7 },
    periodKey: "2026-10-01:7",
    request: (_period, signal) => { oldSignal = signal; return older.promise; },
    onSuccess: (value) => results.push(value),
    onError: (error) => errors.push(error),
    onFinish: () => finished.push("old"),
  });
  oldCancel();
  assert.equal(oldSignal.aborted, true);

  const newCancel = startCalendarRequest({
    period: { start: "2026-10-08", days: 7 },
    periodKey: "2026-10-08:7",
    request: () => newer.promise,
    onSuccess: (value) => results.push(value),
    onError: (error) => errors.push(error),
    onFinish: () => finished.push("new"),
  });

  newer.resolve({ data: { data: { rooms: [{ id: 7 }] } } });
  await settle();
  older.resolve({ data: { data: { rooms: [{ id: 1 }] } } });
  await settle();
  assert.deepEqual(results, [{ key: "2026-10-08:7", data: { rooms: [{ id: 7 }] } }]);
  assert.deepEqual(errors, []);
  assert.deepEqual(finished, ["new"]);
  newCancel();
});

test("una respuesta fallida del período activo muestra error y finaliza", async () => {
  const events = [];
  const fail = new Error("No disponible");
  startCalendarRequest({
    period: { start: "2026-10-31", days: 1 },
    periodKey: "2026-10-31:1",
    request: () => Promise.reject(fail),
    onSuccess: () => events.push("success"),
    onError: (error) => events.push(error.message),
    onFinish: () => events.push("finished"),
  });
  await settle();
  assert.deepEqual(events, ["No disponible", "finished"]);
});

test("la cancelación de Axios nunca registra error ni respuesta tardía", async () => {
  const p = deferred();
  const events = [];
  const cancel = startCalendarRequest({
    period: { start: "2026-10-31", days: 1 },
    periodKey: "2026-10-31:1",
    request: () => p.promise,
    onSuccess: () => events.push("success"),
    onError: () => events.push("error"),
    onFinish: () => events.push("finished"),
  });
  cancel();
  const aborted = new Error("canceled");
  aborted.code = "ERR_CANCELED";
  p.reject(aborted);
  await settle();
  assert.deepEqual(events, []);
});
