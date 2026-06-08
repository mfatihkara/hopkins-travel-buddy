"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

const REASONS = ["harassment", "unsafe", "spam", "no_show", "other"] as const;
type Reason = (typeof REASONS)[number];

function safeRedirect(target: string): string {
  // Only allow same-app relative paths so the redirect param can't be abused.
  return target.startsWith("/") && !target.startsWith("//") ? target : "/";
}

function withParam(path: string, key: string, value: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

/**
 * Remove the caller from any group they currently share with `otherId`, setting
 * their own trips back to open. Used when blocking someone you're matched with
 * so you're never stuck in a ride together.
 */
async function leaveSharedGroups(
  supabase: ReturnType<typeof createClient>,
  myId: string,
  otherId: string,
) {
  const { data: theirGroups } = await supabase
    .from("trips")
    .select("group_id")
    .eq("user_id", otherId)
    .not("group_id", "is", null);

  const groupIds = [
    ...new Set(
      (theirGroups ?? [])
        .map((r) => r.group_id as string | null)
        .filter((g): g is string => !!g),
    ),
  ];

  if (groupIds.length > 0) {
    await supabase
      .from("trips")
      .update({ group_id: null, status: "open" })
      .eq("user_id", myId)
      .in("group_id", groupIds);
  }
}

export async function blockUser(formData: FormData) {
  const blockedId = String(formData.get("blocked_id") ?? "");
  const back = safeRedirect(String(formData.get("redirect_to") ?? "/"));
  if (!blockedId) redirect("/");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (blockedId === user.id) redirect(back);

  const { error } = await supabase
    .from("blocks")
    .upsert(
      { blocker_id: user.id, blocked_id: blockedId },
      { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
    );
  if (error) redirect(withParam(back, "error", error.message));

  await leaveSharedGroups(supabase, user.id, blockedId);

  revalidatePath("/", "layout");
  redirect(
    withParam(
      "/",
      "message",
      "You've blocked this person. You won't be matched again.",
    ),
  );
}

export async function unblockUser(formData: FormData) {
  const blockedId = String(formData.get("blocked_id") ?? "");
  const back = safeRedirect(String(formData.get("redirect_to") ?? "/profile/edit"));
  if (!blockedId) redirect(back);

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId);
  if (error) redirect(withParam(back, "error", error.message));

  revalidatePath("/", "layout");
  redirect(withParam(back, "message", "Unblocked."));
}

export async function reportUser(formData: FormData) {
  const reportedId = String(formData.get("reported_id") ?? "");
  const reason = String(formData.get("reason") ?? "") as Reason;
  const details = String(formData.get("details") ?? "").trim();
  const alsoBlock = formData.get("also_block") != null;
  const from = safeRedirect(String(formData.get("redirect_to") ?? "/"));

  const reportPage = `/report/${reportedId}`;
  if (!reportedId) redirect("/");
  if (!REASONS.includes(reason)) {
    redirect(withParam(reportPage, "error", "Please choose a reason."));
  }
  if (details.length > 1000) {
    redirect(withParam(reportPage, "error", "Details are too long (max 1000)."));
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (reportedId === user.id) redirect("/");

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reported_id: reportedId,
    reason,
    details: details || null,
  });
  if (error) redirect(withParam(reportPage, "error", error.message));

  if (alsoBlock) {
    await supabase
      .from("blocks")
      .upsert(
        { blocker_id: user.id, blocked_id: reportedId },
        { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
      );
    await leaveSharedGroups(supabase, user.id, reportedId);
  }

  revalidatePath("/", "layout");
  redirect(
    withParam(
      from,
      "message",
      alsoBlock
        ? "Thanks for the report — we'll review it. This person has also been blocked."
        : "Thanks for the report — our team will review it.",
    ),
  );
}
