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

async function geocode(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${address}, Baltimore, MD`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      {
        headers: {
          "User-Agent":
            "HopkinsTravelBuddy/1.0 (contact@jointravelbuddy.com)",
        },
        next: { revalidate: 86400 }, // geocode rarely changes — cache 24 h
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
 * Fetches Uber price estimates for a pickup area → airport route.
 * Returns null when UBER_SERVER_TOKEN is not set or the API call fails.
 */
export async function getUberEstimates(
  pickupArea: string,
  airport: string,
  seatCount: number,
): Promise<UberProduct[] | null> {
  const token = process.env.UBER_SERVER_TOKEN;
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
      headers: { Authorization: `Token ${token}` },
      next: { revalidate: 900 }, // prices are live — cache 15 min
    });
    if (!res.ok) return null;
    const body = await res.json();
    const prices = (
      body.prices ?? []
    ) as Array<{
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
