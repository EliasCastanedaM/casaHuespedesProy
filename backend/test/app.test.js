import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

async function startApp() {
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return { server, baseUrl };
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("expone salud y protege datos administrativos", async () => {
  const { server, baseUrl } = await startApp();

  try {
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).success, true);

    const customers = await fetch(`${baseUrl}/api/customers`);
    assert.equal(customers.status, 401);

    const missing = await fetch(`${baseUrl}/api/no-existe`);
    assert.equal(missing.status, 404);
  } finally {
    await closeServer(server);
  }
});
