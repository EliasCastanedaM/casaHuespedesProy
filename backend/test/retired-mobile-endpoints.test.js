import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("el backend ya no monta la API móvil descontinuada", () => {
  const source = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /app\.use\s*\(\s*["']\/api\/mobile/);
  assert.doesNotMatch(source, /modules\/mobile\/mobile\.routes\.js/);
});
