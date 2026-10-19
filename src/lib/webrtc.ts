/**
 * WebRTC DataChannel helpers for pigeon.
 * STUN + public TURN so peers on different networks can connect through NAT.
 */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
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
  try {
    // Fire when buffer drains so we can resume without busy-polling
    // @ts-expect-error — not in all TS DOM libs
    channel.bufferedAmountLowThreshold = 512 * 1024;
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

/** Larger chunks = fewer messages & higher throughput on DataChannel. */
export const CHUNK_SIZE = 256 * 1024; // 256 KB

/** High-water mark before we pause sending (bytes in outbound buffer). */
export const BUFFER_HIGH = 8 * 1024 * 1024; // 8 MB
