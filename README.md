# SpookyLink

SpookyLink is an independent, mobile-first Halloween invitation builder and browser-based riddle game for the US market.

## Current implementation

- Responsive English landing page and pricing for one-time digital purchases.
- Live invitation editor with event title, host, date, time, location, custom message, and three visual themes.
- Copy/share invitation text and PNG export of the invitation artwork.
- A four-clue interactive browser mystery game.
- Paddle.js checkout wiring for three products: Invitation (US$9.99), Haunted Mystery (US$4.99), and bundle (US$12.99).
- Terms & Conditions, Privacy Policy, Refund Policy, and Contact & Support pages.

## Required setup before review or real sales

1. Replace the contact placeholders in `contact.html` with a real support email and phone number. Do not submit the domain while those placeholders remain.
2. Create the three one-time products/prices in Paddle and set their IDs and your **client-side token** in `paddle-config.js`.
3. Test with a Paddle sandbox token and sandbox price IDs first.
4. Configure a default payment link in Paddle Checkout settings and test the overlay on desktop and mobile.
5. Submit the HTTPS GitHub Pages domain for Paddle website approval.
6. Switch to a live token and live price IDs only after Paddle approves the account and domain.
7. Read `PADDLE_SETUP.md` for the full sequence and limitations.

## Important security and fulfillment limitation

GitHub Pages is static hosting. This version unlocks digital features in the browser after Paddle.js emits `checkout.completed` and stores the entitlement marker in local storage. That makes the prototype testable without exposing secrets, but **it is not server-verified purchase fulfillment**: a browser user can alter local storage, and purchases do not automatically follow the customer to another device. Before treating this as a robust production commerce system, add a server-side endpoint/webhook that verifies Paddle's signature and transaction status, and a durable purchase record. Never put Paddle API keys or webhook secrets in this public repository.

Only the Paddle client-side token (not an API key) is designed for frontend use. The token and price IDs are intentionally placeholders until you create them in your own Paddle account.

## Local preview

Open `index.html` in a modern browser. PNG export loads html2canvas from a CDN. Paddle checkout requires valid configuration and internet access.

## GitHub Pages

Repository settings should publish branch `main`, folder `/(root)`. Public site:
https://flaviosilva-create.github.io/spookylink/

SpookyLink is independent and is not part of Lovena.
