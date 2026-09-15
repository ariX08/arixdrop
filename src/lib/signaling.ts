import { SIGNALING_URL } from "./types";

export type SignalingEvent =
  | { type: "joined"; room: string; peers: number }
  | { type: "peer-joined"; from: string }
  | { type: "peer-left"; from: string }
  | { type: "offer"; from: string; payload: RTCSessionDescriptionInit }
  | { type: "answer"; from: string; payload: RTCSessionDescriptionInit }
  | { type: "ice"; from: string; payload: RTCIceCandidateInit }
  | { type: "error"; payload: string }
  | { type: "open" }
  | { type: "close" }
  | { type: "socket-error"; message: string };

function wsUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SIGNALING_URL || SIGNALING_URL).replace(/\/$/, "");
  if (base.endsWith("/ws")) return base;
  return `${base}/ws`;
}

export class SignalingClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<(ev: SignalingEvent) => void>();

  on(fn: (ev: SignalingEvent) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(ev: SignalingEvent) {
    this.listeners.forEach((fn) => fn(ev));
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      let url: string;
      try {
        url = wsUrl();
      } catch (e) {
        reject(e);
        return;
      }

      // Local fallback if env points to workers but user is testing locally
      const socket = new WebSocket(url);
      this.ws = socket;

      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error("Signaling server timed out. Is NEXT_PUBLIC_SIGNALING_URL set?"));
      }, 10000);

      socket.onopen = () => {
        clearTimeout(timeout);
        this.emit({ type: "open" });
        resolve();
      };

      socket.onerror = () => {
        clearTimeout(timeout);
        this.emit({ type: "socket-error", message: "Could not reach signaling server" });
        reject(new Error("Could not reach signaling server. Check NEXT_PUBLIC_SIGNALING_URL."));
      };

      socket.onclose = () => {
        this.emit({ type: "close" });
        this.ws = null;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data));
          this.emit(data as SignalingEvent);
        } catch {
          // ignore malformed
        }
      };
    });
  }

  send(msg: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected to signaling server");
    }
    this.ws.send(JSON.stringify(msg));
  }

  join(room: string) {
    this.send({ type: "join", room: room.toUpperCase() });
  }

  sendOffer(payload: RTCSessionDescriptionInit) {
    this.send({ type: "offer", payload });
  }

  sendAnswer(payload: RTCSessionDescriptionInit) {
    this.send({ type: "answer", payload });
  }

  sendIce(payload: RTCIceCandidateInit) {
    this.send({ type: "ice", payload });
  }

  close() {
    this.ws?.close();
    this.ws = null;
  }
}
