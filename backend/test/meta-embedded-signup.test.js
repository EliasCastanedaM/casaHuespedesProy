import test from "node:test";
import assert from "node:assert/strict";
import { env } from "../src/config/env.js";
import {
  completeEmbeddedSignupController,
  embeddedSignupStatusController,
} from "../src/modules/meta/embedded-signup.controller.js";

function responseRecorder() {
  return {
    statusCode: 200,
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

function withMetaConfig(overrides, run) {
  const keys = [
    "appId",
    "appSecret",
    "embeddedSignupConfigId",
    "embeddedSignupEnabled",
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, env.meta[key]]));
  Object.assign(env.meta, overrides);
  try {
    return run();
  } finally {
    Object.assign(env.meta, previous);
  }
}

test("embedded signup status never exposes app secret and stays disabled unless enabled", () => {
  withMetaConfig({
    appId: "902787755987875",
    appSecret: "secret-for-test",
    embeddedSignupConfigId: "1425475549078422",
    embeddedSignupEnabled: false,
  }, () => {
    const res = responseRecorder();
    embeddedSignupStatusController({}, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.configured, true);
    assert.equal(res.body.data.enabled, false);
    assert.equal(res.body.data.appId, "902787755987875");
    assert.equal(res.body.data.configId, "1425475549078422");
    assert.equal(JSON.stringify(res.body).includes("secret-for-test"), false);
  });
});

test("embedded signup completion is blocked until explicitly enabled", async () => {
  await withMetaConfig({
    appId: "902787755987875",
    appSecret: "secret-for-test",
    embeddedSignupConfigId: "1425475549078422",
    embeddedSignupEnabled: false,
  }, async () => {
    const res = responseRecorder();
    await completeEmbeddedSignupController({ body: {} }, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.success, false);
  });
});

test("embedded signup completion rejects invalid session events before network calls", async () => {
  await withMetaConfig({
    appId: "902787755987875",
    appSecret: "secret-for-test",
    embeddedSignupConfigId: "1425475549078422",
    embeddedSignupEnabled: true,
  }, async () => {
    const res = responseRecorder();
    await completeEmbeddedSignupController({
      body: {
        code: "single-use-code",
        wabaId: "123456789012345",
        event: "UNEXPECTED_EVENT",
      },
    }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });
});
