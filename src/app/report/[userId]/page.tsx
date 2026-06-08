import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { reportUser } from "@/app/safety/actions";

const REASONS: { value: string; label: string; hint: string }[] = [
  {
    value: "unsafe",
    label: "Unsafe or dangerous",
    hint: "Reckless driving, threats, anything that made you feel unsafe.",
  },
  {
    value: "harassment",
    label: "Harassment or inappropriate behavior",
    hint: "Hateful, sexual, or abusive messages or conduct.",
  },
  {
    value: "no_show",
    label: "No-show or unreliable",
    hint: "Didn't show up or backed out of the trip.",
  },
  { value: "spam", label: "Spam or scam", hint: "Fake trips, ads, or scams." },
  { value: "other", label: "Something else", hint: "Tell us what happened below." },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function safeFrom(from: string | undefined): string {
  return from && from.startsWith("/") && !from.startsWith("//") ? from : "/";
}

export default async function ReportUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { userId } = await params;
  const { from, error } = await searchParams;
  const backHref = safeFrom(from);

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (userId === user.id) redirect("/");

  const { data: reported } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (!reported) notFound();

  const name = reported.full_name ?? reported.email?.split("@")[0] ?? "this person";

  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">
          <Link
            href={backHref}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">Report</h1>
        </div>
      </header>

      <form
        action={reportUser}
        className="mx-auto max-w-md px-4 py-6 space-y-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]"
      >
        <input type="hidden" name="reported_id" value={reported.id} />
        <input type="hidden" name="redirect_to" value={backHref} />

        <Card className="py-0">
          <CardContent className="px-4 py-5 space-y-5">
            <div className="flex items-center gap-3">
              <Avatar size="lg" className="shrink-0">
                {reported.avatar_url && (
                  <AvatarImage src={reported.avatar_url} alt={name} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium leading-tight truncate">{name}</p>
                <p className="text-xs text-muted-foreground">
                  Reports are confidential. {name.split(" ")[0]} won&apos;t be
                  told who reported them.
                </p>
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium mb-1">
                What&apos;s going on?
              </legend>
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    required
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-tight">
                      {r.label}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {r.hint}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor="details">Details (optional)</Label>
              <Textarea
                id="details"
                name="details"
                maxLength={1000}
                placeholder="Add anything that helps us understand what happened."
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
              <input
                type="checkbox"
                name="also_block"
                defaultChecked
                className="mt-0.5 size-4 accent-primary"
              />
              <span className="text-sm">
                Also block {name.split(" ")[0]}
                <span className="block text-xs text-muted-foreground mt-0.5">
                  You won&apos;t see each other&apos;s trips or be matched again.
                </span>
              </span>
            </label>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <Button type="submit" variant="destructive" size="xl" className="w-full gap-2">
          <ShieldAlert className="h-5 w-5" />
          Submit report
        </Button>
      </form>
    </main>
  );
}
