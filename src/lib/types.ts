export type RoomState =
  | "idle"
  | "creating"
  | "waiting"
  | "connecting"
  | "transfer"
  | "complete"
  | "error";

export interface FileProgress {
  name: string;
  size: number;
  progress: number; // 0–1
  status: "queued" | "transferring" | "done" | "error";
}

export interface SignalingMessage {
  type: "join" | "offer" | "answer" | "ice" | "leave" | "error";
  room?: string;
  from?: string;
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit | string;
}

export const SIGNALING_URL =
  process.env.NEXT_PUBLIC_SIGNALING_URL || "ws://localhost:8787";
