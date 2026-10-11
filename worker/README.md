# Cloudflare Worker: Paddle verification

This Worker verifies completed Paddle transactions using Paddle's server-side API. The Paddle API key remains in Cloudflare's encrypted secret storage; it must never be placed in `index.html` or `paddle-config.js`.

## Deploy using the Cloudflare dashboard (no local tooling required)

1. Sign in to your Cloudflare account and open **Workers & Pages**.
2. Choose **Create** → **Create Worker**, name it `spookylink-paddle-verification`, then deploy the initial Worker.
3. Open the Worker editor and replace its sample code with the full content from `worker/src/index.js` in this repository. Save and deploy.
4. Open **Settings → Variables and Secrets** and configure these variables:
   - `PADDLE_ENVIRONMENT`: `sandbox` while testing; use `production` only after Paddle approves you.
   - `ALLOWED_ORIGIN`: `https://flaviosilva-create.github.io` (origin only; do not append `/spookylink/`).
   - `PRICE_INVITATION`: sandbox or live price ID for SpookyLink Invitation.
   - `PRICE_MYSTERY`: sandbox or live price ID for Haunted Mystery.
   - `PRICE_BUNDLE`: sandbox or live price ID for the bundle.
5. Add `PADDLE_API_KEY` as an **encrypted secret**, not a plain variable. For sandbox, use a sandbox API key with the read permission needed for transactions. Do not paste it into GitHub or this README.
6. Deploy again and copy the Worker URL, for example `https://spookylink-paddle-verification.YOUR-SUBDOMAIN.workers.dev`.
7. Open `paddle-config.js` in GitHub and set `apiBaseUrl` to that exact Worker base URL. Do not append `/api/verify-transaction`; the frontend appends the endpoint path.
8. Open `https://YOUR-WORKER-URL/api/health`. A correctly deployed Worker responds with JSON showing `ok: true`.
9. Keep the Paddle environment, API key, and all three price IDs within the same mode (sandbox with sandbox; production with live).

## How verification works

After Paddle emits `checkout.completed`, the browser reads the related transaction ID and sends it to `POST /api/verify-transaction`. The Worker calls Paddle's transaction API from the server, requires a `completed` transaction, and only returns entitlement keys if the transaction contains one of the three configured SpookyLink price IDs. On page load, saved transaction references are rechecked with the server before paid features unlock.

This avoids trusting a client-side "payment succeeded" flag alone. Do not remove the server verification step or add a local-only unlock fallback for real sales.

## Test mode

- Use a sandbox client-side token beginning with `test_` in `paddle-config.js`.
- Use the three sandbox price IDs in both `paddle-config.js` and Worker variables.
- Set Worker `PADDLE_ENVIRONMENT=sandbox` and use a sandbox API key as the encrypted `PADDLE_API_KEY` secret.
- Set Paddle's sandbox default payment link to the website URL. Paddle's docs explain this setting and list the sandbox test card.
- Buy each of the three products with a sandbox transaction, confirm the Worker returns the expected products, reload the page, and verify the unlock remains valid only after server verification.
- Test an invalid transaction ID and a non-completed transaction; neither should unlock anything.

## Production

Do not accept real payments until Paddle has approved your account/domain. Create a live client-side token and live product price IDs, update Worker secrets/variables to the production API, set `environment: "production"` and `apiBaseUrl` in `paddle-config.js`, deploy, and test carefully.

## Limitations and next hardening steps

The Worker checks live transaction status and configured product price IDs, but this first deployment template does not persist a durable user account or implement a full webhook-driven revocation ledger. Local storage merely remembers transaction IDs; it is not the authority. For a larger sales volume, add verified Paddle webhooks for completed transactions and approved refunds, store entitlements idempotently in a database, provide a customer restore/purchase support process, and monitor the Worker/API rate limits.

Official docs:
- https://developer.paddle.com/api-reference/transactions/get-transaction/
- https://developer.paddle.com/paddle-js/events/checkout-completed/
- https://developer.paddle.com/build/transactions/default-payment-link/
