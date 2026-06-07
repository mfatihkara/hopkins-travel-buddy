import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, Plane, Calendar, Clock, MapPin } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { joinTripCreatingMine } from "../../actions";

const TZ = "America/New_York";

function formatWindow(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: TZ,
  });
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  });
  return {
    date: dateFmt.format(s),
    range: `${timeFmt.format(s)} – ${timeFmt.format(e)}`,
  };
}

function displayName(profile: { email: string; full_name: string | null } | null) {
  if (!profile) return "this student";
  return profile.full_name ?? profile.email.split("@")[0];
}

export default async function JoinTripPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { tripId } = await params;
  const search = await searchParams;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trip } = await supabase
    .from("trips")
    .select(
      "id, airport, depart_window_start, depart_window_end, pickup_area, status, profiles ( email, full_name )",
    )
    .eq("id", tripId)
    .maybeSingle();

  if (!trip) notFound();

  const { date, range } = formatWindow(trip.depart_window_start, trip.depart_window_end);
  const profile = trip.profiles as unknown as { email: string; full_name: string | null } | null;

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
          <h1 className="text-lg font-semibold">Join this trip</h1>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-6 space-y-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        <Card className="py-0">
          <CardContent className="px-4 py-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Plane className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold leading-tight">
                  {trip.airport} · {date}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {range}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{trip.pickup_area}</span>
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Posted by {displayName(profile)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          You haven&apos;t posted a matching trip yet. Tell us your pickup area
          and we&apos;ll set up a ride request for you with the same airport
          and time window, then add you to the group.
        </p>

        <form action={joinTripCreatingMine} className="space-y-4">
          <input type="hidden" name="trip_id" value={trip.id} />
          <Card className="py-0">
            <CardContent className="px-4 py-5 space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Your pickup area
              </Label>
              <Input
                type="text"
                name="pickup_area"
                required
                maxLength={100}
                placeholder="Charles Village, Bloomberg…"
                className="h-11"
              />
            </CardContent>
          </Card>

          {search.error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
              {search.error}
            </div>
          )}

          <Button type="submit" size="xl" className="w-full gap-2">
            <Calendar className="h-4 w-4" />
            Confirm &amp; join
          </Button>
        </form>
      </div>
    </main>
  );
}
