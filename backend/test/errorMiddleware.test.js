import test from "node:test";
import assert from "node:assert/strict";
import { errorMiddleware } from "../src/middlewares/errorMiddleware.js";

function responseRecorder() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("en producción registra solo metadatos seguros y oculta errores internos", () => {
  const previousEnvironment = process.env.NODE_ENV;
  const originalError = console.error;
  const captured = [];
  process.env.NODE_ENV = "production";
  console.error = (...args) => captured.push(args);

  try {
    const req = {
      method: "POST",
      baseUrl: "/api/meta",
      route: { path: "/webhook" },
      originalUrl: "/api/meta/webhook?access_token=secret-query",
      body: { from: "51999999999", text: "mensaje privado" },
    };
    const res = responseRecorder();
    const error = Object.assign(
      new Error("token=secret-token phone=51999999999 body=mensaje privado"),
      { statusCode: 500, code: "23505" }
    );
    error.stack = "stack with secret-token and phone=51999999999";

    errorMiddleware(error, req, res, () => {});

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, {
      success: false,
      message: "Error interno del servidor",
    });
    assert.equal(captured.length, 1);

    const log = JSON.parse(captured[0][0]);
    assert.deepEqual(log, {
      component: "http_error",
      method: "POST",
      baseUrl: "/api/meta",
      route: "/webhook",
      statusCode: 500,
      errorType: "Error",
      errorCode: "23505",
    });
    const serialized = JSON.stringify({ log, body: res.body });
    assert.equal(serialized.includes("secret-token"), false);
    assert.equal(serialized.includes("51999999999"), false);
    assert.equal(serialized.includes("mensaje privado"), false);
    assert.equal(serialized.includes("secret-query"), false);
  } finally {
    console.error = originalError;
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});

test("conserva mensajes claros para errores 4xx sin exponer detalles 5xx", () => {
  const previousEnvironment = process.env.NODE_ENV;
  const originalError = console.error;
  process.env.NODE_ENV = "production";
  console.error = () => {};

  try {
    const req = { method: "POST", baseUrl: "/api/auth", route: { path: "/login" } };
    const res = responseRecorder();

    errorMiddleware(
      Object.assign(new Error("Credenciales incorrectas"), { statusCode: 401 }),
      req,
      res,
      () => {}
    );

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, "Credenciales incorrectas");
  } finally {
    console.error = originalError;
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});
