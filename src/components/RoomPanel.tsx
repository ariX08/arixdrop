"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FileProgress, RoomState } from "@/lib/types";
import { formatBytes, generateRoomCode } from "@/lib/webrtc";

interface RoomPanelProps {
  initialRoom?: string | null;
}

export function RoomPanel({ initialRoom }: RoomPanelProps) {
  const [state, setState] = useState<RoomState>("idle");
  const [roomCode, setRoomCode] = useState("");
  const [roomLink, setRoomLink] = useState("");
  const [ttl, setTtl] = useState(15 * 60);
  const [files, setFiles] = useState<FileProgress[]>([]);
  const [overall, setOverall] = useState(0);
  const [speed, setSpeed] = useState("—");
  const [errorTitle, setErrorTitle] = useState("Connection failed");
  const [errorDetail, setErrorDetail] = useState(
    "The other device left or the room expired. Create a new room to try again."
  );
  const [copyFeedback, setCopyFeedback] = useState<"code" | "link" | null>(null);
  const [pendingNames, setPendingNames] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFilesRef = useRef<File[]>([]);
  const ttlRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transferRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (ttlRef.current) clearInterval(ttlRef.current);
    if (transferRef.current) clearInterval(transferRef.current);
    ttlRef.current = null;
    transferRef.current = null;
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  function startTTL(seconds: number) {
    if (ttlRef.current) clearInterval(ttlRef.current);
    let remaining = seconds;
    setTtl(remaining);
    ttlRef.current = setInterval(() => {
      remaining -= 1;
      setTtl(remaining);
      if (remaining <= 0) {
        clearTimers();
        setErrorTitle("Room expired");
        setErrorDetail("Nobody joined in time. Create a new room to send again.");
        setState("error");
      }
    }, 1000);
  }

  function handleSendClick() {
    fileInputRef.current?.click();
  }

  function handleFilesSelected(list: FileList | null) {
    if (!list || list.length === 0) return;
    beginSend(Array.from(list));
  }

  function beginSend(selected: File[]) {
    selectedFilesRef.current = selected;
    setPendingNames(selected.map((f) => f.name));
    setState("creating");
    clearTimers();

    // Create room code — stay in waiting until a real peer joins (no auto-send).
    setTimeout(() => {
      const code = generateRoomCode();
      const link = `${typeof window !== "undefined" ? window.location.origin : ""}?room=${code}`;
      setRoomCode(code);
      setRoomLink(link);
      setState("waiting");
      startTTL(15 * 60);
    }, 600);
  }

  /** Call this when a real peer connects via signaling + WebRTC. */
  function startRealTransfer() {
    const selected = selectedFilesRef.current;
    if (!selected.length) return;
    clearTimers();
    setState("transfer");
    const progress: FileProgress[] = selected.map((f) => ({
      name: f.name,
      size: f.size,
      progress: 0,
      status: "queued" as const,
    }));
    setFiles(progress);
    setOverall(0);
    setSpeed("—");
    // Real chunked WebRTC send goes here. Until wired, we only show waiting for peer.
  }

  // silence unused until WebRTC is wired
  void startRealTransfer;
  void initialRoom;

  async function copy(text: string, kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(kind);
      setTimeout(() => setCopyFeedback(null), 1500);
    } catch {}
  }

  function reset() {
    clearTimers();
    setState("idle");
    setFiles([]);
    setPendingNames([]);
    setOverall(0);
    setSpeed("—");
    selectedFilesRef.current = [];
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function formatTTL(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div
      className="bg-surface border border-border rounded-xl shadow-panel overflow-hidden"
      role="region"
      aria-label="Transfer room"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {state === "idle" && (
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-muted">Room</span>
            <span className="text-xs text-muted/70 tabular-nums">—</span>
          </div>
          <div className="rounded-lg border border-dashed border-border bg-paper/60 min-h-[200px] flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-muted max-w-[24ch]">
              Choose files to create a temporary room and share a short code or link.
            </p>
            <button
              type="button"
              data-select-files
              onClick={handleSendClick}
              className="btn-primary mt-2 inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover active:bg-accent-pressed transition-colors"
            >
              Select files
            </button>
          </div>
        </div>
      )}

      {state === "creating" && (
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-muted">Creating room…</span>
            <span
              className="inline-block w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"
              aria-hidden
            />
          </div>
          <div className="rounded-lg border border-border bg-paper/40 min-h-[200px] flex items-center justify-center">
            <p className="text-sm text-muted">Preparing a secure pairing code</p>
          </div>
        </div>
      )}

      {state === "waiting" && (
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm font-medium text-ink">Room ready</span>
            <span className="text-xs text-muted tabular-nums">
              Expires in {formatTTL(ttl)}
            </span>
          </div>
          <div className="mb-6">
            <label className="block text-xs font-medium text-muted mb-2">
              Share this code
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              <p
                className="room-code font-display font-semibold text-2xl sm:text-3xl text-ink select-all"
                aria-live="polite"
              >
                {roomCode}
              </p>
              <button
                type="button"
                onClick={() => copy(roomCode, "code")}
                className="h-9 px-3 rounded-md border border-border text-sm font-medium text-ink hover:bg-paper active:bg-border/50 transition-colors"
              >
                {copyFeedback === "code" ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-sm text-muted">or share the link below</p>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                readOnly
                value={roomLink}
                className="flex-1 h-10 px-3 rounded-md border border-border bg-paper text-sm text-ink font-mono truncate focus:border-accent"
              />
              <button
                type="button"
                onClick={() => copy(roomLink, "link")}
                className="h-10 px-3 rounded-md border border-border text-sm font-medium hover:bg-paper active:bg-border/50 transition-colors shrink-0"
              >
                {copyFeedback === "link" ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>

          {pendingNames.length > 0 && (
            <div className="mb-4 rounded-lg border border-border bg-paper/40 p-3">
              <p className="text-xs font-medium text-muted mb-2">Ready to send</p>
              <ul className="text-sm space-y-1">
                {pendingNames.map((name) => (
                  <li key={name} className="truncate text-ink">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-border bg-paper/50 p-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-40" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
              </span>
              <p className="text-sm text-muted">
                Waiting for the other device to join… Nothing is sent until they connect.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <button
              type="button"
              onClick={reset}
              className="text-sm text-muted hover:text-ink underline-offset-2 hover:underline"
            >
              Cancel room
            </button>
          </div>
        </div>
      )}

      {state === "transfer" && (
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm font-medium text-ink">Transferring</span>
            <span className="text-xs text-muted tabular-nums">{speed}</span>
          </div>
          <ul className="space-y-4 mb-6" role="list">
            {files.map((f) => (
              <li key={f.name} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate font-medium">{f.name}</span>
                    <span className="text-muted tabular-nums shrink-0 ml-2">
                      {formatBytes(f.size)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className={`progress-fill h-full rounded-full ${
                        f.status === "done" ? "bg-success" : "bg-accent"
                      }`}
                      style={{ width: `${Math.round(f.progress * 100)}%` }}
                    />
                  </div>
                </div>
                <span
                  className={`text-xs tabular-nums w-10 text-right shrink-0 ${
                    f.status === "done" ? "text-success font-medium" : "text-muted"
                  }`}
                >
                  {f.status === "done" ? "Done" : `${Math.round(f.progress * 100)}%`}
                </span>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-border bg-paper/40 p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted">Overall</span>
              <span className="font-medium tabular-nums">{Math.round(overall * 100)}%</span>
            </div>
            <div
              className="h-2 rounded-full bg-border overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(overall * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="progress-fill h-full bg-accent rounded-full"
                style={{ width: `${Math.round(overall * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {state === "complete" && (
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M3.5 8.5l3 3 6-6.5"
                  stroke="#1A7F4B"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <p className="font-medium text-ink">Transfer complete</p>
              <p className="text-sm text-muted">Room will close shortly</p>
            </div>
          </div>
          <ul className="space-y-2 mb-6 text-sm">
            {files.map((f) => (
              <li key={f.name} className="flex justify-between gap-4">
                <span className="truncate">{f.name}</span>
                <span className="text-muted tabular-nums shrink-0">{formatBytes(f.size)}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              reset();
              setTimeout(() => fileInputRef.current?.click(), 50);
            }}
            className="btn-primary h-11 px-5 rounded-lg bg-accent text-white font-medium text-sm hover:bg-accent-hover active:bg-accent-pressed transition-colors"
          >
            Send more files
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-5">
            <span className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M8 5v3.5M8 11h.01"
                  stroke="#C41E3A"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
                <circle cx="8" cy="8" r="6" stroke="#C41E3A" strokeWidth="1.5" />
              </svg>
            </span>
            <div>
              <p className="font-medium text-ink">{errorTitle}</p>
              <p className="text-sm text-muted mt-1">{errorDetail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              reset();
              setTimeout(() => fileInputRef.current?.click(), 50);
            }}
            className="btn-primary h-11 px-5 rounded-lg bg-accent text-white font-medium text-sm hover:bg-accent-hover active:bg-accent-pressed transition-colors"
          >
            Create new room
          </button>
        </div>
      )}
    </div>
  );
}
