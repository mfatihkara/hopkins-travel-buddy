"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { stripe } from "@/lib/stripe";

// Create a Stripe PaymentIntent for the caller's share of the group fare.
export async function createPaymentIntent(
  groupId: string,
  amountCents: number,
): Promise<{ clientSecret: string } | { error: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify caller is in the group and hasn't already paid.
  const { data: trip } = await supabase
    .from("trips")
    .select("id, paid_at")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!trip) return { error: "You're not in this group." };
  if (trip.paid_at) return { error: "Already paid." };

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    metadata: { group_id: groupId, user_id: user.id, trip_id: trip.id },
    automatic_payment_methods: { enabled: true },
  });

  // Store intent id so the webhook can match it back.
  await supabase
    .from("trips")
    .update({ payment_intent_id: intent.id })
    .eq("id", trip.id);

  return { clientSecret: intent.client_secret! };
}

// Called client-side after Stripe confirms the payment.
// Marks the trip as paid (double-checked by webhook in production).
export async function markTripPaid(groupId: string): Promise<void> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("trips")
    .update({ paid_at: new Date().toISOString() })
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .is("paid_at", null);

  revalidatePath(`/groups/${groupId}`);
}
