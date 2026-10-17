"use client";

import { useEffect, useId, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import SpecularButton from "./SpecularButton";
import SquishSwitch from "./SquishSwitch";
import {
  ACCEPT_ALL_CONSENT,
  COOKIE_CONSENT_EVENT,
  type CookieConsent,
  hasConsentChoice,
  readConsent,
  REJECT_OPTIONAL_CONSENT,
  writeConsent,
} from "@/lib/cookies";

type View = "banner" | "settings" | "hidden";

const CATEGORIES: {
  key: keyof Pick<CookieConsent, "essential" | "preferences" | "analytics" | "performance">;
  title: string;
  description: string;
  locked?: boolean;
}[] = [
  {
    key: "essential",
    title: "Essential",
    description:
      "Required for basic site function: security, load balancing, and remembering this consent choice. Always on.",
    locked: true,
  },
  {
    key: "preferences",
    title: "Preferences",
    description:
      "Remembers choices like theme (light / dark / system) across visits. Without this, theme resets each session.",
  },
  {
    key: "analytics",
    title: "Analytics",
    description:
      "Anonymous usage metrics to understand what breaks and what to improve. No ads. Not used until you opt in and a provider is connected.",
  },
  {
    key: "performance",
    title: "Performance",
    description:
      "Helps measure load times and connection quality for file transfers so we can tune the experience.",
  },
];

export function CookieBanner() {
  const titleId = useId();
  const [view, setView] = useState<View>("hidden");
  const [draft, setDraft] = useState({
    preferences: false,
    analytics: false,
    performance: false,
  });

  useEffect(() => {
    const existing = readConsent();
    if (!existing) {
      setView("banner");
    } else {
      setDraft({
        preferences: existing.preferences,
        analytics: existing.analytics,
        performance: existing.performance,
      });
    }

    const openSettings = () => {
      const current = readConsent();
      setDraft({
        preferences: current?.preferences ?? false,
        analytics: current?.analytics ?? false,
        performance: current?.performance ?? false,
      });
      setView("settings");
    };

    window.addEventListener("pigeon-open-cookie-settings", openSettings);
    return () => window.removeEventListener("pigeon-open-cookie-settings", openSettings);
  }, []);

  function acceptAll() {
    writeConsent({ ...ACCEPT_ALL_CONSENT });
    setDraft({ preferences: true, analytics: true, performance: true });
    setView("hidden");
  }

  function rejectOptional() {
    writeConsent({ ...REJECT_OPTIONAL_CONSENT });
    setDraft({ preferences: false, analytics: false, performance: false });
    setView("hidden");
  }

  function saveSettings() {
    writeConsent({
      version: 1,
      preferences: draft.preferences,
      analytics: draft.analytics,
      performance: draft.performance,
    });
    setView("hidden");
  }

  function openSettingsFromBanner() {
    const current = readConsent();
    setDraft({
      preferences: current?.preferences ?? false,
      analytics: current?.analytics ?? false,
      performance: current?.performance ?? false,
    });
    setView("settings");
  }

  return (
    <AnimatePresence>
      {view === "banner" && (
        <motion.div
          key="banner"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[60] sm:max-w-md"
          role="dialog"
          aria-labelledby={titleId}
          aria-modal="false"
        >
          <div className="glass rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p id={titleId} className="text-sm font-medium text-[var(--ink)]">
                  Cookies
                </p>
                <p className="mt-1 text-sm text-[var(--muted)] leading-relaxed">
                  Essential cookies keep the site working and stay on. Optional cookies help with
                  preferences, performance, and analytics — accept, reject, or manage them. Learn
                  more in our{" "}
                  <a
                    href="/cookies"
                    className="underline underline-offset-2 text-[var(--ink)] hover:text-[var(--accent)]"
                  >
                    Cookies
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    className="underline underline-offset-2 text-[var(--ink)] hover:text-[var(--accent)]"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={rejectOptional}
                className="shrink-0 p-1 text-[var(--muted)] hover:text-[var(--ink)]"
                aria-label="Dismiss and use essential only"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 justify-end">
              <button
                type="button"
                onClick={openSettingsFromBanner}
                className="h-9 px-3 rounded-full border border-[var(--border-strong)] text-sm font-medium text-[var(--ink)] hover:bg-[var(--accent-soft)] transition"
              >
                Cookie Settings
              </button>
              <SpecularButton
                size="sm"
                radius={999}
                tint="#ffffff"
                tintOpacity={0.08}
                textColor="var(--ink)"
                lineColor="#a1a1aa"
                baseColor="#71717a"
                intensity={0.8}
                idleIntensity={0.25}
                onClick={rejectOptional}
              >
                Reject All
              </SpecularButton>
              <SpecularButton
                size="sm"
                radius={999}
                tint="#0a0a0a"
                tintOpacity={0.95}
                textColor="#ffffff"
                lineColor="#a1a1aa"
                baseColor="#27272a"
                intensity={1}
                idleIntensity={0.35}
                onClick={acceptAll}
              >
                Accept All Cookies
              </SpecularButton>
            </div>
          </div>
        </motion.div>
      )}

      {view === "settings" && (
        <motion.div
          key="settings-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6"
          style={{ background: "color-mix(in srgb, var(--ink) 35%, transparent)" }}
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              // backdrop click: keep choice if already set, otherwise essential-only
              if (hasConsentChoice()) setView("hidden");
              else rejectOptional();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-settings`}
            className="glass w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[min(92dvh,640px)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-[var(--border)]">
              <div>
                <h2 id={`${titleId}-settings`} className="text-base font-semibold text-[var(--ink)]">
                  Cookie settings
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Choose what we may store. Essential is always required.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (hasConsentChoice()) setView("hidden");
                  else setView("banner");
                }}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--accent-soft)]"
                aria-label="Close settings"
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
              {CATEGORIES.map((cat) => {
                const on =
                  cat.key === "essential"
                    ? true
                    : draft[cat.key as "preferences" | "analytics" | "performance"];

                return (
                  <div
                    key={cat.key}
                    className="flex items-start gap-4 py-3 border-b border-[var(--border)] last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--ink)]">{cat.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)] leading-relaxed">{cat.description}</p>
                    </div>
                    <div className="shrink-0 pt-0.5">
                      <SquishSwitch
                        checked={on}
                        disabled={cat.locked}
                        onChange={(next) => {
                          if (cat.locked || cat.key === "essential") return;
                          setDraft((d) => ({ ...d, [cat.key]: next }));
                        }}
                        width={52}
                        height={28}
                        radius={14}
                        stretch={28}
                        trackColor="#3f3f46"
                        trackOnColor="#635bff"
                        ariaLabel={`${cat.title} cookies`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-4 border-t border-[var(--border)] flex flex-wrap gap-2 justify-end bg-[color-mix(in_srgb,var(--surface)_90%,transparent)]">
              <button
                type="button"
                onClick={rejectOptional}
                className="h-10 px-4 rounded-full border border-[var(--border-strong)] text-sm font-medium text-[var(--ink)] hover:bg-[var(--accent-soft)] transition"
              >
                Reject optional
              </button>
              <SpecularButton
                size="sm"
                radius={999}
                tint="#635bff"
                tintOpacity={0.98}
                textColor="#ffffff"
                lineColor="#c4b5fd"
                baseColor="#4c1d95"
                intensity={1}
                idleIntensity={0.35}
                onClick={saveSettings}
              >
                Save preferences
              </SpecularButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Re-export for callers that only need to open settings */
export { openCookieSettings } from "@/lib/cookies";

// silence unused import if tree-shaken oddly
void COOKIE_CONSENT_EVENT;
