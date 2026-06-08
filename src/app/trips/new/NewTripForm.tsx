"use client";

import { useState } from "react";
import {
  Plane,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { postTrip } from "./actions";

const QUICK_AIRPORTS = ["BWI", "IAD", "DCA"];

function timeLabel(hour: string, min: string, period: string) {
  if (!hour || !min || !period) return null;
  return `${hour}:${min} ${period}`;
}

function dateLabel(date: string) {
  if (!date) return null;
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

function SectionIcon({
  icon: Icon,
  tone,
}: {
  icon: typeof Plane;
  tone: string;
}) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg",
        tone,
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

type TimeParts = { hour: string; min: string; period: string };

export type TripFormInitial = {
  airport: string;
  date: string;
  earliest: TimeParts;
  latest: TimeParts;
  pickup: string;
};

export default function NewTripForm({
  error,
  mode = "create",
  tripId,
  initial,
  action,
}: {
  error?: string;
  mode?: "create" | "edit";
  tripId?: string;
  initial?: TripFormInitial;
  action?: (formData: FormData) => void | Promise<void>;
}) {
  const isEdit = mode === "edit";
  const [airport, setAirport] = useState(initial?.airport ?? "");
  const [showCustom, setShowCustom] = useState(
    () => !!initial?.airport && !QUICK_AIRPORTS.includes(initial.airport),
  );
  const [date, setDate] = useState(initial?.date ?? "");
  const [eHour, setEHour] = useState(initial?.earliest.hour ?? "");
  const [eMin, setEMin] = useState(initial?.earliest.min ?? "");
  const [ePeriod, setEPeriod] = useState(initial?.earliest.period ?? "");
  const [lHour, setLHour] = useState(initial?.latest.hour ?? "");
  const [lMin, setLMin] = useState(initial?.latest.min ?? "");
  const [lPeriod, setLPeriod] = useState(initial?.latest.period ?? "");
  const [pickup, setPickup] = useState(initial?.pickup ?? "");

  const startLabel = timeLabel(eHour, eMin, ePeriod);
  const endLabel = timeLabel(lHour, lMin, lPeriod);
  const dLabel = dateLabel(date);
  const hasAny = airport || dLabel || startLabel || pickup;

  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local

  return (
    <form
      action={action ?? postTrip}
      className="mx-auto max-w-md px-4 py-6 space-y-5 pb-[max(env(safe-area-inset-bottom),1.5rem)]"
    >
      {isEdit && tripId && (
        <input type="hidden" name="trip_id" value={tripId} />
      )}

      {/* Live preview */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Live preview
        </div>
        <Card className="overflow-hidden border-primary/20 py-0">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-[#3f6fb0] to-[#68ACE5]" />
          <CardContent className="px-4 py-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors",
                  airport
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {airport ? (
                  <span className="text-sm font-bold tracking-tight">
                    {airport}
                  </span>
                ) : (
                  <Plane className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "font-semibold leading-tight",
                    !airport && !dLabel && "text-muted-foreground",
                  )}
                >
                  {airport || "Airport"} · {dLabel || "date"}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {startLabel && endLabel
                    ? `${startLabel} – ${endLabel}`
                    : "leave between …"}
                </p>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{pickup || "pickup area"}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <p className="px-1 text-xs text-muted-foreground">
          {hasAny
            ? "This is how classmates will see your trip."
            : "Fill in the details below and watch your trip take shape."}
        </p>
      </div>

      {/* Form fields */}
      <Card className="py-0">
        <CardContent className="space-y-6 px-4 py-5">
          {/* Airport */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <SectionIcon icon={Plane} tone="bg-primary/10 text-primary" />
              Which airport?
            </Label>
            <input type="hidden" name="airport" value={airport} />
            <div className="flex flex-wrap gap-2">
              {QUICK_AIRPORTS.map((a) => {
                const active = airport === a && !showCustom;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      setAirport(a);
                      setShowCustom(false);
                    }}
                    className={cn(
                      "flex h-10 items-center gap-1.5 rounded-xl border px-4 text-sm font-semibold tracking-wide transition-all",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5",
                    )}
                  >
                    {active && <Check className="h-3.5 w-3.5" />}
                    {a}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setShowCustom(true);
                  setAirport("");
                }}
                className={cn(
                  "flex h-10 items-center rounded-xl border px-4 text-sm font-medium transition-all",
                  showCustom
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5",
                )}
              >
                Other
              </button>
            </div>
            {showCustom && (
              <Input
                type="text"
                value={airport}
                onChange={(e) => setAirport(e.target.value.toUpperCase())}
                maxLength={3}
                minLength={3}
                pattern="[A-Za-z]{3}"
                placeholder="e.g. JFK, LAX, ORD"
                autoCapitalize="characters"
                autoComplete="off"
                autoFocus
                className="h-11 uppercase tracking-wider animate-in fade-in slide-in-from-top-1"
              />
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2">
              <SectionIcon
                icon={Calendar}
                tone="bg-[#68ACE5]/20 text-[#2b6cb0]"
              />
              What day?
            </Label>
            <Input
              id="date"
              type="date"
              name="date"
              required
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Time window */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <SectionIcon icon={Clock} tone="bg-amber-100 text-amber-700" />
              When can you leave?
            </Label>
            <div className="rounded-xl bg-muted/40 p-3 space-y-2.5">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Earliest
                </span>
                <TimeSelect
                  name="time_earliest"
                  hour={eHour}
                  min={eMin}
                  period={ePeriod}
                  onHour={setEHour}
                  onMin={setEMin}
                  onPeriod={setEPeriod}
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Latest
                </span>
                <TimeSelect
                  name="time_latest"
                  hour={lHour}
                  min={lMin}
                  period={lPeriod}
                  onHour={setLHour}
                  onMin={setLMin}
                  onPeriod={setLPeriod}
                />
              </div>
            </div>
          </div>

          {/* Pickup */}
          <div className="space-y-2">
            <Label htmlFor="pickup_area" className="flex items-center gap-2">
              <SectionIcon icon={MapPin} tone="bg-rose-100 text-rose-600" />
              Where should you meet?
            </Label>
            <Input
              id="pickup_area"
              type="text"
              name="pickup_area"
              required
              maxLength={100}
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              placeholder="Charles Village, Bloomberg…"
              className="h-11"
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200 animate-in fade-in">
          {error}
        </div>
      )}

      <Button type="submit" size="xl" className="w-full gap-2">
        <Plane className="h-5 w-5" />
        {isEdit ? "Save changes" : "Post trip"}
      </Button>
    </form>
  );
}

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/40";

function TimeSelect({
  name,
  hour,
  min,
  period,
  onHour,
  onMin,
  onPeriod,
}: {
  name: string;
  hour: string;
  min: string;
  period: string;
  onHour: (v: string) => void;
  onMin: (v: string) => void;
  onPeriod: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <select
        name={`${name}_hour`}
        required
        value={hour}
        onChange={(e) => onHour(e.target.value)}
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
        value={min}
        onChange={(e) => onMin(e.target.value)}
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
        value={period}
        onChange={(e) => onPeriod(e.target.value)}
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
