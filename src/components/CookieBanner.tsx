"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import SpecularButton from "./SpecularButton";

const STORAGE_KEY = "pigeon-cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function save(value: "all" | "essential" | "rejected") {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {}
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[60] sm:max-w-md"
          role="dialog"
          aria-label="Cookie consent"
        >
          <div className="glass rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <p className="text-sm text-[var(--ink)] leading-relaxed flex-1">
                Essential cookies keep the site working and stay on. Optional cookies help
                with performance — accept, reject, or manage them. Learn more in our{" "}
                <a href="/privacy" className="underline underline-offset-2 hover:text-[var(--accent)]">
                  Privacy Policy
                </a>
                .
              </p>
              <button
                type="button"
                onClick={() => save("essential")}
                className="shrink-0 p-1 text-[var(--muted)] hover:text-[var(--ink)]"
                aria-label="Dismiss"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => save("essential")}
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
                onClick={() => save("rejected")}
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
                onClick={() => save("all")}
              >
                Accept All Cookies
              </SpecularButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
