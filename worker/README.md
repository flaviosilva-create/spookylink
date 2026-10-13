# SpookyLink Stripe Checkout Worker

This Cloudflare Worker creates Stripe Checkout Sessions for SpookyLink and verifies completed purchases. The Stripe secret key must remain in Cloudflare encrypted secrets; never place it in GitHub Pages or a public JavaScript file.

## Deploy the Worker

1. In Cloudflare, open **Workers & Pages** and create a Worker named `spookylink-stripe-checkout`.
2. Deploy a basic Worker, then open its editor and replace the code with `worker/src/index.js` from this repository. Save and deploy.
3. In **Settings → Variables and Secrets**, add the plain variable `STRIPE_MODE=test`.
4. Add `STRIPE_SECRET_KEY` as an **encrypted secret**, using the test secret key from the SpookyLink Stripe account (starts with `sk_test_`). Do not send it in this chat or commit it to GitHub.
5. Deploy again and copy the Worker URL.
6. In `stripe-config.js`, replace `https://REPLACE-WITH-SPOOKYLINK-WORKER-URL` with the exact Worker base URL, then commit the file to GitHub.
7. Open `https://YOUR-WORKER-URL/api/health`. It should return JSON with `ok: true` and `service: spookylink-stripe-checkout`.

## Configure the webhook

In the Stripe Dashboard for **SpookyLink**, in **test mode**, create a webhook endpoint:
`https://YOUR-WORKER-URL/api/stripe-webhook`

Subscribe to:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Copy the endpoint's signing secret (starts with `whsec_`) into the Cloudflare Worker as the encrypted secret `STRIPE_WEBHOOK_SECRET`, then deploy again. Never publish that secret.

## Test the checkout

1. Confirm the Stripe Dashboard is in test mode.
2. Open the SpookyLink site and accept the Terms & Conditions / Refund Policy checkbox.
3. Test each product: Invitation $9.99 USD, Haunted Mystery $4.99 USD, and Full Experience Bundle $12.99 USD.
4. Use a Stripe test card such as `4242 4242 4242 4242`, any future expiry date, any CVC, and a valid test postal code.
5. Verify that checkout returns to SpookyLink and that the correct paid features unlock. Also test cancel/back, a failed test card, a malformed session ID, and a session that has not been paid.

The Worker sets the product and price server-side based on a fixed allowlist. It does not trust a client-supplied amount or product name. It uses Stripe's hosted Checkout and dynamically available payment methods.

## Before live payments

Do not switch to production until the test checkout and unlock/restore behavior have been tested. In production, use the live account's live secret key and a separate live webhook signing secret; keep the site config and Worker in the same mode. Complete Stripe's onboarding using accurate personal/business details for your actual situation.
