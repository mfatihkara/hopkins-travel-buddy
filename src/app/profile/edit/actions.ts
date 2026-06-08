"use server";

import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

const PHONE_RE = /^\+?[0-9()\-.\s]{7,20}$/;

function back(error: string): never {
  redirect("/profile/edit?error=" + encodeURIComponent(error));
}

export async function updateProfile(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone_number") ?? "").trim();
  const avatar = formData.get("avatar");

  if (!fullName) back("Name is required.");
  if (fullName.length > 80) back("Name is too long (max 80 characters).");
  if (phone && !PHONE_RE.test(phone)) back("Enter a valid phone number.");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const updates: Record<string, string | boolean | null> = {
    full_name: fullName,
    phone_number: phone || null,
    // Unchecked checkboxes are absent from FormData, so absence means "off".
    notify_match: formData.get("notify_match") != null,
    notify_message: formData.get("notify_message") != null,
    notify_reminder: formData.get("notify_reminder") != null,
  };

  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith("image/")) back("Avatar must be an image.");
    if (avatar.size > 5 * 1024 * 1024) back("Avatar must be smaller than 5MB.");

    const ext = avatar.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar.${ext}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatar, { upsert: true, contentType: avatar.type });
      if (uploadError) back(uploadError.message);
    } catch (e) {
      // Let redirect()'s internal control-flow signal pass through untouched;
      // only genuine network/runtime failures should fall through to back().
      unstable_rethrow(e);
      back("Couldn't upload your photo. Check your connection and try again.");
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust so the new image shows immediately even though the path is reused.
    updates.avatar_url = `${pub.publicUrl}?v=${Date.now()}`;
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) back(error.message);

  revalidatePath("/", "layout");
  redirect("/?message=" + encodeURIComponent("Profile updated."));
}
