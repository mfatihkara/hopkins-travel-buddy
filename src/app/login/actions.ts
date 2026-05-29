"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

function isEduEmail(email: string): boolean {
  const domain = email.split("@")[1] ?? "";
  return domain.endsWith(".edu");
}

async function originUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

// ---------------------------------------------------------------------------
// Password sign-up (first time)
// ---------------------------------------------------------------------------
export async function signUpWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!isEduEmail(email)) {
    redirect(
      "/login?error=" +
        encodeURIComponent("Only .edu email addresses are allowed."),
    );
  }
  if (password.length < 8) {
    redirect(
      "/login?mode=signup&error=" +
        encodeURIComponent("Password must be at least 8 characters."),
    );
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const origin = await originUrl();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect("/login?mode=signup&error=" + encodeURIComponent(error.message));
  }

  redirect(
    "/login?message=" +
      encodeURIComponent(
        `Check ${email} for a confirmation link. Once confirmed, you can sign in with your password.`,
      ),
  );
}

// ---------------------------------------------------------------------------
// Password sign-in (returning users)
// ---------------------------------------------------------------------------
export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!isEduEmail(email)) {
    redirect(
      "/login?error=" +
        encodeURIComponent("Only .edu email addresses are allowed."),
    );
  }
  if (!password) {
    redirect("/login?error=" + encodeURIComponent("Enter your password."));
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect("/");
}

// ---------------------------------------------------------------------------
// Magic-link fallback (forgot password / first-time alt path)
// ---------------------------------------------------------------------------
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
  const origin = await originUrl();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect(
    "/login?message=" +
      encodeURIComponent(`Check ${email} for a magic link.`),
  );
}
