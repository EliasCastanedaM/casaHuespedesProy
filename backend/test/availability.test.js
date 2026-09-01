import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAvailabilityInput } from "../src/modules/availability/availability.service.js";

test("calcula la salida a partir de noches", () => {
  const result = normalizeAvailabilityInput({
    check_in: "2026-09-10",
    nights: 3,
    guests_count: 2,
  });

  assert.equal(result.check_out, "2026-09-13");
  assert.equal(result.nights, 3);
  assert.equal(result.guests_count, 2);
});

test("rechaza fechas inexistentes sin lanzar un error interno", () => {
  assert.throws(
    () => normalizeAvailabilityInput({ check_in: "2026-99-99", nights: 2 }),
    (error) => error.statusCode === 400
  );
});

test("rechaza salida anterior al ingreso", () => {
  assert.throws(
    () =>
      normalizeAvailabilityInput({
        check_in: "2026-09-10",
        check_out: "2026-09-09",
      }),
    (error) => error.statusCode === 400
  );
});

test("limita la estadía y la cantidad de huéspedes", () => {
  assert.throws(
    () =>
      normalizeAvailabilityInput({
        check_in: "2026-09-10",
        check_out: "2026-12-10",
      }),
    (error) => error.statusCode === 400
  );

  assert.throws(
    () =>
      normalizeAvailabilityInput({
        check_in: "2026-09-10",
        check_out: "2026-09-11",
        guests_count: 0,
      }),
    (error) => error.statusCode === 400
  );
});
