"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

// Theme lives in localStorage and isn't known on the server, so the first
// client render must match the server's ("not mounted yet") to avoid a
// hydration mismatch — useSyncExternalStore is the sanctioned way to read a
// value that legitimately differs between server and client snapshots.
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <label className="flex cursor-pointer items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-tight">
          Dark mode
        </span>
        <span className="block text-xs text-muted-foreground mt-0.5">
          {mounted
            ? isDark
              ? "On — easier on the eyes at night."
              : "Off — using the light theme."
            : "Match the app's look to your preference."}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Toggle dark mode"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
          isDark ? "border-primary bg-primary" : "border-input bg-muted",
        )}
      >
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full bg-background shadow-sm transition-transform",
            isDark ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        >
          {isDark ? (
            <Moon className="size-3 text-primary" />
          ) : (
            <Sun className="size-3 text-amber-500" />
          )}
        </span>
      </button>
    </label>
  );
}
