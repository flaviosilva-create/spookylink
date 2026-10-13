import test from "node:test";
import assert from "node:assert/strict";
import handler from "../src/index.js";

const origin = "https://flaviosilva-create.github.io";
const env = { STRIPE_SECRET_KEY: "sk_test_fake", STRIPE_MODE: "test" };
const paidSessions = new Map([
  ["cs_test_paidinvite", { id: "cs_test_paidinvite", payment_status: "paid", metadata: { plan: "invitation" } }],
  ["cs_test_paidmystery", { id: "cs_test_paidmystery", payment_status: "paid", metadata: { plan: "mystery" } }],
  ["cs_test_paidbundle", { id: "cs_test_paidbundle", payment_status: "paid", metadata: { plan: "bundle" } }],
  ["cs_test_unpaid", { id: "cs_test_unpaid", payment_status: "unpaid", metadata: { plan: "invitation" } }],
  ["cs_test_badplan", { id: "cs_test_badplan", payment_status: "paid", metadata: { plan: "admin" } }]
]);

const originalFetch = globalThis.fetch;
let lastCheckoutBody = null;
test.before(() => {
  globalThis.fetch = async (url, init = {}) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/v1/checkout/sessions" && init.method === "POST") {
      lastCheckoutBody = new URLSearchParams(init.body);
      return new Response(JSON.stringify({ id: "cs_test_created123", url: "https://checkout.stripe.com/c/pay/cs_test_created123" }), {
        status: 200, headers: { "content-type": "application/json" }
      });
    }
    if (parsed.pathname.startsWith("/v1/checkout/sessions/")) {
      const id = decodeURIComponent(parsed.pathname.split("/").pop());
      const session = paidSessions.get(id);
      if (!session) return new Response(JSON.stringify({ error: { message: "not found" } }), { status: 404 });
      return new Response(JSON.stringify(session), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: { message: "unexpected request" } }), { status: 500 });
  };
});
test.after(() => { globalThis.fetch = originalFetch; });

async function request(path, { method = "GET", body, requestOrigin = origin, runtimeEnv = env } = {}) {
  const response = await handler.fetch(new Request("https://worker.example" + path, {
    method,
    headers: { Origin: requestOrigin, ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  }), runtimeEnv);
  return { response, payload: await response.json() };
}

test("health endpoint is available", async () => {
  const { response, payload } = await request("/api/health");
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.service, "spookylink-stripe-checkout");
});

test("invitation checkout uses server-defined USD price and hosted Checkout", async () => {
  const { response, payload } = await request("/api/create-checkout-session", { method: "POST", body: { plan: "invitation" } });
  assert.equal(response.status, 200);
  assert.match(payload.url, /^https:\/\/checkout\.stripe\.com\//);
  assert.equal(lastCheckoutBody.get("line_items[0][price_data][unit_amount]"), "999");
  assert.equal(lastCheckoutBody.get("line_items[0][price_data][currency]"), "usd");
  assert.equal(lastCheckoutBody.get("metadata[plan]"), "invitation");
  assert.equal(lastCheckoutBody.get("mode"), "payment");
});

test("bundle checkout uses the correct server-defined amount", async () => {
  const { response } = await request("/api/create-checkout-session", { method: "POST", body: { plan: "bundle" } });
  assert.equal(response.status, 200);
  assert.equal(lastCheckoutBody.get("line_items[0][price_data][unit_amount]"), "1299");
});

test("unknown plan is rejected", async () => {
  const { response, payload } = await request("/api/create-checkout-session", { method: "POST", body: { plan: "free" } });
  assert.equal(response.status, 400);
  assert.equal(payload.error, "invalid_plan");
});

test("paid invitation session unlocks only the invitation", async () => {
  const { response, payload } = await request("/api/verify-session?session_id=cs_test_paidinvite");
  assert.equal(response.status, 200);
  assert.deepEqual(payload.products, ["invitation"]);
});

test("paid bundle session unlocks invitation and mystery", async () => {
  const { response, payload } = await request("/api/verify-session?session_id=cs_test_paidbundle");
  assert.equal(response.status, 200);
  assert.deepEqual(payload.products, ["invitation", "mystery"]);
});

test("unpaid Checkout Session is rejected", async () => {
  const { response, payload } = await request("/api/verify-session?session_id=cs_test_unpaid");
  assert.equal(response.status, 402);
  assert.equal(payload.error, "payment_not_completed");
});

test("unknown plan metadata is rejected", async () => {
  const { response, payload } = await request("/api/verify-session?session_id=cs_test_badplan");
  assert.equal(response.status, 402);
  assert.equal(payload.error, "payment_not_completed");
});

test("malformed session ID is rejected before Stripe API access", async () => {
  const { response, payload } = await request("/api/verify-session?session_id=bad-id");
  assert.equal(response.status, 400);
  assert.equal(payload.error, "invalid_session_id");
});

test("requests from an unapproved origin are rejected", async () => {
  const { response, payload } = await request("/api/create-checkout-session", {
    method: "POST", body: { plan: "invitation" }, requestOrigin: "https://attacker.example"
  });
  assert.equal(response.status, 403);
  assert.equal(payload.error, "origin_not_allowed");
});

test("missing Stripe secret fails closed", async () => {
  const { response, payload } = await request("/api/create-checkout-session", {
    method: "POST", body: { plan: "invitation" }, runtimeEnv: { STRIPE_SECRET_KEY: "" }
  });
  assert.equal(response.status, 503);
  assert.equal(payload.error, "server_misconfigured");
});
