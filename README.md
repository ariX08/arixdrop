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

## Deploy (important)

This project has **two** parts. Do **not** run `wrangler deploy` as the main site deploy command.

### 1. Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → Sign in with GitHub
2. **Add New Project** → import `ariX08/arixdrop`
3. Framework: **Next.js** (auto-detected)
4. Build command: `npm run build` (default)
5. **Leave Deploy Command empty** — do not set `wrangler deploy`
6. Click **Deploy**

You get a URL like `https://arixdrop.vercel.app`.

### 2. Signaling → Cloudflare Workers (separate)

From your computer:

```bash
npm install
npm run worker:deploy
# or: npx wrangler deploy --config worker/wrangler.toml
```

First time: `npx wrangler login` (opens browser).

You get a URL like:
`https://arixdrop-signaling.<subdomain>.workers.dev`

WebSocket path:
`wss://arixdrop-signaling.<subdomain>.workers.dev/ws`

### 3. Connect them

In Vercel → Project → **Settings → Environment Variables**:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SIGNALING_URL` | `wss://arixdrop-signaling.<subdomain>.workers.dev/ws` |

Redeploy the Vercel project after adding the variable.

### If you used Cloudflare Pages by mistake

Your log showed Next.js **built successfully**, then failed on `npx wrangler deploy` because that command expects a Worker entry file in the root. For the website:

- Use **Vercel** for the Next.js app, **or**
- On Cloudflare Pages: set **Build command** to `npm run build` and **clear/remove** any Deploy command that runs `wrangler deploy`

Deploy the Worker separately with `npm run worker:deploy` from your machine.

## License

MIT
