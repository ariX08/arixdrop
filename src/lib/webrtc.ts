/**
 * WebRTC DataChannel helpers for pigeon.
 * STUN + public TURN so peers on different networks can connect through NAT.
 */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  // Free community TURN (Open Relay / Metered) — required for many cellular / strict NATs
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: [
      "turn:openrelay.metered.ca:80?transport=tcp",
      "turns:openrelay.metered.ca:443",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export function createPeerConnection(
  onIceCandidate: (c: RTCIceCandidate) => void,
  onConnectionState?: (state: RTCPeerConnectionState) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection({
    iceServers: ICE_SERVERS,
    iceCandidatePoolSize: 10,
  });

  pc.onicecandidate = (ev) => {
    if (ev.candidate) onIceCandidate(ev.candidate);
  };

  pc.onconnectionstatechange = () => {
    onConnectionState?.(pc.connectionState);
  };

  pc.oniceconnectionstatechange = () => {
    // Bubble failed ICE as connection failure when overall state lags
    if (pc.iceConnectionState === "failed") {
      onConnectionState?.("failed");
    }
  };

  return pc;
}

export function createDataChannel(
  pc: RTCPeerConnection,
  label = "pigeon"
): RTCDataChannel {
  const channel = pc.createDataChannel(label, {
    ordered: true,
  });
  channel.binaryType = "arraybuffer";
  // Raise buffer watermark so large sends don't stall as easily
  try {
    // @ts-expect-error — not in all TS libs
    channel.bufferedAmountLowThreshold = 256 * 1024;
  } catch {
    /* ignore */
  }
  return channel;
}

/** Generate a 6-character room code (no ambiguous chars: I, O, 0, 1). */
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Chunk size for DataChannel sends (keeps UI responsive and respects buffer). */
export const CHUNK_SIZE = 64 * 1024; // 64 KB
