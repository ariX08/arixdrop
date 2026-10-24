"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FileProgress, RoomState } from "@/lib/types";
import {
  BUFFER_HIGH,
  CHUNK_SIZE,
  createDataChannel,
  createPeerConnection,
  generateRoomCode,
} from "@/lib/webrtc";
import { SignalingClient } from "@/lib/signaling";
import { prepareFilesForTransfer } from "@/lib/zip";

export interface UseRoomSessionArgs {
  joinRequest?: { code: string; nonce: number } | null;
  initialFiles?: File[] | null;
  onJoinHandled?: () => void;
  onReset?: () => void;
  siteKey: string;
}

export function useRoomSession({
  joinRequest,
  initialFiles,
  onJoinHandled,
  onReset,
  siteKey,
}: UseRoomSessionArgs) {
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
  const [zipping, setZipping] = useState(false);
  const [awaitingVerify, setAwaitingVerify] = useState(!!(initialFiles && initialFiles.length > 0));

  const selectedFilesRef = useRef<File[]>(initialFiles ?? []);
  const ttlRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reofferRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const roleRef = useRef<"sender" | "receiver" | null>(null);
  const makingOffer = useRef(false);
  const offerSent = useRef(false);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const remoteReady = useRef(false);
  const lastJoinNonce = useRef(0);
  const startedFromFiles = useRef(false);
  const restartAttempts = useRef(0);

  useEffect(() => {
    if (initialFiles?.length && !startedFromFiles.current) {
      selectedFilesRef.current = initialFiles;
      setPendingNames(initialFiles.map((f) => f.name));
      setAwaitingVerify(true);
      setRole("sender");
      roleRef.current = "sender";
      startedFromFiles.current = true;
    }
  }, [initialFiles]);

  const clearTimers = useCallback(() => {
    if (ttlRef.current) clearInterval(ttlRef.current);
    ttlRef.current = null;
    if (reofferRef.current) clearTimeout(reofferRef.current);
    reofferRef.current = null;
  }, []);

  const teardownRtc = useCallback(() => {
    if (reofferRef.current) clearTimeout(reofferRef.current);
    reofferRef.current = null;
    try { channelRef.current?.close(); } catch { /* */ }
    try { pcRef.current?.close(); } catch { /* */ }
    channelRef.current = null;
    pcRef.current = null;
    pendingIce.current = [];
    remoteReady.current = false;
    offerSent.current = false;
    makingOffer.current = false;
    restartAttempts.current = 0;
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
    if (ttlRef.current) clearInterval(ttlRef.current);
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

  async function flushPendingIce(pc: RTCPeerConnection) {
    const queued = pendingIce.current.splice(0);
    for (const c of queued) {
      try {
        if (c.candidate === "") await pc.addIceCandidate(null);
        else await pc.addIceCandidate(c);
      } catch { /* */ }
    }
  }

  function scheduleReoffer() {
    if (reofferRef.current) clearTimeout(reofferRef.current);
    reofferRef.current = setTimeout(() => {
      if (channelRef.current?.readyState === "open") return;
      if (roleRef.current !== "sender") return;
      if (restartAttempts.current >= 3) {
        setStatusLine("Could not connect. Cancel and create a new room.");
        return;
      }
      restartAttempts.current += 1;
      setStatusLine(`Retrying connection (${restartAttempts.current}/3)…`);
      offerSent.current = false;
      makingOffer.current = false;
      void startOffer(true);
    }, 2500);
  }

  function setupPeerConnection() {
    if (pcRef.current) return pcRef.current;
    const pc = createPeerConnection(
      (candidate) => {
        try {
          signalingRef.current?.sendIce(
            candidate ? candidate.toJSON() : { candidate: "" }
          );
        } catch { /* */ }
      },
      (s) => {
        if (s === "connected") {
          setStatusLine("Connected — opening data channel…");
        } else if (s === "failed") {
          setChannelReady(false);
          setStatusLine("Connection failed — retrying…");
          if (roleRef.current === "sender") {
            offerSent.current = false;
            makingOffer.current = false;
            void startOffer(true);
          }
        } else if (s === "disconnected") {
          setStatusLine("Connection interrupted — waiting…");
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
      if (reofferRef.current) clearTimeout(reofferRef.current);
      reofferRef.current = null;
      restartAttempts.current = 0;
      setChannelReady(true);
      setStatusLine(
        who === "sender"
          ? "Connected — press Send files when ready"
          : "Connected — waiting for files…"
      );
    };
    ch.onclose = () => setChannelReady(false);
    ch.onerror = () => {
      setStatusLine("Data channel error");
    };
    if (who !== "receiver") return;

    let receiveMeta: { name: string; size: number }[] = [];
    let current = 0;
    let received = 0;
    let chunks: BlobPart[] = [];
    let lastUi = 0;
    let recvT0 = 0;

    ch.onmessage = (ev) => {
      if (typeof ev.data === "string") {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "manifest") {
            receiveMeta = msg.files;
            current = 0;
            received = 0;
            chunks = [];
            lastUi = 0;
            recvT0 = performance.now();
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
            const name = receiveMeta[current]?.name || "file";
            const blob = new Blob(chunks, { type: "application/octet-stream" });
            chunks = [];
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = name;
            a.rel = "noopener";
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
        } catch { /* */ }
        return;
      }

      const raw = ev.data as ArrayBuffer;
      chunks.push(raw);
      received += raw.byteLength;
      const total = receiveMeta[current]?.size || 1;
      const p = Math.min(1, received / total);
      const doneSizes = receiveMeta.slice(0, current).reduce((a, f) => a + f.size, 0);
      const all = receiveMeta.reduce((a, f) => a + f.size, 0) || 1;
      const overallP = (doneSizes + received) / all;
      const now = performance.now();
      if (now - lastUi > 150 || p >= 1) {
        lastUi = now;
        setFiles((prev) =>
          prev.map((f, i) => (i === current ? { ...f, progress: p, status: "transferring" } : f))
        );
        setOverall(overallP);
        if (recvT0) {
          const elapsed = (now - recvT0) / 1000;
          if (elapsed > 0.25) {
            setSpeed(`${((doneSizes + received) / (1024 * 1024) / elapsed).toFixed(1)} MB/s`);
          }
        }
      }
    };
  }

  async function startOffer(iceRestart = false) {
    if (roleRef.current !== "sender") return;
    if (makingOffer.current) return;
    if (offerSent.current && !iceRestart) return;
    if (channelRef.current?.readyState === "open") return;

    makingOffer.current = true;
    try {
      const pc = setupPeerConnection();
      if (!channelRef.current || channelRef.current.readyState === "closed") {
        const ch = createDataChannel(pc);
        channelRef.current = ch;
        wireChannel(ch, "sender");
      }
      const offer = await pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
      await pc.setLocalDescription(offer);
      signalingRef.current?.sendOffer(offer);
      offerSent.current = true;
      setStatusLine("Negotiating connection…");
      scheduleReoffer();
    } catch (e) {
      setStatusLine(e instanceof Error ? e.message : "Could not start connection");
      offerSent.current = false;
    } finally {
      makingOffer.current = false;
    }
  }

  async function handleSignalMessage(ev: { type: string; payload?: unknown; peers?: number }) {
    if (ev.type === "joined" && typeof ev.peers === "number") {
      setPeerCount(ev.peers);
      if (ev.peers >= 2) {
        setStatusLine(
          roleRef.current === "sender"
            ? "Both devices in room — connecting…"
            : "Both devices in room — waiting for connection…"
        );
        if (roleRef.current === "sender") void startOffer(false);
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
          ? "Other device joined — connecting…"
          : "Sender is here — waiting for connection…"
      );
      if (roleRef.current === "sender") void startOffer(false);
    }
    if (ev.type === "peer-left") {
      setPeerCount((n) => Math.max(0, n - 1));
      setChannelReady(false);
      offerSent.current = false;
      setStatusLine("Other device left");
    }
    if (ev.type === "offer" && roleRef.current === "receiver" && ev.payload) {
      try {
        const pc = setupPeerConnection();
        const desc = ev.payload as RTCSessionDescriptionInit;
        if (pc.signalingState === "have-local-offer") return;
        await pc.setRemoteDescription(desc);
        remoteReady.current = true;
        await flushPendingIce(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signalingRef.current?.sendAnswer(answer);
        setStatusLine("Finishing connection…");
      } catch (e) {
        setStatusLine(e instanceof Error ? e.message : "Failed to accept connection");
      }
    }
    if (ev.type === "answer" && roleRef.current === "sender" && ev.payload) {
      try {
        const pc = pcRef.current;
        if (!pc) return;
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(ev.payload as RTCSessionDescriptionInit);
          remoteReady.current = true;
          await flushPendingIce(pc);
          setStatusLine("Finishing connection…");
        }
      } catch {
        /* ignore duplicate */
      }
    }
    if (ev.type === "ice" && ev.payload) {
      const init = ev.payload as RTCIceCandidateInit;
      const pc = pcRef.current;
      if (!pc || !remoteReady.current) {
        pendingIce.current.push(init);
      } else {
        try {
          if (init.candidate === "") await pc.addIceCandidate(null);
          else await pc.addIceCandidate(init);
        } catch { /* */ }
      }
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
      clearTimers();
      disconnectSignaling();
      teardownRtc();
      setRole("receiver");
      roleRef.current = "receiver";
      setAwaitingVerify(false);
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
          try { setupPeerConnection(); } catch { /* */ }
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

  async function confirmAndCreateRoom() {
    if (siteKey && !turnstileToken) {
      setStatusLine("Complete verification to continue");
      return;
    }
    const selected = selectedFilesRef.current;
    if (!selected.length) return;
    setAwaitingVerify(false);
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
      try {
        const pc = setupPeerConnection();
        if (!channelRef.current) {
          const ch = createDataChannel(pc);
          channelRef.current = ch;
          wireChannel(ch, "sender");
        }
      } catch { /* */ }
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
      setStatusLine("Wait until both devices are connected, then try again.");
      return;
    }
    setSending(true);
    setState("transfer");
    setFiles(selected.map((f) => ({ name: f.name, size: f.size, progress: 0, status: "queued" as const })));
    const totalSize = selected.reduce((a, f) => a + f.size, 0) || 1;
    let sentTotal = 0;
    const t0 = performance.now();
    let lastUi = 0;
    ch.send(JSON.stringify({ type: "manifest", files: selected.map((f) => ({ name: f.name, size: f.size })) }));
    for (let fi = 0; fi < selected.length; fi++) {
      const file = selected[fi];
      let offset = 0;
      setFiles((prev) => prev.map((f, i) => (i === fi ? { ...f, status: "transferring" } : f)));
      while (offset < file.size) {
        while (ch.bufferedAmount > BUFFER_HIGH) {
          await new Promise<void>((resolve) => {
            const done = () => {
              ch.removeEventListener("bufferedamountlow", done);
              resolve();
            };
            ch.addEventListener("bufferedamountlow", done);
            setTimeout(() => {
              if (ch.bufferedAmount <= BUFFER_HIGH / 2) {
                ch.removeEventListener("bufferedamountlow", done);
                resolve();
              }
            }, 50);
          });
        }
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const buf = await slice.arrayBuffer();
        ch.send(buf);
        offset += buf.byteLength;
        sentTotal += buf.byteLength;
        const now = performance.now();
        if (now - lastUi > 150 || offset >= file.size) {
          lastUi = now;
          setFiles((prev) => prev.map((f, i) => (i === fi ? { ...f, progress: offset / file.size } : f)));
          setOverall(sentTotal / totalSize);
          const elapsed = (now - t0) / 1000;
          if (elapsed > 0.25) {
            setSpeed(`${(sentTotal / (1024 * 1024) / elapsed).toFixed(1)} MB/s`);
          }
        }
      }
      ch.send(JSON.stringify({ type: "file-done", index: fi }));
      setFiles((prev) => prev.map((f, i) => (i === fi ? { ...f, progress: 1, status: "done" } : f)));
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
    } catch { /* */ }
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
    setAwaitingVerify(false);
    setRoomCode("");
    setRoomLink("");
    selectedFilesRef.current = [];
    setTurnstileToken(null);
    startedFromFiles.current = false;
    onReset?.();
  }

  function formatTTL(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const canSend =
    role === "sender" && peerCount >= 2 && channelReady && !sending && state === "waiting";
  const canCreate = !siteKey || !!turnstileToken;

  return {
    state, role, roomCode, roomLink, ttl, files, overall, speed,
    errorTitle, errorDetail, copyFeedback, pendingNames, statusLine,
    peerCount, channelReady, sending, turnstileToken, setTurnstileToken,
    zipping, awaitingVerify, canSend, canCreate,
    confirmAndCreateRoom, sendFilesNow, copy, reset, formatTTL,
  };
}
