import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

const ALLOWED_DOMAINS = ["jhu.edu", "jh.edu"];

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

  const domain = data.user.email?.split("@")[1];
  if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        "Only @jhu.edu and @jh.edu emails are allowed.",
      )}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
