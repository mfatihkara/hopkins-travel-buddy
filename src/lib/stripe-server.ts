import Stripe from "stripe";

// Lazily instantiated so missing env var doesn't crash the module at import.
let _stripe: Stripe | null = null;

export function getServerStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
    _stripe = new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
  }
  return _stripe;
}
