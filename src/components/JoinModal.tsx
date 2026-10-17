"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import CodeSlots from "./CodeSlots";
import { TurnstileWidget } from "./TurnstileWidget";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

interface JoinModalProps {
  open: boolean;
  onClose: () => void;
  onJoin: (code: string) => void;
  initialCode?: string;
}

export function JoinModal({ open, onClose, onJoin, initialCode = "" }: JoinModalProps) {
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCode(initialCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
      setStatus("idle");
      setToken(null);
    }
  }, [open, initialCode]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function tryJoin(value: string) {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.length !== 6) return;
    if (SITE_KEY && !token) {
      setStatus("error");
      return;
    }
    setStatus("success");
    setTimeout(() => onJoin(cleaned), 350);
  }

  const codeReady = code.replace(/[^A-Z0-9]/gi, "").length === 6;
  const canJoin = codeReady && (!SITE_KEY || !!token);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.25 }}
            className="relative w-full max-w-md rounded-2xl glass p-6 sm:p-8"
          >
            <h2 className="font-[family-name:var(--font-instrument)] font-semibold text-xl text-[var(--ink)] mb-1">
              Enter room code
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              Type the 6-character code from the sender.
            </p>

            <div className="flex justify-center mb-5 overflow-x-auto">
              <CodeSlots
                length={6}
                value={code}
                onChange={(v) => {
                  setCode(v.toUpperCase());
                  setStatus("idle");
                }}
                onComplete={(v) => {
                  if (!SITE_KEY || token) tryJoin(v);
                }}
                status={status}
                autoFocus
                accentColor="#635bff"
                inkColor="#635bff"
                slotColor="rgba(99, 91, 255, 0.1)"
                digitColor="var(--ink)"
                dangerColor="#df1b41"
                slotSize={44}
                gap={8}
                radius={12}
                ariaLabel="Room code"
              />
            </div>

            <div className="flex justify-center mb-2">
              <TurnstileWidget
                onSuccess={(t) => {
                  setToken(t);
                  setStatus("idle");
                }}
                onError={() => setToken(null)}
                onExpire={() => setToken(null)}
              />
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl btn-ghost text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => tryJoin(code)}
                disabled={!canJoin}
                className="flex-1 h-11 rounded-xl btn-primary text-sm disabled:opacity-40"
              >
                Join room
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
