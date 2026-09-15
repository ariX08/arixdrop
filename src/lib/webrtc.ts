/**
 * Minimal WebRTC DataChannel helper for AriXDrop.
 * Real transfers use chunked binary messages over a single ordered reliable channel.
 */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function createPeerConnection(
  onIceCandidate: (c: RTCIceCandidate) => void,
  onConnectionState?: (state: RTCPeerConnectionState) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  pc.onicecandidate = (ev) => {
    if (ev.candidate) onIceCandidate(ev.candidate);
  };

  pc.onconnectionstatechange = () => {
    onConnectionState?.(pc.connectionState);
  };

  return pc;
}

export function createDataChannel(
  pc: RTCPeerConnection,
  label = "arixdrop"
): RTCDataChannel {
  const channel = pc.createDataChannel(label, {
    ordered: true,
  });
  channel.binaryType = "arraybuffer";
  return channel;
}

/** Generate a short 4-character room code (no ambiguous chars). */
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Chunk size for DataChannel sends (keeps UI responsive and respects buffer). */
export const CHUNK_SIZE = 64 * 1024; // 64 KB
