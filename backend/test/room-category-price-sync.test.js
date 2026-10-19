import test from "node:test";
import assert from "node:assert/strict";
import { updateRoomCategoryService } from "../src/modules/rooms/roomCategory.service.js";

function fakeCategoryDatabase() {
  const original = {
    id: 4, slug: "triple", name: "Triple - 3 Camas",
    capacity: 3, price_per_night: 210,
    price_low: 210, price_medium: 210, price_high: 210,
    bed_description: "3 camas de 1½ plaza",
    description: "Habitación triple",
    image_url: null, is_active: true,
  };
  const queries = [];
  return {
    queries,
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (/SELECT \*/i.test(sql)) return { rows: [{ ...original }] };
      if (/UPDATE room_categories/i.test(sql)) {
        const [capacity, price] = params;
        return {
          rows: [{
            ...original,
            capacity, price_per_night: price,
            ...(params[7] ? {price_low: price,price_medium: price,price_high: price} : {}),
          }],
        };
      }
      throw new Error("Unexpected SQL in mock");
    },
  };
}

test("al modificar el precio base actualiza también precios heredados", async () => {
  const db = fakeCategoryDatabase();
  const updated = await updateRoomCategoryService("triple", { price_per_night: 235 }, db);
  assert.equal(updated.price_per_night, 235);
  assert.equal(updated.price_low, 235);
  assert.equal(updated.price_medium, 235);
  assert.equal(updated.price_high, 235);
  const update = db.queries.find(q => /UPDATE room_categories/.test(q.sql));
  assert.ok(update);
  for (const column of ["price_low", "price_medium", "price_high"]) {
    assert.match(update.sql, new RegExp(column + String.raw`\\s*=\\s*CASE WHEN \\$8::boolean THEN \\$2`));
  }
  assert.equal(update.params[1], 235);
  assert.equal(update.params[7], true);
});

test("al editar la descripción no se fuerza una modificación de las tarifas antiguas", async () => {
  const db = fakeCategoryDatabase();
  const result = await updateRoomCategoryService("triple", { description: "Nueva descripción" }, db);
  assert.equal(result.price_per_night, 210);
  const update = db.queries.find(q => /UPDATE room_categories/.test(q.sql));
  assert.equal(update.params[7], false);
  assert.equal(update.params[3], "Nueva descripción");
});

test("rechaza un precio negativo antes de ejecutar UPDATE", async () => {
  const db = fakeCategoryDatabase();
  await assert.rejects(
    updateRoomCategoryService("triple", { price_per_night: -5 }, db),
    error => error.statusCode === 400
  );
  assert.equal(db.queries.filter(q => /UPDATE room_categories/.test(q.sql)).length, 0);
});
