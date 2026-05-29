"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function saveProfile(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const next = String(formData.get("next") ?? "/");

  if (!fullName) {
    redirect("/profile/setup?error=" + encodeURIComponent("Name is required."));
  }
  if (fullName.length > 80) {
    redirect(
      "/profile/setup?error=" + encodeURIComponent("Name is too long (max 80 characters)."),
    );
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) {
    redirect("/profile/setup?error=" + encodeURIComponent(error.message));
  }

  redirect(next.startsWith("/") ? next : "/");
}
