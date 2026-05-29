"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function leaveGroup(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  if (!groupId) redirect("/");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Set the user's trip(s) in this group back to open and detach from group.
  const { error } = await supabase
    .from("trips")
    .update({ group_id: null, status: "open" })
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  if (error) {
    redirect("/?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/");
  redirect("/?message=" + encodeURIComponent("You've left the group."));
}
