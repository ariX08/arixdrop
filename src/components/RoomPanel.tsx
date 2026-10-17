"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FileProgress, RoomState } from "@/lib/types";
import {
  CHUNK_SIZE,
  createDataChannel,
  createPeerConnection,
  formatBytes,
  generateRoomCode,
} from "@/lib/webrtc";
import { SignalingClient } from "@/lib/signaling";
import { prepareFilesForTransfer } from "@/lib/zip";
import { Turnstile } from "@marsidev/react-turnstile";
import { motion, AnimatePresence } from "motion/react";

interface RoomPanelProps {
  joinRequest?: { code: string; nonce: number } | null;
  onJoinHandled?: () => void;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export function RoomPanel({ joinRequest, onJoinHandled }: RoomPanelProps) {
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
  const [channelReady, setChannelReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(!SITE_KEY);
  const [zipping, setZipping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFilesRef = useRef<File[]>([]);
  const ttlRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const roleRef = useRef<"sender" | "receiver" | null>(null);
  const makingOffer = useRef(false);
  const lastJoinNonce = useRef<number>(0);
  const turnstileRef = useRef<any>(null);

  const clearTimers = useCallback(() => {
    if (ttlRef.current) clearInterval(ttlRef.current);
    ttlRef.current = null;
  }, []);

  const teardownRtc = useCallback(() => {
    try { channelRef.current?.close(); } catch {}
    try { pcRef.current?.close(); } catch {}
    channelRef.current = null;
    pcRef.current = null;
    setChannelReady(false);
  }, []);

  const disconnectSignaling = useCallback(() => {
    signalingRef.current?.close();
    signalingRef.current = null;
  }, []);

  useEffect(
    () => () => {
      clearTimers();
      disconnectSignaling();
      teardownRtc();
    },
    [clearTimers, disconnectSignaling, teardownRtc]
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
        teardownRtc();
        setErrorTitle("Room expired");
        setErrorDetail("Nobody joined in time. Create a new room to try again.");
        setState("error");
      }
    }, 1000);
  }

  function setupPeerConnection() {
    if (pcRef.current) return pcRef.current;
    const pc = createPeerConnection(
      (candidate) => {
        try { signalingRef.current?.sendIce(candidate.toJSON()); } catch {}
      },
      (s) => {
        if (s === "failed" || s === "disconnected") setStatusLine("Connection interrupted");
      }
    );
    pcRef.current = pc;
    pc.ondatachannel = (ev) => {
      const ch = ev.channel;
      ch.binaryType = "arraybuffer";
      channelRef.current = ch;
      wireChannel(ch, "receiver");
    };
    return pc;
  }

