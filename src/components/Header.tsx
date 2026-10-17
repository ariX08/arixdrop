"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-black/40 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Extreme left */}
        <a href="/" className="flex items-center gap-2.5 group" aria-label="Pigeon home">
          <span className="w-7 h-7 rounded-lg bg-[var(--accent-soft)] border border-[var(--border)] flex items-center justify-center overflow-hidden">
            <Image
              src="/logo.svg"
              alt=""
              width={18}
              height={18}
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(2476%) hue-rotate(202deg) brightness(98%) contrast(96%)",
              }}
            />
          </span>
          <span className="font-[family-name:var(--font-instrument)] font-semibold text-lg tracking-tight text-white">
            Pigeon
          </span>
        </a>

        {/* Extreme right */}
        <nav className="hidden sm:flex items-center gap-8 text-sm text-white/60" aria-label="Primary">
          <a href="/#how" className="hover:text-white transition-colors">How it works</a>
          <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
          <a href="/security" className="hover:text-white transition-colors">Security</a>
        </nav>

        <button
          type="button"
          className="sm:hidden p-2 -mr-2 text-white/60 hover:text-white"
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
            className="sm:hidden overflow-hidden border-t border-[var(--border)] bg-black/50"
          >
            <nav className="flex flex-col px-4 py-3 text-sm">
              {["How it works", "Privacy", "Security"].map((label, i) => (
                <a
                  key={label}
                  href={i === 0 ? "/#how" : `/${label.toLowerCase()}`}
                  className="py-2.5 text-white/70 hover:text-white"
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
