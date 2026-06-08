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

export async function rateMember(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const rateeId = String(formData.get("ratee_id") ?? "");
  const score = Number(formData.get("score") ?? 0);

  const back = (msg: string): never =>
    redirect(`/groups/${groupId}?error=` + encodeURIComponent(msg));

  if (!groupId || !rateeId) redirect("/");
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    back("Pick a rating between 1 and 5 stars.");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Upsert so re-rating updates the existing score (RLS enforces eligibility).
  const { error } = await supabase.from("ratings").upsert(
    {
      rater_id: user.id,
      ratee_id: rateeId,
      group_id: groupId,
      score,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "rater_id,ratee_id,group_id" },
  );

  if (error) back(error.message);

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}?message=` + encodeURIComponent("Thanks for rating!"));
}
