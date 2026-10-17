"use client";

import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";

function resolveDark(mode: Mode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode: Mode) {
  document.documentElement.classList.toggle("dark", resolveDark(mode));
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("pigeon-theme");
    const next: Mode =
      stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    setMode(next);
    applyTheme(next);
    setMounted(true);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = (localStorage.getItem("pigeon-theme") as Mode | null) || "system";
      if (current === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function cycle() {
    const order: Mode[] = ["system", "light", "dark"];
    const i = order.indexOf(mode);
    const next = order[(i + 1) % order.length];
    setMode(next);
    localStorage.setItem("pigeon-theme", next);
    applyTheme(next);
  }

  const label =
    mode === "system"
      ? "Theme: system (click for light)"
      : mode === "light"
        ? "Theme: light (click for dark)"
        : "Theme: dark (click for system)";

  return (
    <button
      type="button"
      onClick={cycle}
      className="inline-flex items-center justify-center p-2 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--accent-soft)] border border-transparent hover:border-[var(--border)] transition-colors"
      aria-label={label}
      title={label}
      suppressHydrationWarning
    >
      {!mounted || mode === "system" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" strokeLinecap="round" />
        </svg>
      ) : mode === "light" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
