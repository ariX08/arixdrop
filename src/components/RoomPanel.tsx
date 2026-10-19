"use client";

import { motion, AnimatePresence } from "motion/react";
import SpecularButton from "@/components/SpecularButton";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { formatBytes } from "@/lib/webrtc";
import { useRoomSession } from "@/lib/useRoomSession";

interface RoomPanelProps {
  joinRequest?: { code: string; nonce: number } | null;
  initialFiles?: File[] | null;
  onJoinHandled?: () => void;
  onReset?: () => void;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export function RoomPanel({ joinRequest, initialFiles, onJoinHandled, onReset }: RoomPanelProps) {
  const s = useRoomSession({
    joinRequest,
    initialFiles,
    onJoinHandled,
    onReset,
    siteKey: SITE_KEY,
  });

  const activeFile = s.files.find((f) => f.status === "transferring") || s.files[s.files.length - 1];
  const totalBytes = s.files.reduce((a, f) => a + f.size, 0);
  const transferred = Math.round(s.overall * totalBytes);

  return (
    <div className="glass rounded-2xl overflow-hidden" role="region" aria-label="Transfer room">
      <AnimatePresence mode="wait">
        {s.awaitingVerify && (
          <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-medium text-[var(--ink)]">Ready to create room</span>
              <button type="button" onClick={s.reset} className="text-xs text-[var(--muted)] hover:text-[var(--ink)]">Cancel</button>
            </div>
            {s.pendingNames.length > 0 && (
              <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] p-3">
                <p className="text-xs font-medium text-[var(--muted)] mb-2">Files</p>
                <ul className="space-y-1 max-h-28 overflow-y-auto">
                  {s.pendingNames.map((name) => (
                    <li key={name} className="text-sm text-[var(--ink)] truncate">{name}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-sm text-[var(--muted)] mb-3 text-center">Verify you&apos;re human to create the room</p>
            <TurnstileWidget
              onSuccess={(token) => s.setTurnstileToken(token)}
              onError={() => s.setTurnstileToken(null)}
              onExpire={() => s.setTurnstileToken(null)}
            />
            <div className="mt-4">
              <SpecularButton size="md" radius={12} tint="#635bff" tintOpacity={0.98} textColor="#ffffff" lineColor="#c4b5fd" baseColor="#4c1d95" intensity={1.1} idleIntensity={0.4} disabled={!s.canCreate} className="w-full" onClick={s.confirmAndCreateRoom}>
                {s.canCreate ? "Create room" : "Complete verification…"}
              </SpecularButton>
            </div>
          </motion.div>
        )}

        {!s.awaitingVerify && (s.state === "creating" || s.state === "connecting" || s.zipping) && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-medium text-[var(--muted)]">
                {s.zipping ? "Zipping files…" : s.state === "connecting" ? "Joining room…" : "Creating room…"}
              </span>
              <span className="inline-block w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-sm text-[var(--muted)] text-center py-10">{s.statusLine || "Working…"}</p>
          </motion.div>
        )}

        {!s.awaitingVerify && s.state === "waiting" && (
          <motion.div key="waiting" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-medium text-[var(--ink)]">{s.role === "receiver" ? "Joined room" : "Room ready"}</span>
              <span className="text-xs text-[var(--muted)] tabular-nums">Expires in {s.formatTTL(s.ttl)}</span>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-medium text-[var(--muted)] mb-2">Room code</label>
              <div className="flex items-center gap-3 flex-wrap">
                <p className="room-code font-[family-name:var(--font-instrument)] font-semibold text-2xl sm:text-3xl text-[var(--ink)] select-all tracking-widest">{s.roomCode}</p>
                {s.role === "sender" && (
                  <button type="button" onClick={() => s.copy(s.roomCode, "code")} className="h-9 px-3 rounded-lg border border-[var(--border-strong)] text-sm text-[var(--ink)]">
                    {s.copyFeedback === "code" ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
              {s.role === "sender" && s.roomLink && (
                <div className="mt-3 flex gap-2">
                  <input type="text" readOnly value={s.roomLink} className="flex-1 h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] text-sm text-[var(--ink)]" />
                  <button type="button" onClick={() => s.copy(s.roomLink, "link")} className="h-10 px-3 rounded-lg border border-[var(--border-strong)] text-sm text-[var(--ink)] shrink-0">
                    {s.copyFeedback === "link" ? "Copied" : "Copy link"}
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-[var(--muted)] mb-1">
              Devices in room: <span className="text-[var(--ink)] font-medium tabular-nums">{s.peerCount}/2</span>
            </p>
            <p className="text-sm text-[var(--muted)] mb-5">{s.statusLine}</p>
            {s.role === "sender" && (
              <SpecularButton size="md" radius={12} tint="#635bff" tintOpacity={0.98} textColor="#ffffff" lineColor="#c4b5fd" baseColor="#4c1d95" intensity={1.1} idleIntensity={0.4} disabled={!s.canSend} className="w-full" onClick={s.sendFilesNow}>
                {s.canSend ? "Send files" : "Waiting for connection…"}
              </SpecularButton>
            )}
            <button type="button" onClick={s.reset} className="w-full mt-3 h-10 rounded-xl text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">Cancel</button>
          </motion.div>
        )}

        {!s.awaitingVerify && s.state === "transfer" && (
          <motion.div key="transfer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-sm font-medium text-[var(--ink)]">
                {s.role === "receiver" ? "Receiving" : "Sending"}
              </span>
              <span className="text-xs text-[var(--muted)] tabular-nums shrink-0">{s.speed}</span>
            </div>

            {activeFile && (
              <p className="text-sm text-[var(--ink)] truncate mb-2" title={activeFile.name}>
                {activeFile.name}
              </p>
            )}

            <div className="h-2.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[#8b85ff] progress-fill"
                style={{ width: `${Math.min(100, Math.round(s.overall * 100))}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[var(--muted)] tabular-nums">
              <span>{Math.min(100, Math.round(s.overall * 100))}%</span>
              <span>
                {formatBytes(transferred)} / {formatBytes(totalBytes || 0)}
              </span>
            </div>

            {s.files.length > 1 && (
              <p className="mt-3 text-xs text-[var(--muted)]">
                {s.files.filter((f) => f.status === "done").length} of {s.files.length} files done
              </p>
            )}
          </motion.div>
        )}

        {!s.awaitingVerify && s.state === "complete" && (
          <motion.div key="complete" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--accent-soft)] border border-[var(--accent)]/30 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-[var(--accent)]">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="font-[family-name:var(--font-instrument)] font-semibold text-xl text-[var(--ink)] mb-1">
              {s.role === "receiver" ? "Files received" : "Transfer complete"}
            </h3>
            <p className="text-sm text-[var(--muted)] mb-5 max-w-[28ch] mx-auto">
              {s.role === "receiver"
                ? "Downloads started on this device. You can close this tab."
                : "Your files were delivered peer-to-peer. Nothing stayed on a server."}
            </p>
            <ul className="text-left space-y-2 mb-6 max-h-36 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] p-3">
              {s.files.map((f) => (
                <li key={f.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[var(--ink)] truncate">{f.name}</span>
                  <span className="text-xs text-[var(--accent)] shrink-0 tabular-nums">{formatBytes(f.size)}</span>
                </li>
              ))}
            </ul>
            <SpecularButton size="md" radius={12} tint="#635bff" tintOpacity={0.98} textColor="#ffffff" lineColor="#c4b5fd" baseColor="#4c1d95" intensity={1.1} idleIntensity={0.4} className="w-full" onClick={s.reset}>
              {s.role === "receiver" ? "Done" : "Send more files"}
            </SpecularButton>
          </motion.div>
        )}

        {!s.awaitingVerify && s.state === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 sm:p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-500">
                <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <h3 className="font-medium text-[var(--ink)] mb-1">{s.errorTitle}</h3>
            <p className="text-sm text-[var(--muted)] mb-6">{s.errorDetail}</p>
            <SpecularButton size="md" radius={12} tint="#635bff" tintOpacity={0.98} textColor="#ffffff" lineColor="#c4b5fd" baseColor="#4c1d95" intensity={1.1} idleIntensity={0.4} onClick={s.reset}>
              Try again
            </SpecularButton>
          </motion.div>
        )}

        {!s.awaitingVerify && s.state === "idle" && !joinRequest && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 sm:p-8 text-center">
            <p className="text-sm text-[var(--muted)]">Select files or enter a code to begin.</p>
            <button type="button" onClick={s.reset} className="mt-4 text-sm text-[var(--accent)] hover:opacity-80">Back to home</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
