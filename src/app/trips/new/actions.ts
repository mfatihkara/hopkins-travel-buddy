"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { parseTripFields } from "../tripValidation";

function back(error: string): never {
  redirect("/trips/new?error=" + encodeURIComponent(error));
}

export async function postTrip(formData: FormData) {
  const fields = parseTripFields(formData);
  if ("error" in fields) back(fields.error);
  const { airport, start, end, pickupArea } = fields;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const school = user.email?.split("@")[1] ?? "";

  const { error } = await supabase.from("trips").insert({
    user_id: user.id,
    airport,
    school,
    depart_window_start: start.toISOString(),
    depart_window_end: end.toISOString(),
    pickup_area: pickupArea,
  });

  if (error) back(error.message);

  revalidatePath("/");
  redirect("/");
}
