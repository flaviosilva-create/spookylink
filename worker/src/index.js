/**
 * SpookyLink Paddle transaction verification endpoint.
 *
 * Deploy as a Cloudflare Worker. Configure secrets/vars documented in
 * worker/README.md. Never put API keys or webhook secrets in public files.
 */
const json = (data, status = 200, origin = "*") => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, GET, OPTIONS",
    "access-control-allow-headers": "Content-Type",
    "vary": "Origin"
  }
});

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGIN || "https://flaviosilva-create.github.io").replace(/\/$/, "");
  if (!origin) return allowed;
  return origin.replace(/\/$/, "") === allowed ? allowed : null;
}

function priceEntitlements(env) {
  const result = {};
  const invitation = String(env.PRICE_INVITATION || "");
  const mystery = String(env.PRICE_MYSTERY || "");
  const bundle = String(env.PRICE_BUNDLE || "");
  if (/^pri_[a-z0-9]+$/i.test(invitation)) result[invitation] = ["invitation"];
  if (/^pri_[a-z0-9]+$/i.test(mystery)) result[mystery] = ["mystery"];
  if (/^pri_[a-z0-9]+$/i.test(bundle)) result[bundle] = ["invitation", "mystery"];
  return result;
}

async function verifyTransaction(transactionId, env) {
  const apiKey = String(env.PADDLE_API_KEY || "");
  const environment = String(env.PADDLE_ENVIRONMENT || "sandbox");
  const allowedPrices = priceEntitlements(env);
  if (!apiKey || !Object.keys(allowedPrices).length) {
    return { error: "server_misconfigured", status: 503 };
  }
  if (environment !== "sandbox" && environment !== "production") {
    return { error: "invalid_environment", status: 500 };
  }
  const apiBase = environment === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
  const response = await fetch(`${apiBase}/transactions/${encodeURIComponent(transactionId)}?include=adjustments`, {
    headers: { "authorization": `Bearer ${apiKey}`, "accept": "application/json" }
  });
  if (response.status === 404) return { error: "transaction_not_found", status: 404 };
  if (!response.ok) {
    // Do not expose Paddle's response body or API diagnostics publicly.
    return { error: "paddle_verification_failed", status: 502 };
  }
  const payload = await response.json();
  const transaction = payload && payload.data;
  if (!transaction || transaction.id !== transactionId) return { error: "transaction_not_found", status: 404 };
  if (transaction.status !== "completed") return { error: "payment_not_completed", status: 402 };

  // Paddle API versions expose calculated line items under details.line_items.
  // Also accept a top-level line_items array or the items[].price.id form.
  const lineItems = Array.isArray(transaction.details?.line_items)
    ? transaction.details.line_items
    : Array.isArray(transaction.line_items)
      ? transaction.line_items
      : Array.isArray(transaction.items)
        ? transaction.items.map(item => ({ price_id: item?.price?.id || item?.price_id }))
        : [];
  const products = new Set();
  for (const item of lineItems) {
    const price = item && (item.price_id || item.price?.id);
    if (price && allowedPrices[price]) {
      for (const product of allowedPrices[price]) products.add(product);
    }
  }
  if (!products.size) return { error: "transaction_has_no_spookylink_items", status: 403 };

  // Fail closed when an approved/pending refund or chargeback exists.
  // A durable webhook-driven ledger is recommended before scaling real sales.
  const adjustments = Array.isArray(transaction.adjustments) ? transaction.adjustments : [];
  if (adjustments.some(x => x && (
    (["approved", "pending_approval"].includes(x.status) && ["credit", "refund", "chargeback", "chargeback_warning"].includes(x.action)) ||
    ["chargeback", "chargeback_warning"].includes(x.action)
  ))) {
    return { error: "transaction_adjustment_pending_or_approved", status: 403 };
  }
  return { products: [...products], transactionId: transaction.id, status: transaction.status };
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    if (!origin) return json({ error: "origin_not_allowed" }, 403, "null");
    if (request.method === "OPTIONS") return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "POST, GET, OPTIONS",
        "access-control-allow-headers": "Content-Type",
        "access-control-max-age": "86400",
        "vary": "Origin"
      }
    });
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ ok: true, service: "spookylink-paddle-verification", environment: env.PADDLE_ENVIRONMENT || "sandbox" }, 200, origin);
    }
    if (request.method === "POST" && url.pathname === "/api/verify-transaction") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "invalid_json" }, 400, origin); }
      const transactionId = String(body && body.transactionId || "");
      if (!/^txn_[a-z0-9]{26}$/i.test(transactionId)) return json({ error: "invalid_transaction_id" }, 400, origin);
      try {
        const result = await verifyTransaction(transactionId, env);
        if (result.error) return json({ error: result.error }, result.status, origin);
        return json({ ok: true, products: result.products, transactionId: result.transactionId }, 200, origin);
      } catch {
        return json({ error: "verification_unavailable" }, 502, origin);
      }
    }
    return json({ error: "not_found" }, 404, origin);
  }
};
