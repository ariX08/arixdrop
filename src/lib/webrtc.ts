/**
 * WebRTC helpers for pigeon.
 */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
      "turns:openrelay.metered.ca:443",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export function createPeerConnection(
  onIceCandidate: (c: RTCIceCandidate | null) => void,
  onConnectionState?: (state: RTCPeerConnectionState) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection({
    iceServers: ICE_SERVERS,
    iceCandidatePoolSize: 10,
    iceTransportPolicy: "all",
  });

  pc.onicecandidate = (ev) => {
    onIceCandidate(ev.candidate);
  };

  pc.onconnectionstatechange = () => {
    onConnectionState?.(pc.connectionState);
  };

  return pc;
}

export function createDataChannel(
  pc: RTCPeerConnection,
  label = "pigeon"
): RTCDataChannel {
  const channel = pc.createDataChannel(label, { ordered: true });
  channel.binaryType = "arraybuffer";
  try {
    channel.bufferedAmountLowThreshold = 2 * 1024 * 1024;
  } catch {
    /* */
  }
  return channel;
}

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

export const CHUNK_SIZE = 256 * 1024;
export const BUFFER_HIGH = 8 * 1024 * 1024;