  function wireChannel(ch: RTCDataChannel, who: "sender" | "receiver") {
    ch.onopen = () => {
      setChannelReady(true);
      setStatusLine(
        who === "sender"
          ? "Connected — press Send files when ready"
          : "Connected — waiting for files…"
      );
    };
    ch.onclose = () => setChannelReady(false);

    if (who === "receiver") {
      let receiveMeta: { name: string; size: number }[] = [];
      let current = 0;
      let received = 0;
      let chunks: ArrayBuffer[] = [];

      ch.onmessage = (ev) => {
        if (typeof ev.data === "string") {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === "manifest") {
              receiveMeta = msg.files;
              current = 0;
              received = 0;
              chunks = [];
              setState("transfer");
              setFiles(
                receiveMeta.map((f: { name: string; size: number }) => ({
                  name: f.name,
                  size: f.size,
                  progress: 0,
                  status: "queued" as const,
                }))
              );
              setOverall(0);
            } else if (msg.type === "file-done") {
              const blob = new Blob(chunks);
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = receiveMeta[current]?.name || "file";
              a.click();
              URL.revokeObjectURL(url);
              chunks = [];
              received = 0;
              setFiles((prev) =>
                prev.map((f, i) => (i === current ? { ...f, progress: 1, status: "done" } : f))
              );
              current += 1;
              if (current >= receiveMeta.length) {
                setOverall(1);
                setState("complete");
              }
            }
          } catch {}
          return;
        }
        const buf = ev.data as ArrayBuffer;
        chunks.push(buf);
        received += buf.byteLength;
        const total = receiveMeta[current]?.size || 1;
        const p = Math.min(1, received / total);
        setFiles((prev) =>
          prev.map((f, i) => (i === current ? { ...f, progress: p, status: "transferring" } : f))
        );
        const doneSizes = receiveMeta.slice(0, current).reduce((a, f) => a + f.size, 0);
        const all = receiveMeta.reduce((a, f) => a + f.size, 0) || 1;
        setOverall((doneSizes + received) / all);
      };
    }
  }

  async function startOffer() {
    if (roleRef.current !== "sender" || makingOffer.current) return;
    makingOffer.current = true;
    try {
      const pc = setupPeerConnection();
      const ch = createDataChannel(pc);
      channelRef.current = ch;
      wireChannel(ch, "sender");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      signalingRef.current?.sendOffer(offer);
    } catch (e) {
      setStatusLine(e instanceof Error ? e.message : "Could not start connection");
    } finally {
      makingOffer.current = false;
    }
  }

  async function handleSignalMessage(ev: {
    type: string;
    payload?: unknown;
    peers?: number;
  }) {
    if (ev.type === "joined" && typeof ev.peers === "number") {
      setPeerCount(ev.peers);
      if (ev.peers >= 2) {
        setStatusLine(
          roleRef.current === "sender"
            ? "Both devices connected — you can send"
            : "Both devices connected — waiting for files"
        );
        if (roleRef.current === "sender") void startOffer();
      } else {
        setStatusLine(
          roleRef.current === "sender"
            ? "Waiting for the other device to join…"
            : "Joined — waiting for the sender…"
        );
      }
    }
    if (ev.type === "peer-joined") {
      setPeerCount(2);
      setStatusLine(
        roleRef.current === "sender"
          ? "Other device joined — preparing connection…"
          : "Sender is here — preparing connection…"
      );
      if (roleRef.current === "sender") void startOffer();
    }
    if (ev.type === "peer-left") {
      setPeerCount((n) => Math.max(1, n - 1));
      setChannelReady(false);
      setStatusLine("Other device left");
    }
    if (ev.type === "offer" && roleRef.current === "receiver" && ev.payload) {
      const pc = setupPeerConnection();
      await pc.setRemoteDescription(ev.payload as RTCSessionDescriptionInit);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      signalingRef.current?.sendAnswer(answer);
    }
    if (ev.type === "answer" && roleRef.current === "sender" && ev.payload) {
      if (pcRef.current) await pcRef.current.setRemoteDescription(ev.payload as RTCSessionDescriptionInit);
    }
    if (ev.type === "ice" && ev.payload) {
      try {
        await pcRef.current?.addIceCandidate(ev.payload as RTCIceCandidateInit);
      } catch {}
    }
    if (ev.type === "error") {
      setErrorTitle("Room error");
      setErrorDetail(String(ev.payload || "Unknown"));
      setState("error");
    }
  }

  async function connectAndJoin(code: string, as: "sender" | "receiver") {
    roleRef.current = as;
    disconnectSignaling();
    teardownRtc();
    const client = new SignalingClient();
    signalingRef.current = client;
    client.on((ev) => {
      void handleSignalMessage(ev as { type: string; payload?: unknown; peers?: number });
      if (ev.type === "socket-error") {
        setErrorTitle("Signaling unavailable");
        setErrorDetail(ev.message);
        setState("error");
      }
    });
    await client.connect(code);
  }

  useEffect(() => {
    if (!joinRequest) return;
    const code = joinRequest.code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length !== 6) return;
    if (joinRequest.nonce === lastJoinNonce.current) return;
    lastJoinNonce.current = joinRequest.nonce;

    let cancelled = false;
    (async () => {
      if (SITE_KEY && !turnstileToken) {
        setStatusLine("Verifying…");
        await new Promise((r) => setTimeout(r, 800));
      }

      clearTimers();
      disconnectSignaling();
      teardownRtc();
      setRole("receiver");
      roleRef.current = "receiver";
      setState("connecting");
      setStatusLine("Connecting to room…");
      setRoomCode(code);
      setRoomLink("");
      setPendingNames([]);
      setPeerCount(0);
      try {
        await connectAndJoin(code, "receiver");
        if (!cancelled) {
          setState("waiting");
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

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinRequest?.nonce, joinRequest?.code]);

  function handleSendClick() {
    fileInputRef.current?.click();
  }

  function handleFilesSelected(list: FileList | null) {
    if (!list || list.length === 0) return;
    beginSend(Array.from(list));
  }

  async function beginSend(selected: File[]) {
    if (SITE_KEY && !turnstileToken) {
      setStatusLine("Please wait for verification…");
      try { turnstileRef.current?.execute?.(); } catch {}
      await new Promise((r) => setTimeout(r, 1200));
      if (!turnstileToken) {
        setErrorTitle("Verification required");
        setErrorDetail("Cloudflare Turnstile could not verify this action. Please refresh and try again.");
        setState("error");
        return;
      }
    }

    let filesToSend = selected;
    if (selected.length > 1) {
      setZipping(true);
      setStatusLine(`Zipping ${selected.length} files…`);
      try {
        filesToSend = await prepareFilesForTransfer(selected);
        setPendingNames([filesToSend[0].name]);
      } catch {
        setErrorTitle("Zip failed");
        setErrorDetail("Could not create zip archive. Try sending fewer files.");
        setState("error");
        setZipping(false);
        return;
      }
      setZipping(false);
    } else {
      setPendingNames(selected.map((f) => f.name));
    }

    selectedFilesRef.current = filesToSend;
    setRole("sender");
    roleRef.current = "sender";
    setState("creating");
    clearTimers();
    disconnectSignaling();
    teardownRtc();

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
      setStatusLine(e instanceof Error ? e.message : "Signaling offline");
      startTTL(15 * 60);
    }
  }

  async function sendFilesNow() {
    const ch = channelRef.current;
    const selected = selectedFilesRef.current;
    if (!ch || ch.readyState !== "open" || !selected.length) {
      setStatusLine("Wait until both devices are connected (2/2), then try again.");
      return;
    }

    setSending(true);
    setState("transfer");
    setFiles(
      selected.map((f) => ({
        name: f.name,
        size: f.size,
        progress: 0,
        status: "queued" as const,
      }))
    );

    const totalSize = selected.reduce((a, f) => a + f.size, 0) || 1;
    let sentTotal = 0;
    const t0 = performance.now();

    ch.send(
      JSON.stringify({
        type: "manifest",
        files: selected.map((f) => ({ name: f.name, size: f.size })),
      })
    );

    for (let fi = 0; fi < selected.length; fi++) {
      const file = selected[fi];
      let offset = 0;
      setFiles((prev) => prev.map((f, i) => (i === fi ? { ...f, status: "transferring" } : f)));

      while (offset < file.size) {
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const buf = await slice.arrayBuffer();
        while (ch.bufferedAmount > 2 * 1024 * 1024) {
          await new Promise((r) => setTimeout(r, 20));
        }
        ch.send(buf);
        offset += buf.byteLength;
        sentTotal += buf.byteLength;
        const p = offset / file.size;
        setFiles((prev) => prev.map((f, i) => (i === fi ? { ...f, progress: p } : f)));
        setOverall(sentTotal / totalSize);
        const elapsed = (performance.now() - t0) / 1000;
        if (elapsed > 0.2) {
          setSpeed(`${(sentTotal / (1024 * 1024) / elapsed).toFixed(1)} MB/s`);
        }
      }

      ch.send(JSON.stringify({ type: "file-done", index: fi }));
      setFiles((prev) =>
        prev.map((f, i) => (i === fi ? { ...f, progress: 1, status: "done" } : f))
      );
    }

    setOverall(1);
    setState("complete");
    setSending(false);
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
    teardownRtc();
    setState("idle");
    setRole(null);
    roleRef.current = null;
    setFiles([]);
    setPendingNames([]);
    setOverall(0);
    setSpeed("—");
    setStatusLine("");
    setPeerCount(0);
    setSending(false);
    setZipping(false);
    setRoomCode("");
    setRoomLink("");
    selectedFilesRef.current = [];
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTurnstileToken(null);
    try { turnstileRef.current?.reset?.(); } catch {}
  }

  function formatTTL(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const canSend =
    role === "sender" && peerCount >= 2 && channelReady && !sending && state === "waiting";

  return (
    <div className="glass rounded-2xl shadow-2xl overflow-hidden" role="region" aria-label="Transfer room">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {SITE_KEY && (
        <div className="absolute opacity-0 pointer-events-none h-0 overflow-hidden">
          <Turnstile
            ref={turnstileRef}
            siteKey={SITE_KEY}
            options={{ size: "invisible", appearance: "interaction-only" }}
            onSuccess={(token) => { setTurnstileToken(token); setTurnstileReady(true); }}
            onError={() => { setTurnstileReady(false); setTurnstileToken(null); }}
            onExpire={() => { setTurnstileToken(null); try { turnstileRef.current?.reset?.(); } catch {} }}
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-medium text-[var(--muted)]">Room</span>
              <span className="text-xs text-[var(--muted)] tabular-nums opacity-60">—</span>
            </div>
            <div
              className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--accent-soft)]/30 min-h-[200px] flex flex-col items-center justify-center gap-4 px-6 text-center cursor-pointer hover:bg-[var(--accent-soft)]/50 hover:border-blue-400/40 transition-colors"
              onClick={handleSendClick}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-blue-400/50"); }}
              onDragLeave={(e) => e.currentTarget.classList.remove("border-blue-400/50")}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-blue-400/50");
                handleFilesSelected(e.dataTransfer.files);
              }}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-blue-500">
                  <path d="M12 16V8M12 8L8.5 11.5M12 8l3.5 3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 18h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--ink)]">Drop files here or click</p>
                <p className="text-xs text-[var(--muted)] mt-1">Multiple files → auto zipped</p>
              </div>
              <button
                type="button"
                data-select-files
                onClick={(e) => { e.stopPropagation(); handleSendClick(); }}
                className="btn-primary mt-1 h-10 px-5 rounded-xl text-sm"
              >
                Select files
              </button>
            </div>
          </motion.div>
        )}

        {(state === "creating" || state === "connecting" || zipping) && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-medium text-[var(--muted)]">
                {zipping ? "Zipping files…" : state === "connecting" ? "Joining room…" : "Creating room…"}
              </span>
              <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-sm text-[var(--muted)] text-center py-10">{statusLine || "Working…"}</p>
          </motion.div>
        )}

        {state === "waiting" && (
          <motion.div key="waiting" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-medium text-[var(--ink)]">
                {role === "receiver" ? "Joined room" : "Room ready"}
              </span>
              <span className="text-xs text-[var(--muted)] tabular-nums">Expires in {formatTTL(ttl)}</span>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-medium text-[var(--muted)] mb-2">Room code</label>
              <div className="flex items-center gap-3 flex-wrap">
                <p className="room-code font-[family-name:var(--font-instrument)] font-semibold text-2xl sm:text-3xl text-[var(--ink)] select-all tracking-widest">
                  {roomCode}
                </p>
                {role === "sender" && (
                  <button type="button" onClick={() => copy(roomCode, "code")} className="h-9 px-3 rounded-lg border border-[var(--border-strong)] text-sm font-medium text-[var(--ink)] hover:bg-[var(--accent-soft)] transition">
                    {copyFeedback === "code" ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
              {role === "sender" && roomLink && (
                <div className="mt-3 flex gap-2">
                  <input type="text" readOnly value={roomLink} className="flex-1 h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm font-mono text-[var(--muted)] truncate" />
                  <button type="button" onClick={() => copy(roomLink, "link")} className="h-10 px-3 rounded-lg border border-[var(--border-strong)] text-sm font-medium text-[var(--ink)] hover:bg-[var(--accent-soft)] shrink-0 transition">
                    {copyFeedback === "link" ? "Copied" : "Copy link"}
                  </button>
                </div>
              )}
            </div>

            {role === "sender" && pendingNames.length > 0 && (
              <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--accent-soft)]/20 p-3">
                <p className="text-xs font-medium text-[var(--muted)] mb-2">Ready to send</p>
                <ul className="space-y-1">
                  {pendingNames.map((name) => (
                    <li key={name} className="text-sm text-[var(--ink)] truncate">{name}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-sm text-[var(--muted)]">{statusLine}</p>
              <span className="text-xs font-medium tabular-nums text-[var(--muted)]">{peerCount}/2</span>
            </div>

            {role === "sender" && (
              <button type="button" onClick={sendFilesNow} disabled={!canSend} className="w-full h-12 rounded-xl btn-primary text-base disabled:opacity-40">
                {canSend ? "Send files" : "Waiting for connection…"}
              </button>
            )}

            <button type="button" onClick={reset} className="w-full mt-3 h-10 rounded-xl text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">
              Cancel
            </button>
          </motion.div>
        )}

        {(state === "transfer" || state === "complete") && (
          <motion.div key="transfer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-medium text-[var(--ink)]">
                {state === "complete" ? "Transfer complete" : "Transferring…"}
              </span>
              <span className="text-xs text-[var(--muted)] tabular-nums">{speed}</span>
            </div>

            <div className="mb-5">
              <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 progress-fill" style={{ width: `${Math.round(overall * 100)}%` }} />
              </div>
              <p className="text-xs text-[var(--muted)] mt-1.5 tabular-nums">{Math.round(overall * 100)}%</p>
            </div>

            <ul className="space-y-3 max-h-48 overflow-y-auto">
              {files.map((f) => (
                <li key={f.name} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--ink)] truncate">{f.name}</p>
                    <div className="h-1 mt-1 rounded-full bg-[var(--border)] overflow-hidden">
                      <div className="h-full rounded-full bg-blue-400/80 progress-fill" style={{ width: `${Math.round(f.progress * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-[var(--muted)] tabular-nums shrink-0">
                    {f.status === "done" ? "Done" : formatBytes(f.size)}
                  </span>
                </li>
              ))}
            </ul>

            {state === "complete" && (
              <button type="button" onClick={reset} className="w-full mt-6 h-11 rounded-xl btn-primary text-sm">
                Send more files
              </button>
            )}
          </motion.div>
        )}

        {state === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 sm:p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-500">
                <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <h3 className="font-medium text-[var(--ink)] mb-1">{errorTitle}</h3>
            <p className="text-sm text-[var(--muted)] mb-6">{errorDetail}</p>
            <button type="button" onClick={reset} className="h-11 px-6 rounded-xl btn-primary text-sm">
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
