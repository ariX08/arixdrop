"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-md"
      style={{
        backgroundColor: "var(--header-bg)",
        borderColor: "var(--header-border)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5" aria-label="pigeon home">
          <Image src="/logo.svg" alt="" width={28} height={28} className="shrink-0" priority />
          <span className="font-[family-name:var(--font-brand)] text-2xl leading-none tracking-wide text-[var(--ink)] lowercase">
            pigeon
          </span>
        </a>

        <nav className="hidden sm:flex items-center gap-6 text-sm text-[var(--muted)]" aria-label="Primary">
          <a href="/#how" className="hover:text-[var(--ink)] transition-colors">
            How it works
          </a>
          <a href="/privacy" className="hover:text-[var(--ink)] transition-colors">
            Privacy
          </a>
          <a href="/security" className="hover:text-[var(--ink)] transition-colors">
            Security
          </a>
          <ThemeToggle />
        </nav>

        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="p-2 -mr-2 text-[var(--muted)] hover:text-[var(--ink)]"
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
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sm:hidden overflow-hidden border-t"
            style={{
              borderColor: "var(--header-border)",
              backgroundColor: "var(--surface)",
            }}
          >
            <nav className="flex flex-col px-4 py-3 text-sm">
              {[
                { label: "How it works", href: "/#how" },
                { label: "Privacy", href: "/privacy" },
                { label: "Security", href: "/security" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="py-2.5 text-[var(--muted)] hover:text-[var(--ink)]"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
