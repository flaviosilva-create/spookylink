import test from "node:test";
import assert from "node:assert/strict";
import handler from "../src/index.js";

const origin = "https://flaviosilva-create.github.io";
const priceInvitation = "pri_" + "a".repeat(26);
const priceMystery = "pri_" + "b".repeat(26);
const priceBundle = "pri_" + "c".repeat(26);
const txValid = "txn_" + "d".repeat(26);
const txWrongPrice = "txn_" + "e".repeat(26);
const txNotCompleted = "txn_" + "f".repeat(26);
const txRefunded = "txn_" + "g".repeat(26);

const env = {
  PADDLE_API_KEY: "test-secret",
  PADDLE_ENVIRONMENT: "sandbox",
  ALLOWED_ORIGIN: origin,
  PRICE_INVITATION: priceInvitation,
  PRICE_MYSTERY: priceMystery,
  PRICE_BUNDLE: priceBundle
};

const transactions = new Map([
  [txValid, { id: txValid, status: "completed", details: { line_items: [{ price_id: priceInvitation }] }, adjustments: [] }],
  [txWrongPrice, { id: txWrongPrice, status: "completed", items: [{ price: { id: "pri_" + "z".repeat(26) } }], adjustments: [] }],
  [txNotCompleted, { id: txNotCompleted, status: "ready", details: { line_items: [{ price_id: priceInvitation }] }, adjustments: [] }],
  [txRefunded, { id: txRefunded, status: "completed", line_items: [{ price_id: priceInvitation }], adjustments: [{ status: "approved", action: "refund" }] }]
]);

const originalFetch = globalThis.fetch;

test.before(() => {
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    const id = decodeURIComponent(path.split("/").pop());
    const transaction = transactions.get(id);
    if (!transaction) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
    return new Response(JSON.stringify({ data: transaction }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
});

test.after(() => {
  globalThis.fetch = originalFetch;
});

async function callVerify(body, requestOrigin = origin, runtimeEnv = env) {
  const request = new Request("https://worker.example/api/verify-transaction", {
    method: "POST",
    headers: { Origin: requestOrigin, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const response = await handler.fetch(request, runtimeEnv);
  return { response, payload: await response.json() };
}

test("health endpoint is available", async () => {
  const response = await handler.fetch(new Request("https://worker.example/api/health", {
    headers: { Origin: origin }
  }), env);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
});

test("valid completed SpookyLink transaction unlocks only its configured product", async () => {
  const { response, payload } = await callVerify({ transactionId: txValid });
  assert.equal(response.status, 200);
  assert.deepEqual(payload.products, ["invitation"]);
});

test("unknown product price is rejected", async () => {
  const { response, payload } = await callVerify({ transactionId: txWrongPrice });
  assert.equal(response.status, 403);
  assert.equal(payload.error, "transaction_has_no_spookylink_items");
});

test("incomplete transaction is rejected", async () => {
  const { response, payload } = await callVerify({ transactionId: txNotCompleted });
  assert.equal(response.status, 402);
  assert.equal(payload.error, "payment_not_completed");
});

test("approved refund removes access", async () => {
  const { response, payload } = await callVerify({ transactionId: txRefunded });
  assert.equal(response.status, 403);
  assert.equal(payload.error, "transaction_adjustment_pending_or_approved");
});

test("malformed transaction ID is rejected before Paddle API access", async () => {
  const { response, payload } = await callVerify({ transactionId: "not-a-transaction" });
  assert.equal(response.status, 400);
  assert.equal(payload.error, "invalid_transaction_id");
});

test("requests from an unapproved origin are rejected", async () => {
  const { response, payload } = await callVerify({ transactionId: txValid }, "https://attacker.example");
  assert.equal(response.status, 403);
  assert.equal(payload.error, "origin_not_allowed");
});

test("missing Paddle API key fails closed", async () => {
  const envWithoutKey = { ...env, PADDLE_API_KEY: "" };
  const { response, payload } = await callVerify({ transactionId: txValid }, origin, envWithoutKey);
  assert.equal(response.status, 503);
  assert.equal(payload.error, "server_misconfigured");
});
