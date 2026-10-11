# Paddle setup and domain-review checklist

This guide is for the SpookyLink GitHub Pages site:
https://flaviosilva-create.github.io/spookylink/

## 1. Complete the website before applying

- Replace `REPLACE_WITH_REAL_SUPPORT_EMAIL` and `REPLACE_WITH_REAL_SUPPORT_PHONE` in `contact.html` with real support details you can monitor.
- Confirm the business/sole-proprietor information you enter in Paddle is accurate. Paddle prefers the legal name for a sole proprietor when appropriate; the public-facing brand is SpookyLink.
- Review every page linked in the homepage footer: Terms, Privacy, Refunds, and Contact.
- The refund policy currently offers a 30-day request window. Keep this promise only if you are willing to honor it and can handle requests through Paddle.
- Verify product descriptions and images accurately represent what buyers receive: a downloadable PNG invitation, a playable four-riddle browser game, or both.
- Do not claim that SpookyLink stores hosted invitation pages, manages RSVPs, saves guest lists, or provides multiplayer synchronization; those features are not part of this version. Shareable URLs encode the invitation details in the URL itself and are not encrypted or stored in a SpookyLink database.

Paddle says the domain review looks for a clear product description, prices and deliverables, Terms & Conditions, Refund Policy, Privacy Policy, seller/brand name, and a live HTTPS website. It may request extra evidence of product ownership or additional information.

## 2. Create products and prices in Paddle

Create three one-time products/prices in your own Paddle account:

| Product | Base price | Checkout plan key |
|---|---:|---|
| SpookyLink Invitation | USD 9.99 | `invitation` |
| SpookyLink Haunted Mystery | USD 4.99 | `mystery` |
| SpookyLink Full Experience Bundle | USD 12.99 | `bundle` |

Copy each **price ID** beginning with `pri_`. Do not use a product ID beginning with `pro_` in the price fields. Choose the product/tax category that accurately represents the deliverable and follow any category-approval prompts in the Paddle dashboard.

## 3. Configure sandbox first

1. Open the Paddle sandbox workspace and create a client-side token under **My account → Settings → Authentication → Client-side tokens**. It begins with `test_`.
2. Open `paddle-config.js` in the GitHub repository and replace:
   - `test_REPLACE_WITH_PADDLE_CLIENT_SIDE_TOKEN` with the sandbox client-side token.
   - The three `pri_REPLACE_...` values with the matching sandbox price IDs.
3. Keep `environment: "sandbox"`.
4. In Paddle's Checkout settings, configure a default payment link. Use your published HTTPS site URL where the dashboard allows this.
5. Commit the changes to the `main` branch and wait for GitHub Pages to publish them.
6. Test checkout with Paddle's sandbox test card documented in its developer quickstart. No real money should move in sandbox.

The client-side token is meant to be public. **Never put a Paddle API key or webhook secret in `paddle-config.js`, `index.html`, or any public GitHub file.**

## 4. Website approval and production

1. Check that every link works from the public site over HTTPS, especially all footer legal links.
2. Confirm the site has no broken links, missing images, browser-console errors, or misleading product claims. Test a narrow mobile screen and a desktop browser.
3. Submit the domain under Paddle dashboard **My account → Settings → Website approval**.
4. Complete Paddle identity and payout verification in your account. Approval is decided by Paddle; publishing website code cannot guarantee approval.
5. Only after Paddle approves the account and domain, create/use the live client-side token beginning with `live_` and the live price IDs. Set `environment: "production"` in `paddle-config.js`.
6. Repeat checkout tests and confirm transactions appear in the correct live workspace before advertising paid purchases.

## 5. Important current limitation: fulfillment is browser-side

This GitHub Pages version listens for Paddle.js `checkout.completed`, then writes an unlock marker into browser local storage. It does not verify the transaction on your own server. Local storage is editable, and a purchase marker will not automatically follow a customer to a different browser or device. For an initial review/testing flow, this lets you verify the frontend wiring, but it is **not secure, durable production fulfillment**.

Before significant real sales, add a backend/serverless endpoint that receives Paddle notifications, verifies the `Paddle-Signature` using the endpoint secret, checks the transaction status/items on the server, and records entitlements durably. GitHub Pages alone cannot run this backend. Do not claim server-verified fulfillment until that backend exists and has been tested.

## Official docs

- Paddle quickstart: https://developer.paddle.com/get-started/quickstart/
- Client-side tokens: https://developer.paddle.com/paddle-js/about/client-side-tokens/
- Domain review: https://www.paddle.com/help/start/account-verification/what-is-domain-verification
- Acceptable Use Policy: https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle
- Webhook signature verification: https://developer.paddle.com/webhooks/about/signature-verification/
