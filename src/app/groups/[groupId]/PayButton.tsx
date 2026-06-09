"use client";

import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { createPaymentIntent, markTripPaid } from "./payment-actions";

function CheckoutForm({
  groupId,
  amountCents,
  onSuccess,
}: {
  groupId: string;
  amountCents: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: submitErr } = await elements.submit();
    if (submitErr) {
      setError(submitErr.message ?? "Payment failed.");
      setLoading(false);
      return;
    }

    const { error: confirmErr } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmErr) {
      setError(confirmErr.message ?? "Payment failed.");
      setLoading(false);
      return;
    }

    await markTripPaid(groupId);
    onSuccess();
    setLoading(false);
  }

  const usd = (cents: number) =>
    (cents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" disabled={!stripe || loading} className="w-full" size="lg">
        {loading ? "Processing…" : `Pay ${usd(amountCents)}`}
      </Button>
    </form>
  );
}

export default function PayButton({
  groupId,
  amountCents,
}: {
  groupId: string;
  amountCents: number;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usd = (cents: number) =>
    (cents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    });

  async function handleOpen() {
    setLoading(true);
    setError(null);
    const result = await createPaymentIntent(groupId, amountCents);
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setClientSecret(result.clientSecret);
    setOpen(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="rounded-lg bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm font-medium text-green-700 dark:text-green-400 text-center">
        ✓ You&apos;ve paid your share
      </div>
    );
  }

  if (open && clientSecret) {
    return (
      <div className="rounded-lg border bg-background p-4 space-y-3">
        <p className="text-sm font-medium">Pay your share — {usd(amountCents)}</p>
        <Elements
          stripe={getStripe()}
          options={{
            clientSecret,
            appearance: { theme: "stripe" },
          }}
        >
          <CheckoutForm
            groupId={groupId}
            amountCents={amountCents}
            onSuccess={() => { setOpen(false); setDone(true); }}
          />
        </Elements>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="w-full text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className="w-full"
        size="lg"
      >
        {loading ? "Loading…" : `Pay your share · ${usd(amountCents)}`}
      </Button>
      <p className="text-[11px] text-center text-muted-foreground">
        Apple Pay · Google Pay · Card
      </p>
    </div>
  );
}
