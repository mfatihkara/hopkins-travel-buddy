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
    if (msg.includes("No compatible")) {
      redirect(
        "/trips/new?error=" +
          encodeURIComponent(
            "Post a trip with the same airport and an overlapping time window first.",
          ),
      );
    }
    if (msg.includes("Cannot join your own")) home("You can't join your own trip.");
    if (msg.includes("Trip is closed")) home("That trip is closed.");
    if (msg.includes("Trip not found")) home("That trip no longer exists.");
    home(msg);
  }

  revalidatePath("/");
  redirect(`/groups/${groupId}`);
}
