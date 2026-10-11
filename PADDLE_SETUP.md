# SpookyLink — Paddle setup and website review

Public website: https://flaviosilva-create.github.io/spookylink/

This repository is already prepared with the invitation builder, shareable invitation URLs, PNG export, a four-clue browser mystery, legal pages, Paddle.js integration, and a server-side transaction verification Worker. The provider account, product IDs, secrets, and Worker deployment must be completed in your own accounts; code cannot create or approve those credentials.

## 1. Review the public website

Before submitting the domain to Paddle, open these pages on the published HTTPS site and check that each loads:

- Home/pricing: https://flaviosilva-create.github.io/spookylink/
- Terms: https://flaviosilva-create.github.io/spookylink/terms.html
- Privacy: https://flaviosilva-create.github.io/spookylink/privacy.html
- Refunds: https://flaviosilva-create.github.io/spookylink/refunds.html
- Contact: https://flaviosilva-create.github.io/spookylink/contact.html

Paddle's website review asks for a clear product description, prices, clear deliverables, Terms & Conditions, Refund Policy, Privacy Policy, brand/legal name information, and a live HTTPS domain. Paddle may request more information. Its approval is not guaranteed.

Product deliverables currently are:
- Invitation — live editor, shareable URL carrying invitation details, and paid high-resolution PNG download.
- Haunted Mystery — one browser-based game with four riddles.
- Full Experience — both paid features.
- This version does not store invitations in a database and does not offer server-stored invitation pages, RSVP tracking, guest lists, customer accounts, cloud saves, or multiplayer synchronization.

The refund page promises a 30-day request window. Keep that promise only if you are prepared to honor it through the applicable Paddle process. Make sure the seller/business details you provide to Paddle are accurate.

## 2. Create prices in Paddle

In your own Paddle account, create three **one-time** products/prices in USD:

| Product | Price | Price key in code |
|---|---:|---|
| SpookyLink Invitation | $9.99 | `invitation` |
| SpookyLink Haunted Mystery | $4.99 | `mystery` |
| SpookyLink Full Experience Bundle | $12.99 | `bundle` |

Copy the corresponding **price IDs**, which start with `pri_`. Sandbox and live price IDs are different. Select the product/tax category that accurately describes these digital deliverables.

## 3. Deploy the server-side verification Worker

Follow `worker/README.md`. In summary:
1. Create a Cloudflare Worker named `spookylink-paddle-verification`.
2. Deploy the code from `worker/src/index.js`.
3. Add Worker variables `PADDLE_ENVIRONMENT=sandbox`, `ALLOWED_ORIGIN=https://flaviosilva-create.github.io`, and the three sandbox IDs `PRICE_INVITATION`, `PRICE_MYSTERY`, and `PRICE_BUNDLE`.
4. Store the sandbox Paddle API key as the encrypted Worker secret `PADDLE_API_KEY`. Never put it in GitHub or the website.
5. Open the Worker URL plus `/api/health` and confirm it responds with `{"ok":true,...}`.

The Worker uses the Paddle API server-side to check the transaction status and product price IDs. Checkout stays disabled when the Worker URL is still a placeholder.

## 4. Configure the public Paddle.js settings

Edit `paddle-config.js` on GitHub:

- `environment`: keep `sandbox` for tests.
- `token`: replace the placeholder with your Paddle **sandbox client-side token**, starting with `test_`.
- `apiBaseUrl`: set to the base URL of your deployed Cloudflare Worker, for example `https://spookylink-paddle-verification.YOUR-SUBDOMAIN.workers.dev`. Do not append the `/api/verify-transaction` path.
- `prices.invitation`, `prices.mystery`, `prices.bundle`: enter the matching sandbox `pri_` IDs.

A Paddle client-side token is designed to be public. A Paddle API key or a notification/webhook secret is not public and must never be placed in this file.

## 5. Configure Paddle Checkout and test

1. In the Paddle **sandbox** dashboard, set Checkout's default payment link to the SpookyLink HTTPS URL. Paddle documents that a default payment link is required to open checkout.
2. Wait for GitHub Pages to publish the config changes.
3. Open the website on both desktop and mobile. Agree to the Terms/Refund consent checkbox and test all three products using Paddle's sandbox test card from the official quickstart. No real money should move during sandbox tests.
4. Confirm each completed test payment appears in the sandbox dashboard and that the browser unlocks the correct feature only after the Worker verifies the transaction.
5. Reload the page and confirm saved transaction references are re-verified. Test invalid transaction IDs and incomplete transactions; they must not unlock anything.
6. Check the browser console and Worker logs if a checkout or verification request fails.

## 6. Submit website review and switch to live only after approval

1. Submit `https://flaviosilva-create.github.io/spookylink/` under Paddle's **Website approval** flow.
2. Complete the identity/business and payout verification in your Paddle account.
3. Wait for explicit approval of the business/account and domain.
4. Create the three live product prices and a live client-side token starting with `live_`.
5. Update `paddle-config.js` to `environment: "production"`, the live token, live price IDs, and the Worker URL.
6. In Cloudflare, change `PADDLE_ENVIRONMENT` to `production`, set the live IDs, and replace the Worker secret with the live Paddle API key. Never mix sandbox and live credentials.
7. Set a live default payment link and repeat the checkout path carefully before advertising or sending customers to it.

## Fulfillment and limitations

The frontend does not unlock a feature solely because Paddle.js reports a checkout event. It records the transaction reference and asks the Worker to verify it against Paddle's transaction API. The Worker only returns features for a completed transaction containing one of the configured price IDs.

This is a first production-oriented integration, not a complete commerce platform: there are no customer accounts or database-backed entitlements, so access restoration on another device is limited unless the user retains the transaction reference. A full webhook-driven refund/dispute ledger and durable purchase database are recommended before scaling. Do not describe features that are not implemented as included in the product.

## Official Paddle documentation

- [Quickstart and sandbox test card](https://developer.paddle.com/get-started/quickstart/)
- [Build an overlay checkout](https://developer.paddle.com/build/checkout/build-overlay-checkout/)
- [Default payment link](https://developer.paddle.com/build/transactions/default-payment-link/)
- [Get a transaction](https://developer.paddle.com/api-reference/transactions/get-transaction/)
- [Website/domain review requirements](https://www.paddle.com/help/start/account-verification/what-is-domain-verification)
