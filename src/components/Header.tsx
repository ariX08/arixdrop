"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)] backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 group" aria-label="Pigeon home">
          <span className="w-7 h-7 rounded-lg bg-[var(--accent-soft)] border border-[var(--border)] flex items-center justify-center text-blue-500 group-hover:border-[var(--border-strong)] transition">
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none" className="text-current">
              <path d="M6 20c0-6 4.5-11 10-11 3.5 0 6.5 1.8 8.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              <path d="M24.5 13.5c1.5-0.5 3-0.2 4 1.2-1.2 0.3-2.5 0.1-3.5-0.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M16 9c1.2-2.5 3.8-3.5 6-2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="20.5" cy="12.2" r="1.1" fill="currentColor"/>
              <path d="M8 20c2 3 5 5 8 5s6-2 8-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              <path d="M12 25c1.5 2 3.5 3 4 3s2.5-1 4-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          <span className="font-[family-name:var(--font-instrument)] font-semibold text-lg tracking-tight text-[var(--ink)]">
            Pigeon
          </span>
        </a>

        <nav className="hidden sm:flex items-center gap-8 text-sm text-[var(--muted)]" aria-label="Primary">
          <a href="/#how" className="hover:text-[var(--ink)] transition-colors">How it works</a>
          <a href="/privacy" className="hover:text-[var(--ink)] transition-colors">Privacy</a>
          <a href="/security" className="hover:text-[var(--ink)] transition-colors">Security</a>
        </nav>

        <button
          type="button"
          className="sm:hidden p-2 -mr-2 text-[var(--muted)] hover:text-[var(--ink)]"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
            {open ? (
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            ) : (
              <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sm:hidden overflow-hidden border-t border-[var(--border)] bg-[var(--surface)]"
          >
            <nav className="flex flex-col px-4 py-3 text-sm">
              {["How it works", "Privacy", "Security", "Terms"].map((label, i) => (
                <a
                  key={label}
                  href={i === 0 ? "/#how" : `/${label.toLowerCase()}`}
                  className="py-2.5 text-[var(--muted)] hover:text-[var(--ink)]"
                  onClick={() => setOpen(false)}
                >
                  {label}
                </a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
