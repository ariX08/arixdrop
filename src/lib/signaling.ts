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

function baseWsUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SIGNALING_URL || SIGNALING_URL).replace(/\/$/, "");
  if (base.endsWith("/ws")) return base;
  return `${base}/ws`;
}

export class SignalingClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<(ev: SignalingEvent) => void>();
  private roomCode: string | null = null;

  on(fn: (ev: SignalingEvent) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(ev: SignalingEvent) {
    this.listeners.forEach((fn) => fn(ev));
  }

  /** Connect already scoped to a room (required for Durable Object / worker routing). */
  connect(room: string): Promise<void> {
    const code = room.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (code.length !== 6) {
      return Promise.reject(new Error("Invalid room code"));
    }
    this.roomCode = code;

    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Re-announce join for the same socket
        try {
          this.send({ type: "join", room: code });
        } catch {
          /* ignore */
        }
        resolve();
        return;
      }

      const url = `${baseWsUrl()}?room=${encodeURIComponent(code)}`;
      const socket = new WebSocket(url);
      this.ws = socket;

      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error("Signaling server timed out. Is NEXT_PUBLIC_SIGNALING_URL set?"));
      }, 15000);

      socket.onopen = () => {
        clearTimeout(timeout);
        this.emit({ type: "open" });
        // Backup join message for workers that only listen on "join"
        try {
          socket.send(JSON.stringify({ type: "join", room: code }));
        } catch {
          /* ignore */
        }
        resolve();
      };

      socket.onerror = () => {
        clearTimeout(timeout);
        this.emit({
          type: "socket-error",
          message: "Could not reach signaling server",
        });
        reject(
          new Error("Could not reach signaling server. Check NEXT_PUBLIC_SIGNALING_URL.")
        );
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
          // ignore
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

  /** Explicit join (also sent automatically on connect). */
  join(room?: string) {
    const code = (room || this.roomCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (code.length === 6) this.send({ type: "join", room: code });
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
    this.roomCode = null;
  }
}
