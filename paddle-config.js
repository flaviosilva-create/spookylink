// Public Paddle.js configuration for SpookyLink.
// These are intentionally placeholders. Only a Paddle CLIENT-SIDE token belongs here.
// Never put a Paddle API key or webhook secret in this file or in GitHub Pages.
window.SPOOKYLINK_PADDLE_CONFIG = {
  // Start with "sandbox". Change to "production" only after Paddle approves the account/site.
  environment: "sandbox",
  token: "test_REPLACE_WITH_PADDLE_CLIENT_SIDE_TOKEN",
  prices: {
    invitation: "pri_REPLACE_WITH_INVITATION_PRICE_ID",
    mystery: "pri_REPLACE_WITH_MYSTERY_PRICE_ID",
    bundle: "pri_REPLACE_WITH_BUNDLE_PRICE_ID"
  }
};
