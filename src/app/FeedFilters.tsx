"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const AIRPORTS = ["BWI", "IAD", "DCA"] as const;

export default function FeedFilters({
  airport,
  date,
  area,
  minDate,
}: {
  airport: string;
  date: string;
  area: string;
  minDate: string;
}) {
  const router = useRouter();
  const [areaInput, setAreaInput] = useState(area);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-sync from the URL when it changes from outside this input (the
  // "Clear" button, or browser back/forward) — adjusting state during render
  // (rather than in an effect) is the React-sanctioned way to reset derived
  // state when a prop changes. https://react.dev/learn/you-might-not-need-an-effect
  const [prevArea, setPrevArea] = useState(area);
  if (area !== prevArea) {
    setPrevArea(area);
    setAreaInput(area);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function apply(nextAirport: string, nextDate: string, nextArea: string) {
    const p = new URLSearchParams();
    if (nextAirport) p.set("airport", nextAirport);
    if (nextDate) p.set("date", nextDate);
    if (nextArea) p.set("area", nextArea);
    const qs = p.toString();
    router.push(qs ? `/?${qs}` : "/", { scroll: false });
  }

  // Typing shouldn't trigger a server round-trip on every keystroke — wait
  // for a pause before updating the URL (and thus refetching the feed).
  function onAreaChange(value: string) {
    setAreaInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      apply(airport, date, value.trim());
    }, 400);
  }

  function clearAll() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setAreaInput("");
    apply("", "", "");
  }

  const hasFilters = !!airport || !!date || !!area;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => apply("", date, areaInput.trim())}
          className={chip(!airport)}
        >
          All airports
        </button>
        {AIRPORTS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => apply(airport === a ? "" : a, date, areaInput.trim())}
            className={chip(airport === a)}
          >
            {a}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={areaInput}
            onChange={(e) => onAreaChange(e.target.value)}
            placeholder="Search pickup area…"
            aria-label="Filter by pickup area"
            maxLength={100}
            className="h-9 w-full rounded-lg border border-input bg-transparent pl-8 pr-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <input
          type="date"
          value={date}
          min={minDate}
          onChange={(e) => apply(airport, e.target.value, areaInput.trim())}
          aria-label="Filter by departure date"
          className="h-9 shrink-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Clear filters
        </button>
      )}
    </div>
  );
}

function chip(active: boolean) {
  return cn(
    "h-8 rounded-full border px-3 text-sm font-medium transition-colors",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-background text-muted-foreground hover:bg-muted",
  );
}
