"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { parseTripFields } from "../../tripValidation";

function back(tripId: string, error: string): never {
  redirect(`/trips/${tripId}/edit?error=` + encodeURIComponent(error));
}

export async function updateTrip(formData: FormData) {
  const tripId = String(formData.get("trip_id") ?? "");
  if (!tripId) redirect("/?error=" + encodeURIComponent("Missing trip."));

  const fields = parseTripFields(formData);
  if ("error" in fields) back(tripId, fields.error);
  const { airport, start, end, pickupArea } = fields;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Only the owner can edit, and only before the trip has been matched —
  // changing the details of a live group could pull the rug out from buddies.
  const { data, error } = await supabase
    .from("trips")
    .update({
      airport,
      depart_window_start: start.toISOString(),
      depart_window_end: end.toISOString(),
      pickup_area: pickupArea,
    })
    .eq("id", tripId)
    .eq("user_id", user.id)
    .is("group_id", null)
    .select("id");

  if (error) back(tripId, error.message);
  if (!data || data.length === 0) {
    back(tripId, "This trip can no longer be edited — it may have already been matched.");
  }

  revalidatePath("/");
  redirect("/?message=" + encodeURIComponent("Changes saved."));
}
