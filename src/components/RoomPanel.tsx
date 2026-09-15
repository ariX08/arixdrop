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
  const [channelReady, setChannelReady] = useState(false);
  const [sending, setSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFilesRef = useRef<File[]>([]);
  const ttlRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const roleRef = useRef<"sender" | "receiver" | null>(null);
  const makingOffer = useRef(false);

  const clearTimers = useCallback(() => {
    if (ttlRef.current) clearInterval(ttlRef.current);
    ttlRef.current = null;
  }, []);

  const teardownRtc = useCallback(() => {
    try {
      channelRef.current?.close();
    } catch {}
    try {
      pcRef.current?.close();
    } catch {}
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
        try {
          signalingRef.current?.sendIce(candidate.toJSON());
        } catch {}
      },
      (s) => {
        if (s === "failed" || s === "disconnected") {
          setStatusLine("Connection interrupted");
        }
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
                prev.map((f, i) =>
                  i === current ? { ...f, progress: 1, status: "done" } : f
                )
              );
              current += 1;
              if (current >= receiveMeta.length) {
                setOverall(1);
                setState("complete");
                setStatusLine("All files received");
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
          prev.map((f, i) =>
            i === current ? { ...f, progress: p, status: "transferring" } : f
          )
        );
        const doneSizes = receiveMeta
          .slice(0, current)
          .reduce((a, f) => a + f.size, 0);
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
    from?: string;
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
        if (roleRef.current === "sender") {
          void startOffer();
        }
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
      const pc = pcRef.current;
      if (pc) await pc.setRemoteDescription(ev.payload as RTCSessionDescriptionInit);
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
    const code = (joinCode || initialRoom || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!code || code.length !== 6) return;
    if (state !== "idle") return;

    let cancelled = false;
    (async () => {
      setRole("receiver");
      roleRef.current = "receiver";
      setState("connecting");
      setStatusLine("Connecting to room…");
      setRoomCode(code);
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
      setFiles((prev) =>
        prev.map((f, i) =>
          i === fi ? { ...f, status: "transferring" } : f
        )
      );

      while (offset < file.size) {
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const buf = await slice.arrayBuffer();

        // Backpressure
        while (ch.bufferedAmount > 2 * 1024 * 1024) {
          await new Promise((r) => setTimeout(r, 20));
        }
        ch.send(buf);
        offset += buf.byteLength;
        sentTotal += buf.byteLength;

        const p = offset / file.size;
        setFiles((prev) =>
          prev.map((f, i) => (i === fi ? { ...f, progress: p } : f))
        );
        setOverall(sentTotal / totalSize);
        const elapsed = (performance.now() - t0) / 1000;
        if (elapsed > 0.2) {
          setSpeed(`${(sentTotal / (1024 * 1024) / elapsed).toFixed(1)} MB/s`);
        }
      }

      ch.send(JSON.stringify({ type: "file-done", index: fi }));
      setFiles((prev) =>
        prev.map((f, i) =>
          i === fi ? { ...f, progress: 1, status: "done" } : f
        )
      );
    }

    setOverall(1);
    setState("complete");
    setSending(false);
    setStatusLine("Transfer complete");
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

  const canSend =
    role === "sender" && peerCount >= 2 && channelReady && !sending && state === "waiting";

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
          <div className="rounded-lg border border-border bg-paper/40 min-h-[120px] flex items-center justify-center px-4 text-center">
            <p className="text-sm text-muted">{statusLine || "Connecting…"}</p>
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
              <p className="room-code font-display font-semibold text-2xl sm:text-3xl text-ink select-all">
                {roomCode}
              </p>
              {role === "sender" && (
                <button
                  type="button"
                  onClick={() => copy(roomCode, "code")}
                  className="h-9 px-3 rounded-md border border-border text-sm font-medium hover:bg-paper transition-colors"
                >
                  {copyFeedback === "code" ? "Copied" : "Copy"}
                </button>
              )}
            </div>
            {role === "sender" && roomLink && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={roomLink}
                  className="flex-1 h-10 px-3 rounded-md border border-border bg-paper text-sm font-mono truncate"
                />
                <button
                  type="button"
                  onClick={() => copy(roomLink, "link")}
                  className="h-10 px-3 rounded-md border border-border text-sm font-medium hover:bg-paper shrink-0"
                >
                  {copyFeedback === "link" ? "Copied" : "Copy link"}
                </button>
              </div>
            )}
          </div>

          {role === "sender" && pendingNames.length > 0 && (
            <div className="mb-4 rounded-lg border border-border bg-paper/40 p-3">
              <p className="text-xs font-medium text-muted mb-2">Ready to send</p>
              <ul className="text-sm space-y-1">
                {pendingNames.map((name) => (
                  <li key={name} className="truncate">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-border bg-paper/50 p-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-40" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
              </span>
              <div className="text-sm text-muted">
                <p>{statusLine || "Waiting…"}</p>
                <p className="text-xs mt-1 tabular-nums">{peerCount}/2 devices in room</p>
              </div>
            </div>
          </div>

          {/* SEND BUTTON — sender only, when peer connected + data channel open */}
          {role === "sender" && (
            <button
              type="button"
              disabled={!canSend}
              onClick={() => void sendFilesNow()}
              className="btn-primary w-full h-12 rounded-lg bg-accent text-white font-medium text-base hover:bg-accent-hover active:bg-accent-pressed disabled:opacity-40 disabled:cursor-not-allowed transition-colors mb-3"
            >
              {sending
                ? "Sending…"
                : canSend
                  ? "Send files"
                  : peerCount < 2
                    ? "Waiting for other device…"
                    : "Connecting…"}
            </button>
          )}

          <button
            type="button"
            onClick={reset}
            className="text-sm text-muted hover:text-ink underline-offset-2 hover:underline"
          >
            {role === "receiver" ? "Leave room" : "Cancel room"}
          </button>
        </div>
      )}

      {state === "transfer" && (
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm font-medium text-ink">
              {role === "receiver" ? "Receiving" : "Sending"}
            </span>
            <span className="text-xs text-muted tabular-nums">{speed}</span>
          </div>
          <ul className="space-y-4 mb-6">
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
                <span className="text-xs tabular-nums w-10 text-right text-muted">
                  {f.status === "done" ? "Done" : `${Math.round(f.progress * 100)}%`}
                </span>
              </li>
            ))}
          </ul>
          <div className="h-2 rounded-full bg-border overflow-hidden">
            <div
              className="progress-fill h-full bg-accent rounded-full"
              style={{ width: `${Math.round(overall * 100)}%` }}
            />
          </div>
        </div>
      )}

      {state === "complete" && (
        <div className="p-6 sm:p-8">
          <p className="font-medium text-ink mb-2">
            {role === "receiver" ? "Files received" : "Transfer complete"}
          </p>
          <p className="text-sm text-muted mb-5">
            {role === "receiver"
              ? "Check your downloads folder."
              : "The other device should have the files."}
          </p>
          <button
            type="button"
            onClick={reset}
            className="btn-primary h-11 px-5 rounded-lg bg-accent text-white font-medium text-sm hover:bg-accent-hover transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="p-6 sm:p-8">
          <p className="font-medium text-ink">{errorTitle}</p>
          <p className="text-sm text-muted mt-1 mb-5">{errorDetail}</p>
          <button
            type="button"
            onClick={reset}
            className="btn-primary h-11 px-5 rounded-lg bg-accent text-white font-medium text-sm hover:bg-accent-hover transition-colors"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
