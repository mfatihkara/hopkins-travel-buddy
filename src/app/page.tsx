import Link from "next/link";
import { cookies } from "next/headers";
import { Plane, MapPin, Plus, ArrowRight, LogOut, Search, Trash2, Flag } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { joinTrip, deleteTrip } from "./trips/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const TZ = "America/New_York";

function formatDate(start: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: TZ,
  }).format(new Date(start));
}

function formatTimeRange(start: string, end: string) {
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  });
  return `${timeFmt.format(new Date(start))} – ${timeFmt.format(new Date(end))}`;
}

type TripRow = {
  id: string;
  airport: string;
  depart_window_start: string;
  depart_window_end: string;
  pickup_area: string;
  status: string;
  group_id: string | null;
  user_id: string;
  profiles: { email: string; full_name: string | null; avatar_url: string | null } | null;
};

function displayName(profile: TripRow["profiles"]) {
  if (!profile) return "Anonymous";
  return profile.full_name ?? profile.email.split("@")[0];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function TripCard({
  trip,
  rightSlot,
  badge,
}: {
  trip: TripRow;
  rightSlot?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <Card className="py-0">
      <CardContent className="px-4 py-4">
        <div className="flex items-start gap-3">
          <Avatar size="lg" className="shrink-0">
            {trip.profiles?.avatar_url && (
              <AvatarImage src={trip.profiles.avatar_url} alt={displayName(trip.profiles)} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary">
              {trip.profiles ? (
                initials(displayName(trip.profiles))
              ) : (
                <Plane className="h-5 w-5" />
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold leading-tight">
                {trip.airport} · {formatDate(trip.depart_window_start)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatTimeRange(trip.depart_window_start, trip.depart_window_end)}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{trip.pickup_area}</span>
              {trip.profiles && (
                <span className="text-muted-foreground/70">
                  · @{displayName(trip.profiles)}
                </span>
              )}
            </p>
            {badge && <div className="mt-2">{badge}</div>}
          </div>
          {rightSlot && <div className="shrink-0">{rightSlot}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Plane className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Travel Buddy
            </h1>
            <p className="text-muted-foreground">
              Find a classmate at your school to share a ride to the airport.
            </p>
          </div>
          <Link
            href="/login"
            className={buttonVariants({ size: "xl", className: "w-full" })}
          >
            Sign in with your .edu email
          </Link>
        </div>
      </main>
    );
  }

  // Filter feed to the current user's school so students only see their own.
  const userSchool = user.email?.split("@")[1] ?? "";

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  // User ids in a block relationship with me (either direction) — their trips
  // are hidden from my feed and mine from theirs.
  const { data: blockedRows } = await supabase.rpc("blocked_with_me");
  const blockedIds = ((blockedRows as string[] | null) ?? []).filter(Boolean);

  let query = supabase
    .from("trips")
    .select(
      "id, airport, depart_window_start, depart_window_end, pickup_area, status, group_id, user_id, profiles ( email, full_name, avatar_url )",
    )
    .eq("school", userSchool)
    .neq("status", "closed")
    .gte("depart_window_start", new Date().toISOString());

  if (blockedIds.length > 0) {
    query = query.not("user_id", "in", `(${blockedIds.join(",")})`);
  }

  const { data } = await query
    .order("depart_window_start", { ascending: true })
    .limit(100);

  const all = (data ?? []) as unknown as TripRow[];
  const myTrips = all.filter((t) => t.user_id === user.id);
  const otherTrips = all.filter((t) => t.user_id !== user.id);
  const myGroupIds = new Set(
    myTrips.map((t) => t.group_id).filter((g): g is string => !!g),
  );

  return (
    <main className="min-h-dvh pb-28">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Plane className="h-4 w-4" />
            </div>
            <span className="font-semibold">Travel Buddy</span>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/profile/edit" aria-label="Edit profile">
              <Avatar size="sm">
                {myProfile?.avatar_url && (
                  <AvatarImage src={myProfile.avatar_url} alt={myProfile.full_name ?? "You"} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials(myProfile?.full_name ?? user.email?.split("@")[0] ?? "?")}
                </AvatarFallback>
              </Avatar>
            </Link>
            <form action="/auth/sign-out" method="post">
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-6 space-y-8">
        {params.message && (
          <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 ring-1 ring-green-200">
            {params.message}
          </div>
        )}
        {params.error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
            {params.error}
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your trips
          </h2>
          {myTrips.length === 0 ? (
            <Card className="py-0">
              <CardContent className="px-4 py-8 text-center text-sm text-muted-foreground">
                You haven&apos;t posted any trips yet.
                <br />
                Tap{" "}
                <span className="inline-flex items-center gap-1 font-medium text-primary">
                  <Plus className="h-3.5 w-3.5" />
                  Post a trip
                </span>{" "}
                to find a buddy.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myTrips.map((t) => (
                <TripCard
                  key={t.id}
                  trip={{ ...t, profiles: null }}
                  badge={
                    t.group_id ? (
                      <Badge variant="default" className="gap-1">
                        Matched
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-amber-100 text-amber-900 ring-amber-200 ring-1"
                      >
                        <Search className="h-3 w-3" />
                        Looking
                      </Badge>
                    )
                  }
                  rightSlot={
                    <div className="flex items-center gap-2">
                      {t.group_id && (
                        <Link
                          href={`/groups/${t.group_id}`}
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                        >
                          View <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                      <form action={deleteTrip}>
                        <input type="hidden" name="trip_id" value={t.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete trip"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Other students
          </h2>
          {otherTrips.length === 0 ? (
            <Card className="py-0">
              <CardContent className="px-4 py-8 text-center text-sm text-muted-foreground">
                No other trips right now. Tell a friend!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {otherTrips.map((t) => {
                const sharedGroup = !!t.group_id && myGroupIds.has(t.group_id);
                return (
                  <TripCard
                    key={t.id}
                    trip={t}
                    badge={
                      sharedGroup ? (
                        <Badge className="bg-primary/15 text-primary ring-primary/20 ring-1">
                          In your group
                        </Badge>
                      ) : t.status === "matched" ? (
                        <Badge
                          variant="secondary"
                          className="bg-muted text-muted-foreground"
                        >
                          Matched
                        </Badge>
                      ) : null
                    }
                    rightSlot={
                      <div className="flex items-center gap-1.5">
                        {sharedGroup ? (
                          <Link
                            href={`/groups/${t.group_id}`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            View <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <form action={joinTrip}>
                            <input type="hidden" name="trip_id" value={t.id} />
                            <Button type="submit" size="sm">
                              Join
                            </Button>
                          </form>
                        )}
                        <Link
                          href={`/report/${t.user_id}?from=${encodeURIComponent("/")}`}
                          aria-label="Report or block"
                          title="Report or block"
                          className={buttonVariants({
                            variant: "ghost",
                            size: "icon-sm",
                            className:
                              "text-muted-foreground hover:text-destructive",
                          })}
                        >
                          <Flag className="h-4 w-4" />
                        </Link>
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <Link
            href="/trips/new"
            className={buttonVariants({
              size: "xl",
              className: "w-full gap-2",
            })}
          >
            <Plus className="h-5 w-5" />
            Post a trip
          </Link>
        </div>
      </div>
    </main>
  );
}
