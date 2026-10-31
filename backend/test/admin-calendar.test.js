import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { calendarPeriod, getInternalCalendarService } from "../src/modules/bookings/booking-calendar.service.js";

test("el período del calendario no admite fechas inválidas ni consultas masivas", () => {
  assert.deepEqual(calendarPeriod("2026-10-01", 31), {
    start: "2026-10-01", endExclusive: "2026-11-01", days: 31,
  });
  assert.deepEqual(calendarPeriod("2028-02-01", 29), {
    start: "2028-02-01", endExclusive: "2028-03-01", days: 29,
  });
  for (const [start, days] of [
    ["2026-02-30", 1], ["2026-13-01", 7], ["2026-10-01", 0],
    ["2026-10-01", 32], ["2026-10-01", "7days"], ["not-a-date", 7],
  ]) {
    assert.throws(() => calendarPeriod(start, days), { statusCode: 400 });
  }
});

test("snapshot devuelve solo habitaciones activas, reservas internas y bloqueos", async () => {
  const queries = [];
  const db = {
    async query(sql, values) {
      queries.push({ sql, values });
      if (sql.includes("FROM rooms")) {
        assert.match(sql, /status = 'active'/);
        return { rows: [{ id: 101, room_number: "101", name: "Habitación 101" }] };
      }
      if (sql.includes("FROM bookings")) {
        assert.match(sql, /check_in < \$2::date AND check_out > \$1::date/);
        assert.match(sql, /status NOT IN/);
        return { rows: [{ id: 7, room_id: 101, status: "confirmed", check_in: "2026-10-01", check_out: "2026-10-03" }] };
      }
      if (sql.includes("FROM blocked_slots")) {
        return { rows: [{ id: 2, room_id: 101, blocked_date: "2026-10-08", block_type: "time" }] };
      }
      throw new Error("Consulta inesperada");
    },
  };
  const data = await getInternalCalendarService({ start: "2026-10-01", days: 7 }, db);
  assert.equal(data.scope, "internal_only");
  assert.equal(data.external_inventory_synchronized, false);
  assert.equal(data.rooms.length, 1);
  assert.equal(data.bookings[0].status, "confirmed");
  assert.equal(data.blocked_slots[0].block_type, "time");
  assert.equal(queries.length, 3);
  assert.deepEqual(queries[1].values, ["2026-10-01", "2026-10-08"]);
  assert.deepEqual(queries[2].values, ["2026-10-01", "2026-10-08"]);
  assert.ok(queries.every((q) => /^\s*SELECT\b/.test(q.sql)), "Solo consultas de lectura");
  assert.ok(queries.every((q) => !/booking\.com|airbnb|customers/i.test(q.sql)));
});

test("calendario administrativo rechaza a visitantes sin JWT", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const response = await fetch("http://127.0.0.1:" + server.address().port + "/api/bookings/calendar?start=2026-10-01&days=7");
  assert.equal(response.status, 401);
});
