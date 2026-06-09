import Stripe from "stripe";
import { loadStripe } from "@stripe/stripe-js";

// Server-side Stripe client (secret key, server only).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
});

// Client-side Stripe.js promise (publishable key, safe to expose).
let stripePromise: ReturnType<typeof loadStripe> | null = null;
export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
    );
  }
  return stripePromise;
}
