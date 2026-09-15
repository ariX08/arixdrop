"use client";

import { useEffect, useRef, useState } from "react";

interface JoinModalProps {
  open: boolean;
  onClose: () => void;
  onJoin: (code: string) => void;
  initialCode?: string;
}

export function JoinModal({ open, onClose, onJoin, initialCode = "" }: JoinModalProps) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCode(initialCode.toUpperCase().slice(0, 6));
      setError("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initialCode]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleChange(v: string) {
    const cleaned = v.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
    setCode(cleaned);
    setError("");
  }

  function handleSubmit() {
    if (code.length !== 6) {
      setError("Enter a 6-character code");
      return;
    }
    onJoin(code);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-title"
    >
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden />
      <div className="relative bg-surface rounded-xl shadow-panel-hover w-full max-w-md p-6 sm:p-7 border border-border">
        <h2 id="join-title" className="font-display font-semibold text-xl mb-1">
          Enter room code
        </h2>
        <p className="text-sm text-muted mb-5">
          Type the 6-character code from the sender.
        </p>
        <label htmlFor="join-code-input" className="block text-xs font-medium text-muted mb-1.5">
          Code
        </label>
        <input
          ref={inputRef}
          id="join-code-input"
          type="text"
          maxLength={6}
          autoComplete="off"
          spellCheck={false}
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="w-full h-12 px-4 rounded-lg border border-border bg-paper font-display font-semibold text-2xl room-code text-center tracking-widest uppercase focus:border-accent placeholder:text-border"
          placeholder="······"
          aria-describedby="join-hint"
        />
        <p id="join-hint" className="mt-2 text-xs text-muted">
          Letters and numbers, case-insensitive
        </p>
        {error && (
          <p className="mt-2 text-sm text-error" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-lg border border-border font-medium text-sm hover:bg-paper transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={code.length !== 6}
            className="flex-1 h-11 rounded-lg bg-accent text-white font-medium text-sm hover:bg-accent-hover active:bg-accent-pressed disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Join room
          </button>
        </div>
      </div>
    </div>
  );
}
