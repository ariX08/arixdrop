/**
 * pigeon signaling worker
 * WebSocket room pairing for WebRTC. Ephemeral in-memory rooms (15 min TTL).
 *
 * Protocol:
 *  - Connect:  ws://host/ws?room=ABCDEF
 *  - Or send:  { type: "join", room: "ABCDEF" }
 *  - Relay:    offer | answer | ice with payload
 *
 * Deploy: npx wrangler deploy
 * Local:  npx wrangler dev
 */

export interface Env {}

const ROOM_TTL_MS = 15 * 60 * 1000;
const ROOM_CODE_RE = /^[A-Z0-9]{6}$/;

interface Peer {
  id: string;
  ws: WebSocket;
}

interface Room {
  code: string;
  peers: Map<string, Peer>;
  createdAt: number;
}

const rooms = new Map<string, Room>();

function cleanupExpired() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL_MS) {
      for (const peer of room.peers.values()) {
        try {
          peer.ws.close(4000, "Room expired");
        } catch {
          /* ignore */
        }
      }
      rooms.delete(code);
    }
  }
}

function normalizeCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return ROOM_CODE_RE.test(code) ? code : null;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function joinRoom(code: string, peerId: string, server: WebSocket): { ok: true; peers: number } | { ok: false; error: string } {
  cleanupExpired();
  let room = rooms.get(code);
  if (!room) {
    room = { code, peers: new Map(), createdAt: Date.now() };
    rooms.set(code, room);
  }

  // Rejoin same peer id is fine; replace socket
  if (room.peers.has(peerId)) {
    room.peers.set(peerId, { id: peerId, ws: server });
    return { ok: true, peers: room.peers.size };
  }

  if (room.peers.size >= 2) {
    return { ok: false, error: "Room full" };
  }

  room.peers.set(peerId, { id: peerId, ws: server });

  for (const [id, peer] of room.peers) {
    if (id !== peerId) {
      try {
        peer.ws.send(JSON.stringify({ type: "peer-joined", from: peerId }));
      } catch {
        /* ignore */
      }
    }
  }

  return { ok: true, peers: room.peers.size };
}

function leaveRoom(code: string | null, peerId: string) {
  if (!code) return;
  const room = rooms.get(code);
  if (!room) return;
  room.peers.delete(peerId);
  for (const peer of room.peers.values()) {
    try {
      peer.ws.send(JSON.stringify({ type: "peer-left", from: peerId }));
    } catch {
      /* ignore */
    }
  }
  if (room.peers.size === 0) rooms.delete(code);
}

function relay(code: string, peerId: string, type: string, payload: unknown) {
  const room = rooms.get(code);
  if (!room) return;
  const msg = JSON.stringify({ type, from: peerId, payload });
  for (const [id, peer] of room.peers) {
    if (id !== peerId) {
      try {
        peer.ws.send(msg);
      } catch {
        /* ignore */
      }
    }
  }
}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (url.pathname === "/health") {
      return json({ ok: true, rooms: rooms.size });
    }

    if (url.pathname === "/ws") {
      const upgrade = request.headers.get("Upgrade");
      if (upgrade !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
      server.accept();

      const peerId = crypto.randomUUID();
      let joinedRoom: string | null = null;
      let joinedOnce = false;

      const tryJoin = (raw: string | null | undefined) => {
        const code = normalizeCode(raw);
        if (!code) {
          server.send(JSON.stringify({ type: "error", payload: "Invalid room code" }));
          return;
        }
        // Allow re-join message for same connection without "room full"
        if (joinedRoom === code && joinedOnce) {
          const room = rooms.get(code);
          server.send(
            JSON.stringify({
              type: "joined",
              room: code,
              peers: room?.peers.size ?? 1,
            })
          );
          return;
        }
        if (joinedRoom && joinedRoom !== code) {
          leaveRoom(joinedRoom, peerId);
          joinedRoom = null;
          joinedOnce = false;
        }
        const result = joinRoom(code, peerId, server);
        if (!result.ok) {
          server.send(JSON.stringify({ type: "error", payload: result.error }));
          return;
        }
        joinedRoom = code;
        joinedOnce = true;
        server.send(
          JSON.stringify({
            type: "joined",
            room: code,
            peers: result.peers,
          })
        );
      };

      // Auto-join from query string (client connects with ?room=ABCDEF)
      const queryRoom = url.searchParams.get("room");
      if (queryRoom) {
        tryJoin(queryRoom);
      }

      server.addEventListener("message", (event) => {
        cleanupExpired();
        try {
          const msg = JSON.parse(String(event.data)) as {
            type: string;
            room?: string;
            payload?: unknown;
          };

          if (msg.type === "join") {
            tryJoin(msg.room);
            return;
          }

          if (
            joinedRoom &&
            (msg.type === "offer" || msg.type === "answer" || msg.type === "ice")
          ) {
            relay(joinedRoom, peerId, msg.type, msg.payload);
          }
        } catch {
          try {
            server.send(JSON.stringify({ type: "error", payload: "Bad message" }));
          } catch {
            /* ignore */
          }
        }
      });

      server.addEventListener("close", () => {
        leaveRoom(joinedRoom, peerId);
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("pigeon signaling", {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  },
};
