import { unstable_cache } from "next/cache";

// Airport terminal coordinates.
const AIRPORT_COORDS: Record<string, { lat: number; lng: number }> = {
  BWI: { lat: 39.1754, lng: -76.6684 },
  DCA: { lat: 38.8521, lng: -77.0377 },
  IAD: { lat: 38.9531, lng: -77.4565 },
};

// JHU Homewood campus — fallback when pickup area can't be geocoded.
const JHU_FALLBACK = { lat: 39.3299, lng: -76.6205 };

export type UberProduct = {
  display_name: string;
  low_cents: number;
  high_cents: number;
  duration_min: number;
};

// Exchange client credentials for an OAuth Bearer token.
// Cached for 23 hours; the token TTL is 30 days so this is very conservative.
const getAccessToken = unstable_cache(
  async (): Promise<string | null> => {
    const clientId = process.env.UBER_CLIENT_ID;
    const clientSecret = process.env.UBER_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    try {
      const res = await fetch("https://auth.uber.com/oauth/v2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = await res.json();
      return (data.access_token as string) ?? null;
    } catch {
      return null;
    }
  },
  ["uber-access-token"],
  { revalidate: 82800 }, // 23 h
);

async function geocode(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${address}, Baltimore, MD`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "TravelBuddyApp/1.0 (contact@jointravelbuddy.com)",
        },
        next: { revalidate: 86400 },
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.length) return null;
    return { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) };
  } catch {
    return null;
  }
}

/**
 * Returns live Uber price estimates for a pickup area → airport route.
 * Requires UBER_CLIENT_ID and UBER_CLIENT_SECRET env vars.
 * Returns null when unconfigured or when the API call fails.
 */
export async function getUberEstimates(
  pickupArea: string,
  airport: string,
  seatCount: number,
): Promise<UberProduct[] | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const dest = AIRPORT_COORDS[airport];
  if (!dest) return null;

  const origin = (await geocode(pickupArea)) ?? JHU_FALLBACK;

  const url = new URL("https://api.uber.com/v1.2/estimates/price");
  url.searchParams.set("start_latitude", String(origin.lat));
  url.searchParams.set("start_longitude", String(origin.lng));
  url.searchParams.set("end_latitude", String(dest.lat));
  url.searchParams.set("end_longitude", String(dest.lng));
  if (seatCount > 1) url.searchParams.set("seat_count", String(seatCount));

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 900 }, // prices are live — cache 15 min
    });
    if (!res.ok) return null;
    const body = await res.json();
    const prices = (body.prices ?? []) as Array<{
      display_name: string;
      low_estimate: number | null;
      high_estimate: number | null;
      duration: number;
    }>;
    return prices
      .filter((p) => p.low_estimate != null && p.low_estimate > 0)
      .map((p) => ({
        display_name: p.display_name,
        low_cents: Math.round((p.low_estimate ?? 0) * 100),
        high_cents: Math.round(
          (p.high_estimate ?? p.low_estimate ?? 0) * 100,
        ),
        duration_min: Math.round((p.duration ?? 0) / 60),
      }));
  } catch {
    return null;
  }
}
