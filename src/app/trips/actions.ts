"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

function home(error: string): never {
  redirect("/?error=" + encodeURIComponent(error));
}

export async function deleteTrip(formData: FormData) {
  const tripId = String(formData.get("trip_id") ?? "");
  if (!tripId) home("Missing trip.");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("trips")
    .delete()
    .eq("id", tripId)
    .eq("user_id", user.id); // RLS also enforces this, belt-and-suspenders

  if (error) home(error.message);

  revalidatePath("/");
  redirect("/");
}

export async function joinTrip(formData: FormData) {
  const otherTripId = String(formData.get("trip_id") ?? "");
  if (!otherTripId) home("Missing trip.");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: groupId, error } = await supabase.rpc("join_trip", {
    other_trip_id: otherTripId,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes("Not authenticated")) redirect("/login");
    if (msg.includes("Blocked")) home("You can't join this trip.");
    if (msg.includes("No compatible")) redirect(`/trips/join/${otherTripId}`);
    if (msg.includes("Cannot join your own")) home("You can't join your own trip.");
    if (msg.includes("Trip is closed")) home("That trip is closed.");
    if (msg.includes("Trip not found")) home("That trip no longer exists.");
    if (msg.includes("Group is full")) home("Sorry, that group is already full.");
    home(msg);
  }

  revalidatePath("/");
  redirect(`/groups/${groupId}`);
}

function joinPage(tripId: string, error: string): never {
  redirect(`/trips/join/${tripId}?error=${encodeURIComponent(error)}`);
}

export async function joinTripCreatingMine(formData: FormData) {
  const otherTripId = String(formData.get("trip_id") ?? "");
  const pickupArea = String(formData.get("pickup_area") ?? "").trim();
  if (!otherTripId) home("Missing trip.");
  if (!pickupArea) joinPage(otherTripId, "Pickup area is required.");
  if (pickupArea.length > 100) joinPage(otherTripId, "Pickup area is too long (max 100).");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: groupId, error } = await supabase.rpc("create_trip_and_join", {
    other_trip_id: otherTripId,
    pickup_area: pickupArea,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes("Not authenticated")) redirect("/login");
    if (msg.includes("Blocked")) home("You can't join this trip.");
    if (msg.includes("Cannot join your own")) home("You can't join your own trip.");
    if (msg.includes("Trip is closed")) home("That trip is closed.");
    if (msg.includes("Trip not found")) home("That trip no longer exists.");
    if (msg.includes("Different school")) home("That trip is from a different school.");
    if (msg.includes("Group is full")) home("Sorry, that group is already full.");
    joinPage(otherTripId, msg);
  }

  revalidatePath("/");
  redirect(`/groups/${groupId}`);
}
