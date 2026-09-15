"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FileProgress, RoomState } from "@/lib/types";
import { formatBytes, generateRoomCode } from "@/lib/webrtc";
import { SignalingClient } from "@/lib/signaling";

interface RoomPanelProps {
  initialRoom?: string | null;
  joinCode?: string | null;
  onJoinHandled?: () => void;
}

export function RoomPanel({ initialRoom, joinCode, onJoinHandled }: RoomPanelProps) {
  const [state, setState] = useState<RoomState>("idle");
  const [role, setRole] = useState<"sender" | "receiver" | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [roomLink, setRoomLink] = useState("");
  const [ttl, setTtl] = useState(15 * 60);
  const [files, setFiles] = useState<FileProgress[]>([]);
  const [overall, setOverall] = useState(0);
  const [speed, setSpeed] = useState("—");
  const [errorTitle, setErrorTitle] = useState("Connection failed");
  const [errorDetail, setErrorDetail] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<"code" | "link" | null>(null);
  const [pendingNames, setPendingNames] = useState<string[]>([]);
  const [statusLine, setStatusLine] = useState("");
  const [peerCount, setPeerCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFilesRef = useRef<File[]>([]);
  const ttlRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);

  const clearTimers = useCallback(() => {
    if (ttlRef.current) clearInterval(ttlRef.current);
    ttlRef.current = null;
  }, []);

  const disconnectSignaling = useCallback(() => {
    signalingRef.current?.close();
    signalingRef.current = null;
  }, []);

  useEffect(
    () => () => {
      clearTimers();
      disconnectSignaling();
    },
    [clearTimers, disconnectSignaling]
  );

  function startTTL(seconds: number) {
    clearTimers();
    let remaining = seconds;
    setTtl(remaining);
    ttlRef.current = setInterval(() => {
      remaining -= 1;
      setTtl(remaining);
      if (remaining <= 0) {
        clearTimers();
        disconnectSignaling();
        setErrorTitle("Room expired");
        setErrorDetail("Nobody joined in time. Create a new room to try again.");
        setState("error");
      }
    }, 1000);
  }

  async function connectAndJoin(code: string, as: "sender" | "receiver") {
    const client = new SignalingClient();
    signalingRef.current = client;

    client.on((ev) => {
      if (ev.type === "joined") {
        setPeerCount(ev.peers);
        setStatusLine(
          ev.peers >= 2
            ? "Both devices are in the room"
            : as === "sender"
              ? "Waiting for the other device to join…"
              : "Joined — waiting for the sender…"
        );
        if (as === "receiver") {
          setState("waiting");
          setRole("receiver");
          setRoomCode(code);
        }
      }
      if (ev.type === "peer-joined") {
        setPeerCount(2);
        setStatusLine("Other device joined the room");
      }
      if (ev.type === "peer-left") {
        setPeerCount((n) => Math.max(1, n - 1));
        setStatusLine("Other device left");
      }
      if (ev.type === "error") {
        clearTimers();
        disconnectSignaling();
        setErrorTitle("Could not join room");
        setErrorDetail(String(ev.payload || "Unknown error"));
        setState("error");
      }
      if (ev.type === "socket-error") {
        clearTimers();
        setErrorTitle("Signaling unavailable");
        setErrorDetail(
          ev.message +
            " Set NEXT_PUBLIC_SIGNALING_URL in Vercel to your Worker wss://…/ws URL."
        );
        setState("error");
      }
    });

    // Room is part of the WebSocket URL so Cloudflare routes both peers to the same Durable Object
    await client.connect(code);
  }

  useEffect(() => {
    const code = (joinCode || initialRoom || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!code || code.length !== 6) return;
    if (state !== "idle") return;

    let cancelled = false;
    (async () => {
      setRole("receiver");
      setState("connecting");
      setStatusLine("Connecting to room…");
      setRoomCode(code);
      try {
        await connectAndJoin(code, "receiver");
        if (!cancelled) {
          startTTL(15 * 60);
          onJoinHandled?.();
        }
      } catch (e) {
        if (!cancelled) {
          setErrorTitle("Could not join");
          setErrorDetail(e instanceof Error ? e.message : "Connection failed");
          setState("error");
          onJoinHandled?.();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode, initialRoom]);

  function handleSendClick() {
    fileInputRef.current?.click();
  }

  function handleFilesSelected(list: FileList | null) {
    if (!list || list.length === 0) return;
    beginSend(Array.from(list));
  }

  async function beginSend(selected: File[]) {
    selectedFilesRef.current = selected;
    setPendingNames(selected.map((f) => f.name));
    setRole("sender");
    setState("creating");
    clearTimers();
    disconnectSignaling();

    const code = generateRoomCode();
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}?room=${code}`;
    setRoomCode(code);
    setRoomLink(link);

    try {
      await connectAndJoin(code, "sender");
      setState("waiting");
      setStatusLine("Waiting for the other device to join…");
      startTTL(15 * 60);
    } catch (e) {
      setState("waiting");
      setStatusLine(
        e instanceof Error
          ? e.message
          : "Signaling offline — code is ready, but peers cannot connect yet."
      );
      startTTL(15 * 60);
    }
  }

  async function copy(text: string, kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(kind);
      setTimeout(() => setCopyFeedback(null), 1500);
    } catch {}
  }

  function reset() {
    clearTimers();
    disconnectSignaling();
    setState("idle");
    setRole(null);
    setFiles([]);
    setPendingNames([]);
    setOverall(0);
    setSpeed("—");
    setStatusLine("");
    setPeerCount(0);
    setRoomCode("");
    setRoomLink("");
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
              Choose files to create a room, or enter a code to join one.
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

      {(state === "creating" || state === "connecting") && (
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-muted">
              {state === "connecting" ? "Joining room…" : "Creating room…"}
            </span>
            <span
              className="inline-block w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"
              aria-hidden
            />
          </div>
          <div className="rounded-lg border border-border bg-paper/40 min-h-[160px] flex items-center justify-center px-4 text-center">
            <p className="text-sm text-muted">{statusLine || "Connecting to signaling…"}</p>
          </div>
        </div>
      )}

      {state === "waiting" && (
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm font-medium text-ink">
              {role === "receiver" ? "Joined room" : "Room ready"}
            </span>
            <span className="text-xs text-muted tabular-nums">Expires in {formatTTL(ttl)}</span>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-medium text-muted mb-2">Room code</label>
            <div className="flex items-center gap-3 flex-wrap">
              <p
                className="room-code font-display font-semibold text-2xl sm:text-3xl text-ink select-all"
                aria-live="polite"
              >
                {roomCode}
              </p>
              {role === "sender" && (
                <button
                  type="button"
                  onClick={() => copy(roomCode, "code")}
                  className="h-9 px-3 rounded-md border border-border text-sm font-medium text-ink hover:bg-paper active:bg-border/50 transition-colors"
                >
                  {copyFeedback === "code" ? "Copied" : "Copy"}
                </button>
              )}
            </div>

            {role === "sender" && roomLink && (
              <>
                <p className="mt-2 text-sm text-muted">or share the link</p>
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
              </>
            )}
          </div>

          {role === "sender" && pendingNames.length > 0 && (
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
              <div className="text-sm text-muted">
                <p>{statusLine || "Waiting…"}</p>
                {peerCount > 0 && (
                  <p className="text-xs mt-1 tabular-nums">{peerCount}/2 devices in room</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={reset}
              className="text-sm text-muted hover:text-ink underline-offset-2 hover:underline"
            >
              {role === "receiver" ? "Leave room" : "Cancel room"}
            </button>
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-5">
            <span className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 5v3.5M8 11h.01" stroke="#C41E3A" strokeWidth="1.75" strokeLinecap="round" />
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
            onClick={reset}
            className="btn-primary h-11 px-5 rounded-lg bg-accent text-white font-medium text-sm hover:bg-accent-hover active:bg-accent-pressed transition-colors"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
