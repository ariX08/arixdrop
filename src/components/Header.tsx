"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";

export function Header() {
  const [open, setOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-black/30 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 group" aria-label="AriXDrop home">
          {!logoFailed ? (
            <Image
              src="/logo.png"
              alt=""
              width={28}
              height={28}
              className="rounded-lg ring-1 ring-white/10 group-hover:ring-white/20 transition"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7h10M7 2v10" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          )}
          <span className="font-[family-name:var(--font-instrument)] font-semibold text-lg tracking-tight text-white">
            AriXDrop
          </span>
        </a>

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
            className="sm:hidden overflow-hidden border-t border-white/5 bg-black/40"
          >
            <nav className="flex flex-col px-4 py-3 text-sm">
              {["How it works", "Privacy", "Security", "Terms"].map((label, i) => (
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
