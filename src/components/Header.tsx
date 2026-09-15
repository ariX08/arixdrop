"use client";

import { useState } from "react";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5" aria-label="AriXDrop home">
          <span className="w-7 h-7 rounded-md bg-ink flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M2 7h10M7 2v10"
                stroke="#E85D04"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="font-display font-semibold text-lg tracking-tight">
            AriXDrop
          </span>
        </a>

        <nav className="hidden sm:flex items-center gap-8 text-sm text-muted" aria-label="Primary">
          <a href="#how" className="hover:text-ink transition-colors">
            How it works
          </a>
          <a href="#privacy" className="hover:text-ink transition-colors">
            Privacy
          </a>
        </nav>

        <button
          type="button"
          className="sm:hidden p-2 -mr-2 text-muted hover:text-ink"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            {open ? (
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            ) : (
              <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="sm:hidden border-t border-border bg-surface px-5 py-4"
          role="dialog"
          aria-label="Mobile navigation"
        >
          <nav className="flex flex-col gap-3 text-sm">
            <a
              href="#how"
              className="py-2 text-muted hover:text-ink"
              onClick={() => setOpen(false)}
            >
              How it works
            </a>
            <a
              href="#privacy"
              className="py-2 text-muted hover:text-ink"
              onClick={() => setOpen(false)}
            >
              Privacy
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
