import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import NewTripForm from "@/app/trips/new/NewTripForm";
import { updateTrip } from "./actions";

const TZ = "America/New_York";

function splitForForm(iso: string) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const min = parts.find((p) => p.type === "minute")?.value ?? "";
  const period = (parts.find((p) => p.type === "dayPeriod")?.value ?? "").toUpperCase();
  return { date, hour, min, period };
}

export default async function EditTripPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { tripId } = await params;
  const { error } = await searchParams;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trip } = await supabase
    .from("trips")
    .select(
      "id, airport, depart_window_start, depart_window_end, pickup_area, user_id, group_id",
    )
    .eq("id", tripId)
    .maybeSingle();

  if (!trip || trip.user_id !== user.id) notFound();
  if (trip.group_id) {
    redirect(
      "/?error=" +
        encodeURIComponent(
          "That trip is already matched — leave the group to make changes.",
        ),
    );
  }

  const start = splitForForm(trip.depart_window_start);
  const end = splitForForm(trip.depart_window_end);

  const initial = {
    airport: trip.airport,
    date: start.date,
    earliest: { hour: start.hour, min: start.min, period: start.period },
    latest: { hour: end.hour, min: end.min, period: end.period },
    pickup: trip.pickup_area,
  };

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
          <h1 className="text-lg font-semibold">Edit trip</h1>
        </div>
      </header>

      <NewTripForm
        error={error}
        mode="edit"
        tripId={trip.id}
        initial={initial}
        action={updateTrip}
      />
    </main>
  );
}
