"use client";

import { useEffect, useState } from "react";
import { allowsCategory, COOKIE_CONSENT_EVENT, readConsent } from "@/lib/cookies";

type Mode = "system" | "light" | "dark";

function resolveDark(mode: Mode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode: Mode) {
  const dark = resolveDark(mode);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.backgroundColor = dark ? "#1e1b4b" : "#ebe7ff";
  if (document.body) {
    document.body.style.backgroundColor = dark ? "#1e1b4b" : "#ebe7ff";
  }
}

function canPersistTheme(): boolean {
  const consent = readConsent();
  if (!consent) return true;
  return allowsCategory("preferences", consent);
}

function readStoredMode(): Mode {
  try {
    const raw = localStorage.getItem("pigeon-theme");
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return "system";
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let stored = readStoredMode();

    if (readConsent() && !allowsCategory("preferences")) {
      stored = "system";
    }

    setMode(stored);
    applyTheme(stored);
    setMounted(true);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current =
        readConsent() && !allowsCategory("preferences") ? "system" : readStoredMode();
      if (current === "system") {
        setMode("system");
        applyTheme("system");
      }
    };
    mq.addEventListener("change", onChange);

    const onConsent = () => {
      if (!allowsCategory("preferences")) {
        setMode("system");
        applyTheme("system");
        try {
          localStorage.removeItem("pigeon-theme");
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);

    return () => {
      mq.removeEventListener("change", onChange);
      window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
    };
  }, []);

  function cycle() {
    const order: Mode[] = ["system", "light", "dark"];
    const i = order.indexOf(mode);
    const next = order[(i + 1) % order.length];
    setMode(next);
    applyTheme(next);
    if (canPersistTheme()) {
      try {
        localStorage.setItem("pigeon-theme", next);
      } catch {
        /* ignore */
      }
    }
  }

  const label =
    mode === "system"
      ? "Theme: system (follows device)"
      : mode === "light"
        ? "Theme: light"
        : "Theme: dark";

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
