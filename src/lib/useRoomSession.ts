"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FileProgress, RoomState } from "@/lib/types";
import {
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
  }, []);

  const teardownRtc = useCallback(() => {
    try { channelRef.current?.close(); } catch { /* */ }
    try { pcRef.current?.close(); } catch { /* */ }
    channelRef.current = null;
    pcRef.current = null;
    pendingIce.current = [];
    remoteReady.current = false;
    offerSent.current = false;
    makingOffer.current = false;
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

  async function flushPendingIce(pc: RTCPeerConnection) {
    const queued = pendingIce.current.splice(0);
    for (const c of queued) {
      try { await pc.addIceCandidate(c); } catch { /* */ }
    }
  }

  function setupPeerConnection() {
    if (pcRef.current) return pcRef.current;
    const pc = createPeerConnection(
      (candidate) => {
        try { signalingRef.current?.sendIce(candidate.toJSON()); } catch { /* */ }
      },
      (s) => {
        if (s === "connected" || s === "completed") {
          setStatusLine(
            roleRef.current === "sender"
              ? "Connected — press Send files when ready"
              : "Connected — waiting for files…"
          );
        } else if (s === "failed") {
          setStatusLine("Connection failed — retrying…");
          void (async () => {
            try {
              if (!pcRef.current || roleRef.current !== "sender" || !offerSent.current) return;
              const offer = await pcRef.current.createOffer({ iceRestart: true });
              await pcRef.current.setLocalDescription(offer);
              signalingRef.current?.sendOffer(offer);
            } catch {
              setStatusLine("Could not reconnect. Cancel and try again.");
            }
          })();
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
      setChannelReady(true);
      setStatusLine(
        who === "sender"
          ? "Connected — press Send files when ready"
          : "Connected — waiting for files…"
      );
    };
    ch.onclose = () => setChannelReady(false);
    if (who !== "receiver") return;

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
        } catch { /* */ }
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

  async function startOffer() {
    if (roleRef.current !== "sender" || makingOffer.current || offerSent.current) return;
    makingOffer.current = true;
    try {
      const pc = setupPeerConnection();
      if (!channelRef.current) {
        const ch = createDataChannel(pc);
        channelRef.current = ch;
        wireChannel(ch, "sender");
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      signalingRef.current?.sendOffer(offer);
      offerSent.current = true;
    } catch (e) {
      setStatusLine(e instanceof Error ? e.message : "Could not start connection");
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
      remoteReady.current = true;
      await flushPendingIce(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      signalingRef.current?.sendAnswer(answer);
    }
    if (ev.type === "answer" && roleRef.current === "sender" && ev.payload) {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(ev.payload as RTCSessionDescriptionInit);
        remoteReady.current = true;
        await flushPendingIce(pcRef.current);
      }
    }
    if (ev.type === "ice" && ev.payload) {
      const init = ev.payload as RTCIceCandidateInit;
      const pc = pcRef.current;
      if (!pc || !remoteReady.current) pendingIce.current.push(init);
      else {
        try { await pc.addIceCandidate(init); } catch { /* */ }
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
    setFiles(selected.map((f) => ({ name: f.name, size: f.size, progress: 0, status: "queued" as const })));
    const totalSize = selected.reduce((a, f) => a + f.size, 0) || 1;
    let sentTotal = 0;
    const t0 = performance.now();
    ch.send(JSON.stringify({ type: "manifest", files: selected.map((f) => ({ name: f.name, size: f.size })) }));
    for (let fi = 0; fi < selected.length; fi++) {
      const file = selected[fi];
      let offset = 0;
      setFiles((prev) => prev.map((f, i) => (i === fi ? { ...f, status: "transferring" } : f)));
      while (offset < file.size) {
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const buf = await slice.arrayBuffer();
        while (ch.bufferedAmount > 2 * 1024 * 1024) await new Promise((r) => setTimeout(r, 20));
        ch.send(buf);
        offset += buf.byteLength;
        sentTotal += buf.byteLength;
        setFiles((prev) => prev.map((f, i) => (i === fi ? { ...f, progress: offset / file.size } : f)));
        setOverall(sentTotal / totalSize);
        const elapsed = (performance.now() - t0) / 1000;
        if (elapsed > 0.2) setSpeed(`${(sentTotal / (1024 * 1024) / elapsed).toFixed(1)} MB/s`);
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

  const canSend = role === "sender" && peerCount >= 2 && channelReady && !sending && state === "waiting";
  const canCreate = !siteKey || !!turnstileToken;

  return {
    state, role, roomCode, roomLink, ttl, files, overall, speed,
    errorTitle, errorDetail, copyFeedback, pendingNames, statusLine,
    peerCount, channelReady, sending, turnstileToken, setTurnstileToken,
    zipping, awaitingVerify, canSend, canCreate,
    confirmAndCreateRoom, sendFilesNow, copy, reset, formatTTL,
  };
}
