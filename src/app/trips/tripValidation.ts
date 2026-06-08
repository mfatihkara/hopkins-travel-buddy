// Shared validation for the create-trip and edit-trip forms — both post the
// same field shape (airport, date, two time windows, pickup area).

const AIRPORT_RE = /^[A-Z]{3}$/;

function parseTimeFields(prefix: string, formData: FormData): string | null {
  const hour = Number(formData.get(`${prefix}_hour`));
  const min = String(formData.get(`${prefix}_min`) ?? "");
  const period = String(formData.get(`${prefix}_period`) ?? "");
  if (!hour || hour < 1 || hour > 12) return null;
  if (!/^\d{2}$/.test(min)) return null;
  if (period !== "AM" && period !== "PM") return null;

  let h24 = hour;
  if (period === "AM") h24 = hour === 12 ? 0 : hour;
  if (period === "PM") h24 = hour === 12 ? 12 : hour + 12;

  return `${String(h24).padStart(2, "0")}:${min}`;
}

export type TripFields = {
  airport: string;
  date: string;
  start: Date;
  end: Date;
  pickupArea: string;
};

export function parseTripFields(
  formData: FormData,
): TripFields | { error: string } {
  const airport = String(formData.get("airport") ?? "").trim().toUpperCase();
  const date = String(formData.get("date") ?? "");
  const startHHMM = parseTimeFields("time_earliest", formData);
  const endHHMM = parseTimeFields("time_latest", formData);
  const pickupArea = String(formData.get("pickup_area") ?? "").trim();

  if (!AIRPORT_RE.test(airport)) return { error: "Enter a valid 3-letter airport code." };
  if (!date) return { error: "Pick a date." };
  if (!startHHMM || !endHHMM) return { error: "Pick a valid time window." };
  if (!pickupArea) return { error: "Pickup area is required." };
  if (pickupArea.length > 100) return { error: "Pickup area is too long (max 100)." };

  const start = new Date(`${date}T${startHHMM}`);
  const end = new Date(`${date}T${endHHMM}`);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "Invalid date or time." };
  }
  if (end <= start) return { error: "Latest time must be after earliest." };
  if (start < now) return { error: "Pick a future time." };
  if (end.getTime() - start.getTime() > 8 * 60 * 60 * 1000) {
    return { error: "Window can't span more than 8 hours." };
  }

  return { airport, date, start, end, pickupArea };
}
