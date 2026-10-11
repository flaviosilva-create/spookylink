# SpookyLink

SpookyLink is an independent, mobile-first Halloween invitation builder and browser-based riddle game for the US market.

## Current implementation

- Responsive English landing page and pricing for one-time digital purchases.
- Live invitation editor with event title, host, date, time, location, custom message, and three visual themes.
- Copy/share invitation text, generate unique invitation URLs that prefill the editor, and export PNG artwork.
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

## Security and fulfillment

GitHub Pages hosts the public frontend. The repository also includes a Cloudflare Worker at `worker/src/index.js` that checks transaction IDs with the server-side Paddle API before paid features unlock. Deploy the Worker and set the encrypted `PADDLE_API_KEY` plus the three matching price IDs before enabling checkout. Deployment steps are in `worker/README.md`.

The frontend configuration in `paddle-config.js` intentionally contains placeholders. Checkout fails closed until the Paddle token, three price IDs, and Worker URL are configured. Never put Paddle API keys or webhook secrets in the public repository.

This starter Worker verifies current transaction status and configured price IDs, but doesn't yet provide customer accounts, a durable entitlement database, or a complete webhook-driven refund ledger. For a larger launch, add Paddle webhooks and idempotent database records, plus a customer purchase restoration/support process.

## Local preview

Open `index.html` in a modern browser. PNG export loads html2canvas from a CDN. Paddle checkout requires valid configuration and internet access.

## GitHub Pages

Repository settings should publish branch `main`, folder `/(root)`. Public site:
https://flaviosilva-create.github.io/spookylink/

SpookyLink is independent and is not part of Lovena.
