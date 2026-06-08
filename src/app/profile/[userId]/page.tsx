import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  ArrowLeft,
  Calendar,
  Flag,
  Plane,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function memberSince(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(d);
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Plane;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-muted/40 px-3 py-3 text-center">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (userId === user.id) redirect("/profile/edit");

  const { data: blockedRows } = await supabase.rpc("blocked_with_me");
  const blockedIds = ((blockedRows as string[] | null) ?? []).filter(Boolean);
  if (blockedIds.includes(userId)) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, school, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) notFound();

  // Only show profiles from the viewer's own school — matches the feed scope.
  const userSchool = user.email?.split("@")[1] ?? "";
  if (profile.school !== userSchool) notFound();

  const name = profile.full_name ?? profile.email?.split("@")[0] ?? "Student";
  const since = memberSince(profile.created_at);

  const [{ data: ratingRow }, { count: postedCount }, { count: completedCount }] =
    await Promise.all([
      supabase
        .from("profile_ratings")
        .select("avg_score, rating_count")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("group_id", "is", null)
        .lt("depart_window_end", new Date().toISOString()),
    ]);

  const rating = ratingRow
    ? { avg: Number(ratingRow.avg_score), count: ratingRow.rating_count as number }
    : null;

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
          <h1 className="text-lg font-semibold">Profile</h1>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-6 space-y-5 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        <Card className="overflow-hidden py-0">
          <div className="h-16 w-full bg-gradient-to-r from-primary via-[#3f6fb0] to-[#68ACE5]" />
          <CardContent className="px-5 pb-5 pt-0">
            <div className="-mt-8 flex items-end gap-4">
              <Avatar
                size="lg"
                className="size-20 shrink-0 ring-4 ring-background"
              >
                {profile.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={name} />
                )}
                <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="mt-3 space-y-1.5">
              <h2 className="text-xl font-bold leading-tight">{name}</h2>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className="gap-1 bg-primary/10 text-primary ring-1 ring-primary/20"
                >
                  <ShieldCheck className="h-3 w-3" />
                  Verified · {profile.school}
                </Badge>
                {rating && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {rating.avg.toFixed(1)}
                    <span className="text-muted-foreground/80">
                      ({rating.count})
                    </span>
                  </Badge>
                )}
              </div>
              {since && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Member since {since}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <StatTile icon={Plane} label="Trips posted" value={postedCount ?? 0} />
          <StatTile
            icon={Users}
            label="Rides matched"
            value={completedCount ?? 0}
          />
          <StatTile
            icon={Star}
            label="Ratings"
            value={rating?.count ?? 0}
          />
        </div>

        {!rating && (
          <p className="px-1 text-center text-sm text-muted-foreground">
            {name.split(" ")[0]} hasn&apos;t been rated yet — be the first
            after your ride!
          </p>
        )}

        <Link
          href={`/report/${profile.id}?from=${encodeURIComponent(`/profile/${profile.id}`)}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "w-full gap-2 text-muted-foreground hover:text-destructive",
          )}
        >
          <Flag className="h-4 w-4" />
          Report or block {name.split(" ")[0]}
        </Link>
      </div>
    </main>
  );
}
