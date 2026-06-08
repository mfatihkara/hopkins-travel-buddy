"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const AIRPORTS = ["BWI", "IAD", "DCA"] as const;

export default function FeedFilters({
  airport,
  date,
  minDate,
}: {
  airport: string;
  date: string;
  minDate: string;
}) {
  const router = useRouter();

  function apply(nextAirport: string, nextDate: string) {
    const p = new URLSearchParams();
    if (nextAirport) p.set("airport", nextAirport);
    if (nextDate) p.set("date", nextDate);
    const qs = p.toString();
    router.push(qs ? `/?${qs}` : "/", { scroll: false });
  }

  const hasFilters = !!airport || !!date;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => apply("", date)}
          className={chip(!airport)}
        >
          All airports
        </button>
        {AIRPORTS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => apply(airport === a ? "" : a, date)}
            className={chip(airport === a)}
          >
            {a}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          min={minDate}
          onChange={(e) => apply(airport, e.target.value)}
          aria-label="Filter by departure date"
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {hasFilters && (
          <button
            type="button"
            onClick={() => apply("", "")}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>
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
