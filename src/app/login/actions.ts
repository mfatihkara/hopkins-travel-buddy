"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

function isEduEmail(email: string): boolean {
  const domain = email.split("@")[1] ?? "";
  // Accept any .edu domain
  return domain.endsWith(".edu");
}

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!isEduEmail(email)) {
    redirect(
      "/login?error=" +
        encodeURIComponent("Only .edu email addresses are allowed."),
    );
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect(
    "/login?message=" +
      encodeURIComponent(`Check ${email} for a magic link.`),
  );
}
