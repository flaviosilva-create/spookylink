# SpookyLink — Paddle setup and website review

Public website: https://flaviosilva-create.github.io/spookylink/

The repository now includes the invitation editor, shareable invitation URLs, PNG export, a four-clue browser mystery, legal pages, Paddle.js checkout wiring, and a Cloudflare Worker that verifies completed transactions. The Paddle account, product IDs, secrets, and Worker deployment must be completed in your own accounts; source code cannot create or approve these credentials for you.

## 1. Review the live site

Open these pages over HTTPS and confirm they load:
- Home/pricing: https://flaviosilva-create.github.io/spookylink/
- Terms: https://flaviosilva-create.github.io/spookylink/terms.html
- Privacy: https://flaviosilva-create.github.io/spookylink/privacy.html
- Refunds: https://flaviosilva-create.github.io/spookylink/refunds.html
- Contact: https://flaviosilva-create.github.io/spookylink/contact.html

Paddle's domain review expects a clear description of what is sold, prices and deliverables, accessible Terms & Conditions, Refund Policy, Privacy Policy, seller/brand details, and a live HTTPS website. Paddle may request more information and decides whether to approve the site.

Actual deliverables:
- **Invitation — US$9.99:** shareable URL with invitation details and a paid high-resolution PNG download.
- **Haunted Mystery — US$4.99:** an interactive four-riddle browser game.
- **Bundle — US$12.99:** both paid features.
- This version does not store invitations in a database and does not include server-hosted invitation pages, RSVP tracking, guest lists, customer accounts, cloud saves, or multiplayer synchronization.

The refund policy promises a 30-day request window. Keep that promise only if you are prepared to honor it through the applicable Paddle process. Give Paddle accurate seller/business information; do not invent legal details or contact information.

## 2. Create products/prices in Paddle

In your own Paddle account, create three **one-time** USD prices:

| Product | Price | Price key |
|---|---:|---|
| SpookyLink Invitation | $9.99 | `invitation` |
| SpookyLink Haunted Mystery | $4.99 | `mystery` |
| SpookyLink Full Experience Bundle | $12.99 | `bundle` |

Copy their **price IDs** beginning with `pri_` (not product IDs beginning with `pro_`). Sandbox and live IDs are separate. Choose a product/tax category that accurately describes the digital deliverables.

## 3. Deploy the secure verification Worker

Follow the full dashboard walkthrough in `worker/README.md`. Summary:
1. In Cloudflare, create a Worker named `spookylink-paddle-verification`.
2. Deploy the contents of `worker/src/index.js`.
3. Add these Worker variables for sandbox:
   - `PADDLE_ENVIRONMENT=sandbox`
   - `ALLOWED_ORIGIN=https://flaviosilva-create.github.io` (origin only; no `/spookylink/` path)
   - `PRICE_INVITATION`, `PRICE_MYSTERY`, `PRICE_BUNDLE` with the matching sandbox price IDs.
4. Save a sandbox Paddle API key as the encrypted Worker secret `PADDLE_API_KEY`. Never add this key to a public GitHub file.
5. Deploy and open the Worker URL ending in `/api/health`; it should respond with JSON containing `"ok": true`.

## 4. Configure the public Paddle.js file

Edit `paddle-config.js` in GitHub:
- Keep `environment: "sandbox"`.
- Replace `token` with your Paddle **sandbox client-side token** beginning with `test_`.
- Set `apiBaseUrl` to the Worker base URL, for example `https://spookylink-paddle-verification.YOUR-SUBDOMAIN.workers.dev`. Do not add the API path; the page appends it.
- Replace the three price placeholders with the matching sandbox `pri_` IDs.

The client-side token is intentionally public. A Paddle API key or webhook/notification secret is private and belongs only in Cloudflare's encrypted secrets, never in GitHub.

## 5. Set Checkout and run sandbox tests

1. In Paddle's **sandbox** workspace, set the default payment link to the SpookyLink HTTPS URL under Checkout settings. Paddle documents this setting as necessary for checkout.
2. Commit `paddle-config.js` and wait for GitHub Pages to publish it.
3. Test on desktop and mobile. Accept the Terms/Refund checkbox and test the Invitation, Mystery, and Bundle using Paddle's sandbox test card from the official quickstart; do not use a real card in sandbox.
4. Confirm the transaction appears in the sandbox dashboard and the Worker verifies the returned transaction ID before paid features unlock.
5. Reload the page; saved transaction references should be verified again. Test an invalid ID and a transaction that is not completed: both must remain locked.
6. Check browser console and Cloudflare Worker logs if anything fails.

## 6. Submit the domain, then switch to live after approval

1. In Paddle, use **My account → Settings → Website approval** and submit `https://flaviosilva-create.github.io/spookylink/`.
2. Complete the requested identity/business and payout checks. An updated website alone cannot guarantee approval.
3. Wait for explicit account and domain approval.
4. Create three live prices and a live client-side token beginning with `live_`.
5. Update `paddle-config.js` with `environment: "production"`, the live token, live price IDs, and Worker URL.
6. In Cloudflare, update `PADDLE_ENVIRONMENT=production`, the three price variables, and the encrypted `PADDLE_API_KEY` secret with live credentials.
7. Configure the live default payment link, redeploy, and test carefully before advertising paid checkout.

**Never mix sandbox and live tokens, API keys, or price IDs.**

## Fulfillment scope and hardening

After `checkout.completed`, the frontend submits the transaction ID to the Worker. The Worker queries Paddle's server-side transaction API, requires status `completed`, and only unlocks products whose price IDs match SpookyLink's configured catalog. This is safer than trusting browser storage alone.

This is not a complete commerce platform yet: there are no customer accounts or durable database of entitlements, and refund/dispute revocation is not managed through an event-driven ledger. Purchase restoration is tied to transaction IDs remembered in the current browser. Before scaling, add verified Paddle webhooks and persistent entitlement records, plus a customer restoration process.

## Official Paddle documentation

- [Quickstart and sandbox test card](https://developer.paddle.com/get-started/quickstart/)
- [Overlay checkout](https://developer.paddle.com/build/checkout/build-overlay-checkout/)
- [Default payment link](https://developer.paddle.com/build/transactions/default-payment-link/)
- [Get a transaction](https://developer.paddle.com/api-reference/transactions/get-transaction/)
- [Website review requirements](https://www.paddle.com/help/start/account-verification/what-is-domain-verification)
