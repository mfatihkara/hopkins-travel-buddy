import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

function icsTimestamp(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// RFC 5545 text escaping — backslash first, then commas/semicolons, then newlines.
function icsText(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/[,;]/g, (m) => `\\${m}`)
    .replace(/\n/g, "\\n");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Only the rider's own trip in this group — that's the window that matters
  // for their calendar, and it doubles as the membership check (RLS-backed).
  const { data: trip } = await supabase
    .from("trips")
    .select("id, airport, depart_window_start, depart_window_end, pickup_area")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!trip) {
    return new NextResponse("Not found", { status: 404 });
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hopkins Travel Buddy//Ride//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${trip.id}@hopkins-travel-buddy`,
    `DTSTAMP:${icsTimestamp(new Date().toISOString())}`,
    `DTSTART:${icsTimestamp(trip.depart_window_start)}`,
    `DTEND:${icsTimestamp(trip.depart_window_end)}`,
    `SUMMARY:${icsText(`Ride to ${trip.airport}`)}`,
    `LOCATION:${icsText(trip.pickup_area)}`,
    `DESCRIPTION:${icsText(
      `Pickup: ${trip.pickup_area}\nCoordinate pickup details with your ride buddies in Travel Buddy.`,
    )}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="ride-to-${trip.airport.toLowerCase()}.ics"`,
    },
  });
}
