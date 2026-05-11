import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, Plane, Calendar, Clock, MapPin } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { postTrip } from "./actions";

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/40";

function TimePicker({ name }: { name: string }) {
  return (
    <div className="flex gap-2">
      <select
        name={`${name}_hour`}
        required
        defaultValue=""
        className={selectClass}
        aria-label="Hour"
      >
        <option value="" disabled>
          Hr
        </option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <select
        name={`${name}_min`}
        required
        defaultValue=""
        className={selectClass}
        aria-label="Minute"
      >
        <option value="" disabled>
          Min
        </option>
        {["00", "15", "30", "45"].map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <select
        name={`${name}_period`}
        required
        defaultValue=""
        className={selectClass}
        aria-label="AM or PM"
      >
        <option value="" disabled>
          —
        </option>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

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

      <form
        action={postTrip}
        className="mx-auto max-w-md px-4 py-6 space-y-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]"
      >
        <Card className="py-0">
          <CardContent className="px-4 py-5 space-y-5">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Plane className="h-4 w-4 text-muted-foreground" />
                Airport
              </Label>
              <select
                name="airport"
                required
                defaultValue=""
                className={selectClass}
              >
                <option value="" disabled>
                  Select airport
                </option>
                <option value="BWI">BWI — Baltimore</option>
                <option value="IAD">IAD — Dulles</option>
                <option value="DCA">DCA — Reagan</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date
              </Label>
              <Input type="date" name="date" required className="h-11" />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Leave between
              </Label>
              <TimePicker name="time_earliest" />
            </div>

            <div className="space-y-1.5">
              <Label>…and</Label>
              <TimePicker name="time_latest" />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Pickup area
              </Label>
              <Input
                type="text"
                name="pickup_area"
                required
                maxLength={100}
                placeholder="Charles Village, Bloomberg…"
                className="h-11"
              />
            </div>
          </CardContent>
        </Card>

        {params.error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
            {params.error}
          </div>
        )}

        <Button type="submit" size="xl" className="w-full">
          Post trip
        </Button>
      </form>
    </main>
  );
}
