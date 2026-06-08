import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import NewTripForm from "./NewTripForm";

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">
          <Link
            href="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">Post a trip</h1>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 pt-6">
        <div className="rounded-2xl bg-gradient-to-br from-primary to-[#3f6fb0] px-5 py-5 text-primary-foreground shadow-sm">
          <h2 className="text-xl font-bold leading-tight">
            Find your ride buddy
          </h2>
          <p className="mt-1 text-sm text-primary-foreground/80">
            Post where and when you&apos;re headed — we&apos;ll match you with
            classmates going the same way.
          </p>
        </div>
      </div>

      <NewTripForm error={params.error} />
    </main>
  );
}
