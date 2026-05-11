"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

const AIRPORTS = ["BWI", "IAD", "DCA"] as const;
type Airport = (typeof AIRPORTS)[number];

function back(error: string): never {
  redirect("/trips/new?error=" + encodeURIComponent(error));
}

function parseTimeFields(prefix: string, formData: FormData): string | null {
  const hour = Number(formData.get(`${prefix}_hour`));
  const min = String(formData.get(`${prefix}_min`) ?? "");
  const period = String(formData.get(`${prefix}_period`) ?? "");
  if (!hour || hour < 1 || hour > 12) return null;
  if (!/^\d{2}$/.test(min)) return null;
  if (period !== "AM" && period !== "PM") return null;

  let h24 = hour;
  if (period === "AM") h24 = hour === 12 ? 0 : hour;
  if (period === "PM") h24 = hour === 12 ? 12 : hour + 12;

  return `${String(h24).padStart(2, "0")}:${min}`;
}

export async function postTrip(formData: FormData) {
  const airport = String(formData.get("airport") ?? "");
  const date = String(formData.get("date") ?? "");
  const startHHMM = parseTimeFields("time_earliest", formData);
  const endHHMM = parseTimeFields("time_latest", formData);
  const pickupArea = String(formData.get("pickup_area") ?? "").trim();

  if (!AIRPORTS.includes(airport as Airport)) back("Pick an airport.");
  if (!date) back("Pick a date.");
  if (!startHHMM || !endHHMM) back("Pick a valid time window.");
  if (!pickupArea) back("Pickup area is required.");
  if (pickupArea.length > 100) back("Pickup area is too long (max 100).");

  const start = new Date(`${date}T${startHHMM}`);
  const end = new Date(`${date}T${endHHMM}`);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    back("Invalid date or time.");
  }
  if (end <= start) back("Latest time must be after earliest.");
  if (start < now) back("Pick a future time.");
  if (end.getTime() - start.getTime() > 8 * 60 * 60 * 1000) {
    back("Window can't span more than 8 hours.");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("trips").insert({
    user_id: user.id,
    airport,
    depart_window_start: start.toISOString(),
    depart_window_end: end.toISOString(),
    pickup_area: pickupArea,
  });

  if (error) back(error.message);

  revalidatePath("/");
  redirect("/");
}
