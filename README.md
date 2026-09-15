# AriXDrop

Fast peer-to-peer file transfer. No upload, no account, no permanent storage.

Files move directly between devices over an encrypted WebRTC DataChannel. A lightweight Cloudflare Worker handles only the signaling needed to establish the connection.

## Stack

| Layer        | Technology                          | Hosting          |
|--------------|-------------------------------------|------------------|
| Frontend     | Next.js 15 + React 19 + Tailwind 3  | Vercel (free)    |
| Signaling    | Cloudflare Workers (WebSocket)      | CF free tier     |
| Transfer     | WebRTC DataChannel                  | Browser ↔ Browser|

## Quick start

```bash
# 1. Install
npm install

# 2. Run the Next.js app
npm run dev
# → http://localhost:3000

# 3. (Optional) Run the signaling worker locally
npm run worker:dev
# → ws://localhost:8787
```

Set the signaling endpoint for the frontend:

```bash
# .env.local
NEXT_PUBLIC_SIGNALING_URL=ws://localhost:8787
```

## Project structure

```
src/
  app/           # Next.js App Router (layout, page, globals)
  components/    # Header, RoomPanel, JoinModal
  lib/           # types, webrtc helpers
worker/
  src/index.ts   # Cloudflare Worker signaling server
  wrangler.toml
```

## Room flow

1. Sender selects files → temporary room + 4-character code is created.
2. Recipient opens the link or enters the code.
3. Both peers connect to the signaling Worker over WebSocket.
4. Offer / answer / ICE candidates are relayed; a direct P2P DataChannel is established.
5. Files are chunked and sent over the DataChannel. Progress is shown live.
6. Room expires (15 min) or is cleaned up when both peers leave.

## Design notes

- One primary action: **Send files**.
- Room panel is the visual and interaction focus (asymmetric hero).
- Full state coverage: idle → creating → waiting → transfer → complete / error.
- No permanent storage, no accounts, no fabricated social proof.
- Colors, type, and spacing are product-specific (see `tailwind.config.ts`).

## Deploy

**Frontend (Vercel)**

```bash
npx vercel
```

**Signaling (Cloudflare)**

```bash
cd worker
npx wrangler deploy
```

Then set `NEXT_PUBLIC_SIGNALING_URL` to the deployed Worker WebSocket URL (e.g. `wss://arixdrop-signaling.<account>.workers.dev/ws`).

## License

MIT
