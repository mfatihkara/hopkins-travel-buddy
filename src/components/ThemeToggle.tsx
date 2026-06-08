"use client";

import { useTheme } from "next-themes";
import ThemeSwitch, { useMounted } from "@/components/ThemeSwitch";

export default function ThemeToggle() {
  const { resolvedTheme } = useTheme();
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
      <ThemeSwitch className="mt-0.5" />
    </label>
  );
}
