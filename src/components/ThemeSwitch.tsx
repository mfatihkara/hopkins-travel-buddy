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
export function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

// The bare on/off pill switch, shared by the settings row and the header so
// both stay in sync without duplicating the toggle logic.
export default function ThemeSwitch({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors",
        isDark ? "border-primary bg-primary" : "border-input bg-muted",
        className,
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
  );
}
