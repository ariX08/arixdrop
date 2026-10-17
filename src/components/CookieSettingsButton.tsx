"use client";

import { openCookieSettings } from "@/lib/cookies";

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => openCookieSettings()}
      className="inline-flex items-center h-10 px-4 rounded-full border border-[var(--border-strong)] text-sm font-medium text-[var(--ink)] hover:bg-[var(--accent-soft)] hover:border-[var(--accent)] transition"
    >
      Open cookie settings
    </button>
  );
}
