/**
 * SpookyLink Stripe Checkout API (Cloudflare Worker).
 * Keep STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in encrypted Worker secrets.
 */
const SITE_ORIGIN = "https://flaviosilva-create.github.io";
const SITE_URL = SITE_ORIGIN + "/spookylink/";
const PLANS = {
  invitation: { amount: 999, name: "SpookyLink Invitation", description: "Personalized Halloween invitation with high-resolution PNG download.", products: ["invitation"] }
};
const json = (data, status = 200, origin = SITE_ORIGIN) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type, Stripe-Signature",
    "vary": "Origin"
  }
});
function allowedOrigin(request) {
  const origin = request.headers.get("Origin") || "";
  if (!origin) return SITE_ORIGIN;
  return origin.replace(/\/$/, "") === SITE_ORIGIN ? SITE_ORIGIN : null;
}
async function stripeRequest(path, secret, options = {}) {
  const response = await fetch("https://api.stripe.com/v1" + path, {
    method: options.method || "GET",
    headers: {
      authorization: "Bearer " + secret,
      ...(options.body ? { "content-type": "application/x-www-form-urlencoded" } : {})
    },
    body: options.body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Keep provider diagnostics and credentials private.
    throw new Error("stripe_api_error_" + response.status);
  }
  return data;
}
function productsForSession(session) {
  if (!session || session.payment_status !== "paid") return null;
  const plan = String(session.metadata?.plan || "");
  if (!Object.prototype.hasOwnProperty.call(PLANS, plan)) return null;
  return { products: PLANS[plan].products, plan, sessionId: session.id, paymentStatus: session.payment_status };
}
async function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  const parts = signatureHeader.split(",").map(x => x.trim());
  const timestamp = parts.find(x => x.startsWith("t="))?.slice(2);
  const signatures = parts.filter(x => x.startsWith("v1=")).map(x => x.slice(3));
  if (!timestamp || !signatures.length || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(timestamp + "." + rawBody)));
  const expected = [...signed].map(b => b.toString(16).padStart(2, "0")).join("");
  return signatures.some(sig => sig.length === expected.length && sig === expected);
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/stripe-webhook" && request.method === "POST") {
      const rawBody = await request.text();
      if (!await verifyWebhookSignature(rawBody, request.headers.get("Stripe-Signature"), String(env.STRIPE_WEBHOOK_SECRET || ""))) {
        return json({ error: "invalid_webhook_signature" }, 400);
      }
      let event;
      try { event = JSON.parse(rawBody); } catch { return json({ error: "invalid_json" }, 400); }
      if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
        const session = event.data?.object;
        // Access is verified against Stripe on the success page and on restore.
        // This webhook acknowledges Stripe's event after signature verification.
        if (session?.payment_status === "paid") {
          return json({ received: true, eventId: event.id, paymentStatus: "paid" });
        }
      }
      return json({ received: true, eventId: event?.id || null });
    }
    const origin = allowedOrigin(request);
    if (!origin) return json({ error: "origin_not_allowed" }, 403, "null");
    if (request.method === "OPTIONS") return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "Content-Type",
        "access-control-max-age": "86400",
        "vary": "Origin"
      }
    });
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ ok: true, service: "spookylink-stripe-checkout", mode: env.STRIPE_MODE || "test" }, 200, origin);
    }
    if (!env.STRIPE_SECRET_KEY) return json({ error: "server_misconfigured" }, 503, origin);
    if (request.method === "POST" && url.pathname === "/api/create-checkout-session") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "invalid_json" }, 400, origin); }
      const plan = String(body?.plan || "");
      if (!Object.prototype.hasOwnProperty.call(PLANS, plan)) return json({ error: "invalid_plan" }, 400, origin);
      const product = PLANS[plan];
      const params = new URLSearchParams();
      params.set("mode", "payment");
      params.set("success_url", SITE_URL + "?checkout=success&session_id={CHECKOUT_SESSION_ID}");
      params.set("cancel_url", SITE_URL + "?checkout=cancel");
      params.set("client_reference_id", "spookylink-" + plan);
      params.set("metadata[plan]", plan);
      params.set("line_items[0][quantity]", "1");
      params.set("line_items[0][price_data][currency]", "usd");
      params.set("line_items[0][price_data][unit_amount]", String(product.amount));
      params.set("line_items[0][price_data][product_data][name]", product.name);
      params.set("line_items[0][price_data][product_data][description]", product.description);
      params.set("allow_promotion_codes", "true");
      try {
        const session = await stripeRequest("/checkout/sessions", env.STRIPE_SECRET_KEY, { method: "POST", body: params.toString() });
        if (!session.url || !session.id) return json({ error: "checkout_session_unavailable" }, 502, origin);
        return json({ url: session.url, sessionId: session.id }, 200, origin);
      } catch {
        return json({ error: "checkout_creation_failed" }, 502, origin);
      }
    }
    if (request.method === "GET" && url.pathname === "/api/verify-session") {
      const sessionId = String(url.searchParams.get("session_id") || "");
      if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return json({ error: "invalid_session_id" }, 400, origin);
      try {
        const session = await stripeRequest("/checkout/sessions/" + encodeURIComponent(sessionId), env.STRIPE_SECRET_KEY);
        const verified = productsForSession(session);
        if (!verified) return json({ error: "payment_not_completed" }, 402, origin);
        return json({ ok: true, ...verified }, 200, origin);
      } catch {
        return json({ error: "session_verification_failed" }, 502, origin);
      }
    }
    return json({ error: "not_found" }, 404, origin);
  }
};
