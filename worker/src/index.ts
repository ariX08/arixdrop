/**
 * AriXDrop Signaling Worker
 * -------------------------
 * Minimal WebSocket signaling for WebRTC room pairing.
 * Rooms are ephemeral and expire after ROOM_TTL_MS.
 *
 * Deploy: npx wrangler deploy
 * Local:  npx wrangler dev
 */

export interface Env {}

const ROOM_TTL_MS = 15 * 60 * 1000; // 15 minutes

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
        } catch {}
      }
      rooms.delete(code);
    }
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);

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

      server.addEventListener("message", (event) => {
        cleanupExpired();
        try {
          const msg = JSON.parse(String(event.data)) as {
            type: string;
            room?: string;
            payload?: unknown;
          };

          if (msg.type === "join" && msg.room) {
            const code = msg.room.toUpperCase().slice(0, 4);
            let room = rooms.get(code);
            if (!room) {
              room = { code, peers: new Map(), createdAt: Date.now() };
              rooms.set(code, room);
            }
            if (room.peers.size >= 2) {
              server.send(JSON.stringify({ type: "error", payload: "Room full" }));
              return;
            }
            room.peers.set(peerId, { id: peerId, ws: server });
            joinedRoom = code;

            for (const [id, peer] of room.peers) {
              if (id !== peerId) {
                peer.ws.send(
                  JSON.stringify({ type: "peer-joined", from: peerId })
                );
              }
            }
            server.send(
              JSON.stringify({
                type: "joined",
                room: code,
                peers: room.peers.size,
              })
            );
            return;
          }

          if (
            joinedRoom &&
            (msg.type === "offer" ||
              msg.type === "answer" ||
              msg.type === "ice")
          ) {
            const room = rooms.get(joinedRoom);
            if (!room) return;
            for (const [id, peer] of room.peers) {
              if (id !== peerId) {
                peer.ws.send(
                  JSON.stringify({
                    type: msg.type,
                    from: peerId,
                    payload: msg.payload,
                  })
                );
              }
            }
          }
        } catch {
          server.send(JSON.stringify({ type: "error", payload: "Bad message" }));
        }
      });

      server.addEventListener("close", () => {
        if (joinedRoom) {
          const room = rooms.get(joinedRoom);
          if (room) {
            room.peers.delete(peerId);
            for (const peer of room.peers.values()) {
              peer.ws.send(
                JSON.stringify({ type: "peer-left", from: peerId })
              );
            }
            if (room.peers.size === 0) rooms.delete(joinedRoom);
          }
        }
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("AriXDrop signaling", { status: 200 });
  },
};
