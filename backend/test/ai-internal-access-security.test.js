import test from "node:test";
import assert from "node:assert/strict";
import { env } from "../src/config/env.js";
import { requireAiAccess } from "../src/modules/ai/ai.controller.js";

function invoke(token) {
  let nextCalled = false;
  let code = null;
  const req = { header: (name) => name === "x-ai-token" ? token : null };
  const res = {
    status(statusCode) { code = statusCode; return this; },
    json(value) { return value; },
  };
  requireAiAccess(req, res, () => { nextCalled = true; });
  return { code, nextCalled };
}

test("la API IA nunca acepta peticiones cuando el token no está configurado", () => {
  const previous = env.ai.internalToken;
  try {
    env.ai.internalToken = "";
    assert.deepEqual(invoke("cualquier-token"), { code: 401, nextCalled: false });
    assert.deepEqual(invoke(null), { code: 401, nextCalled: false });
  } finally {
    env.ai.internalToken = previous;
  }
});

test("la API IA requiere un token interno exacto", () => {
  const previous = env.ai.internalToken;
  try {
    env.ai.internalToken = "token-interno-solo-para-pruebas-123";
    assert.deepEqual(invoke(null), { code: 401, nextCalled: false });
    assert.deepEqual(invoke("token-interno-solo-para-pruebas-124"), { code: 401, nextCalled: false });
    assert.deepEqual(invoke("token"), { code: 401, nextCalled: false });
    assert.deepEqual(invoke("token-interno-solo-para-pruebas-123"), { code: null, nextCalled: true });
  } finally {
    env.ai.internalToken = previous;
  }
});
