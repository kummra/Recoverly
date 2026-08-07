"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Recharts takes colours as props, not CSS classes, so it can't inherit the
 * theme tokens. This resolves them per theme instead.
 *
 * Before mount `resolvedTheme` is undefined; we fall back to the dark palette
 * to match defaultTheme and avoid a flash of unreadable axes.
 */
export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = !mounted || resolvedTheme === "dark";

  return {
    grid: isDark ? "#334155" : "#e2e8f0",
    tick: isDark ? "#cbd5e1" : "#475569",
    tooltip: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
      borderRadius: "0.75rem",
      color: isDark ? "#f8fafc" : "#0f172a"
    },
    tooltipCursor: isDark ? "rgba(148,163,184,0.12)" : "rgba(15,23,42,0.06)"
  };
}
