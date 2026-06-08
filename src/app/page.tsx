import Link from "next/link";
import { cookies } from "next/headers";
import {
  Plane,
  MapPin,
  Plus,
  ArrowRight,
  Search,
  Pencil,
  Flag,
  Star,
  ShieldCheck,
  Wallet,
  MessageCircle,
  Users,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { joinTrip } from "./trips/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import FeedFilters from "./FeedFilters";
import ShareTripButton from "@/components/ShareTripButton";
import ThemeSwitch from "@/components/ThemeSwitch";
import FlashToast from "@/components/FlashToast";
import DeleteTripButton from "@/components/DeleteTripButton";

const TZ = "America/New_York";

const AIRPORTS = ["BWI", "IAD", "DCA"];

// Calendar date (YYYY-MM-DD) of a timestamp in the app's timezone, so date
// filtering lines up with what users see in the cards.
function etDate(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(
    new Date(iso),
  );
}

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
  rating,
}: {
  trip: TripRow;
  rightSlot?: React.ReactNode;
  badge?: React.ReactNode;
  rating?: { avg: number; count: number };
}) {
  return (
    <Card className="py-0">
      <CardContent className="px-4 py-4">
        <div className="flex items-start gap-3">
          {trip.profiles ? (
            <Link href={`/profile/${trip.user_id}`} className="shrink-0">
              <Avatar size="lg">
                {trip.profiles.avatar_url && (
                  <AvatarImage
                    src={trip.profiles.avatar_url}
                    alt={displayName(trip.profiles)}
                  />
                )}
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials(displayName(trip.profiles))}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Avatar size="lg" className="shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary">
                <Plane className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
          )}
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
                <Link
                  href={`/profile/${trip.user_id}`}
                  className="text-muted-foreground/70 hover:text-primary hover:underline"
                >
                  · @{displayName(trip.profiles)}
                </Link>
              )}
              {rating && (
                <span className="inline-flex items-center gap-0.5 text-muted-foreground/90">
                  · <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {rating.avg.toFixed(1)}
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

function EmptyState({
  icon: Icon,
  children,
}: {
  icon: typeof Plane;
  children: React.ReactNode;
}) {
  return (
    <Card className="py-0">
      <CardContent className="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
        <div className="text-sm text-muted-foreground">{children}</div>
      </CardContent>
    </Card>
  );
}

const STEPS = [
  {
    icon: Plane,
    title: "Post your trip",
    desc: "Tell us your airport, date, and the window you can leave.",
  },
  {
    icon: Users,
    title: "Get matched",
    desc: "We pair you with classmates headed the same way.",
  },
  {
    icon: Wallet,
    title: "Coordinate & split",
    desc: "Chat in-app, agree on a ride, and split the fare.",
  },
];

const PERKS = [
  {
    icon: ShieldCheck,
    title: "Verified students",
    desc: "Everyone signs in with a .edu email.",
    tone: "bg-primary/10 text-primary",
  },
  {
    icon: Wallet,
    title: "Split the cost",
    desc: "Share the fare instead of paying solo.",
    tone: "bg-[#68ACE5]/20 text-[#2b6cb0]",
  },
  {
    icon: MessageCircle,
    title: "Built-in chat",
    desc: "Sort out pickup right in the app.",
    tone: "bg-amber-100 text-amber-700",
  },
  {
    icon: Star,
    title: "Rated buddies",
    desc: "Ride with people others vouch for.",
    tone: "bg-rose-100 text-rose-600",
  },
];

function Landing() {
  return (
    <main className="min-h-dvh pb-12">
      <section className="relative overflow-hidden bg-gradient-to-b from-primary to-[#27508c] px-6 pb-12 pt-16 text-primary-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#68ACE5]/20 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative mx-auto max-w-md space-y-5 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Plane className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Travel Buddy</h1>
          <p className="mx-auto max-w-xs text-lg text-primary-foreground/85">
            Share a ride to the airport with a verified classmate. Split the
            cost, skip the solo Uber.
          </p>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "xl" }),
              "w-full bg-white text-primary shadow-sm hover:bg-white/90",
            )}
          >
            Sign in with your .edu email
          </Link>
          <p className="text-xs text-primary-foreground/70">
            Students only · Free to use
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-md space-y-5 px-6 py-10">
        <h2 className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          How it works
        </h2>
        <ol className="space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-start gap-4">
              <div className="relative flex flex-col items-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="mt-1 h-8 w-px bg-border" aria-hidden />
                )}
              </div>
              <div className="pt-1">
                <p className="flex items-center gap-1.5 font-semibold leading-tight">
                  <s.icon className="h-4 w-4 text-primary" />
                  {s.title}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-md px-6">
        <div className="grid grid-cols-2 gap-3">
          {PERKS.map((p) => (
            <Card key={p.title} className="py-0">
              <CardContent className="space-y-2 px-4 py-4">
                <span
                  className={
                    "flex h-9 w-9 items-center justify-center rounded-lg " +
                    p.tone
                  }
                >
                  <p.icon className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold leading-tight">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-md space-y-4 px-6 text-center">
        <Link
          href="/login"
          className={buttonVariants({ size: "xl", className: "w-full gap-2" })}
        >
          Get started
          <ArrowRight className="h-5 w-5" />
        </Link>
        <p className="text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    airport?: string;
    date?: string;
    area?: string;
  }>;
}) {
  const params = await searchParams;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <Landing />;
  }

  // Filter feed to the current user's school so students only see their own.
  const userSchool = user.email?.split("@")[1] ?? "";

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
  const myGroupIds = new Set(
    myTrips.map((t) => t.group_id).filter((g): g is string => !!g),
  );

  // Filters apply to the discovery feed only; "Your trips" always shows in full.
  const activeAirport = AIRPORTS.includes(params.airport ?? "")
    ? params.airport!
    : "";
  const activeDate = params.date ?? "";
  const activeArea = (params.area ?? "").trim();
  const filtersActive = !!activeAirport || !!activeDate || !!activeArea;

  const otherTrips = all
    .filter((t) => t.user_id !== user.id)
    .filter((t) => !activeAirport || t.airport === activeAirport)
    .filter((t) => !activeDate || etDate(t.depart_window_start) === activeDate)
    .filter(
      (t) =>
        !activeArea ||
        t.pickup_area.toLowerCase().includes(activeArea.toLowerCase()),
    );

  // Reputation summaries for the people shown in the discovery feed.
  const otherUserIds = [...new Set(otherTrips.map((t) => t.user_id))];
  const ratingByUser = new Map<string, { avg: number; count: number }>();
  if (otherUserIds.length > 0) {
    const { data: rs } = await supabase
      .from("profile_ratings")
      .select("user_id, avg_score, rating_count")
      .in("user_id", otherUserIds);
    for (const s of rs ?? []) {
      ratingByUser.set(s.user_id as string, {
        avg: Number(s.avg_score),
        count: s.rating_count as number,
      });
    }
  }

  const todayEt = etDate(new Date().toISOString());

  // Past rides the user was matched into — surfaced so they can rate buddies.
  const { data: pastData } = await supabase
    .from("trips")
    .select("id, airport, depart_window_start, depart_window_end, group_id")
    .eq("user_id", user.id)
    .not("group_id", "is", null)
    .lt("depart_window_end", new Date().toISOString())
    .order("depart_window_end", { ascending: false })
    .limit(20);

  const seenPastGroups = new Set<string>();
  const pastRides = (pastData ?? []).filter((t) => {
    const g = t.group_id as string | null;
    if (!g || seenPastGroups.has(g)) return false;
    seenPastGroups.add(g);
    return true;
  });

  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Plane className="h-4 w-4" />
            </div>
            <span className="font-semibold">Travel Buddy</span>
          </div>
          <ThemeSwitch />
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-6 space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Your rides</h1>
          <p className="text-sm text-muted-foreground">
            Find a classmate headed to the airport.
          </p>
        </div>

        <FlashToast message={params.message} error={params.error} />

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your trips
          </h2>
          {myTrips.length === 0 ? (
            <EmptyState icon={Plane}>
              You haven&apos;t posted any trips yet.
              <br />
              Tap{" "}
              <span className="inline-flex items-center gap-1 font-medium text-primary">
                <Plus className="h-3.5 w-3.5" />
                Post a trip
              </span>{" "}
              to find a buddy.
            </EmptyState>
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
                      {t.group_id ? (
                        <Link
                          href={`/groups/${t.group_id}`}
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                        >
                          View <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <>
                          <ShareTripButton
                            tripId={t.id}
                            airport={t.airport}
                            date={formatDate(t.depart_window_start)}
                          />
                          <Link
                            href={`/trips/${t.id}/edit`}
                            aria-label="Edit trip"
                            title="Edit trip"
                            className={buttonVariants({
                              variant: "ghost",
                              size: "icon-sm",
                              className: "text-muted-foreground hover:text-foreground",
                            })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </>
                      )}
                      <DeleteTripButton tripId={t.id} />
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
          <FeedFilters
            airport={activeAirport}
            date={activeDate}
            area={activeArea}
            minDate={todayEt}
          />
          {otherTrips.length === 0 ? (
            <EmptyState icon={filtersActive ? Search : Users}>
              {filtersActive
                ? "No trips match your filters. Try clearing them."
                : "No other trips right now. Tell a friend!"}
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {otherTrips.map((t) => {
                const sharedGroup = !!t.group_id && myGroupIds.has(t.group_id);
                return (
                  <TripCard
                    key={t.id}
                    trip={t}
                    rating={ratingByUser.get(t.user_id)}
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

        {pastRides.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Past rides
            </h2>
            <div className="space-y-3">
              {pastRides.map((t) => (
                <Card key={t.id} className="py-0">
                  <CardContent className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Plane className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight">
                        {t.airport} · {formatDate(t.depart_window_start)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Rate the buddies you rode with
                      </p>
                    </div>
                    <Link
                      href={`/groups/${t.group_id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <Star className="h-3.5 w-3.5" />
                      Rate
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
