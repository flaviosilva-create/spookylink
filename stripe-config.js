// Public configuration only. Never place Stripe secret keys in this file.
window.SPOOKYLINK_STRIPE_CONFIG = {
  mode: "test",
  // Set this to the deployed Cloudflare Worker base URL after deploying the Worker.
  apiBaseUrl: "https://REPLACE-WITH-SPOOKYLINK-WORKER-URL"
};
