// Public Paddle.js configuration for SpookyLink.
// This file is public. Only the Paddle CLIENT-SIDE token belongs here.
// Never put a Paddle API key or webhook secret in this file or in GitHub Pages.
window.SPOOKYLINK_PADDLE_CONFIG = {
  // Start with "sandbox". Change to "production" only after approval.
  environment: "sandbox",
  token: "test_REPLACE_WITH_PADDLE_CLIENT_SIDE_TOKEN",
  apiBaseUrl: "https://REPLACE-WITH-CLOUDFLARE-WORKER-URL",
  prices: {
    invitation: "pri_01m4pqtch149zj705rjf905w4a",
    mystery: "pri_01m4pr24c4knzg7kkpda30w7as",
    bundle: "pri_01m4pr5t96cjej61jve8mj0bn7"
  }
};
