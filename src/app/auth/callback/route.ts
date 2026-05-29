import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

function isEduEmail(email: string): boolean {
  const domain = email.split("@")[1] ?? "";
  return domain.endsWith(".edu");
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Missing auth code.")}`,
    );
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        error?.message ?? "Auth failed.",
      )}`,
    );
  }

  if (!isEduEmail(data.user.email ?? "")) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        "Only .edu email addresses are allowed.",
      )}`,
    );
  }

  // If the user hasn't set their name yet, send them to the setup page first.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", data.user.id)
    .single();

  if (!profile?.full_name) {
    const destination = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
    return NextResponse.redirect(`${origin}/profile/setup${destination}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
