# Odyssey Task 1 — Spatial Audio & Video Room

## Overview
Build a real-time spatial audio/video room: users join a room, appear as dots on a circular arena map, move around, and hear each other with distance-based volume falloff.

**Stack:** Node.js + mediasoup + Socket.io (server) · React + TypeScript + Vite + mediasoup-client + Web Audio API + Tailwind CSS + shadcn/ui (frontend)

---

## Part A — Server

### Task 1 — Initialize monorepo structure
- [x] Create root directory with `/server` and `/client` sub-folders
- [x] `git init` at the root
- [x] Add root `.gitignore` (node_modules, dist, .env, build artifacts)
- [x] Add root `README.md` with project overview and setup instructions

---

### Task 2 — Scaffold Node.js server
- [x] `npm init` inside `/server`, add TypeScript if desired
- [x] Install dependencies: `mediasoup`, `socket.io`, `express`, `dotenv`
- [x] Create `src/index.ts` — Express app + HTTP server + Socket.io attachment
- [x] Add `GET /health` endpoint returning `200 OK`
- [x] Add `npm run dev` and `npm run build` scripts

---

### Task 3 — mediasoup Worker, Router, and WebRTC transport lifecycle
- [x] Create a mediasoup **Worker** on server startup
- [x] Per room, create a **Router** with audio + video codecs (opus, VP8)
- [x] Handle Socket.io event `createWebRtcTransport` → return ICE/DTLS params to client
- [x] Handle `connectTransport` → finalize DTLS handshake
- [x] Handle `produce` → create a **Producer**, notify other peers in the room
- [x] Handle `consume` → create a **Consumer** for a remote producer, return params
- [x] On socket disconnect → close transports, producers, consumers; clean up room state

---

### Task 4 — Room and participant position management
- [x] Track rooms as a `Map<roomId, Room>` in memory
- [x] Each participant stores: `id`, `name`, `position { x, y }`, `socketId`, `micActive`
- [x] Handle `join-room` event: add participant, broadcast `room-state` to all peers
- [x] Handle `leave-room` / disconnect: remove participant, broadcast updated state
- [x] Handle `move` event: validate position stays inside circle (`x²+y² ≤ r²`), update, broadcast
- [x] Handle `mic-status` event: update `micActive` flag, broadcast to peers
- [x] Add `GET /rooms/:roomId/participants` endpoint returning participants + positions

---

## Part B — Frontend

### Task 5 — Scaffold React + TypeScript + Vite client
- [x] `npm create vite@latest client -- --template react-ts`
- [x] Install Tailwind CSS v4: `npm install tailwindcss @tailwindcss/vite` and configure `vite.config.ts`
- [x] Init shadcn/ui: `npx shadcn@latest init` (choose default style, Tailwind CSS vars)
- [x] Add base shadcn components: `npx shadcn@latest add button input card badge toggle tooltip`
- [x] Install: `socket.io-client`, `mediasoup-client`
- [x] Add `.env.local` with `VITE_SERVER_URL=http://localhost:3000`
- [x] Create `App.tsx` shell with three-panel layout using shadcn `Card` + Tailwind:
  - Header: `Input` (room), `Input` (name), `Button` (Join), `Button` (Leave)
  - Main: arena map placeholder inside a `Card`
  - Footer: direction buttons + Mic `Toggle` + Camera `Toggle`

---

### Task 6 — Circular arena map component
- [ ] Create `ArenaMap.tsx` using SVG (400–500 px diameter)
- [ ] Render a circle boundary as the arena
- [ ] Map each participant to a colored `<circle>` dot + `<text>` name label
- [ ] Own dot: distinct color, slightly larger radius
- [ ] Faint `<circle>` around own dot = hearing range indicator
- [ ] When `micActive === true`, apply Tailwind `animate-pulse` + a drop-shadow filter to that dot
- [ ] Accept props: `participants`, `localId`, `hearingRadius`

---

### Task 7 — Direction buttons and boundary-clamped movement
- [x] Render ▲ ▼ ◄ ► buttons below the map
- [x] On press: compute new `{ x, y }` by adding a step delta
- [x] Clamp: if `x²+y² > r²`, project back onto the circle boundary
- [x] Update local state immediately (optimistic UI)
- [ ] Emit `move` event to server with new position
- [x] Wire keyboard arrow keys as an alternative input

---

### Task 8 — mediasoup-client WebRTC integration
- [ ] On join: fetch RTP capabilities from server (`getRouterRtpCapabilities`)
- [ ] Load `Device` with router capabilities
- [ ] Create a **send Transport** (for mic/camera producers)
- [ ] Create a **receive Transport** (for remote consumers)
- [ ] Connect transports on `connect` event (send DTLS params to server)
- [ ] On new remote producer notification, create a **Consumer** and attach stream
- [ ] Clean up all transports/producers/consumers on leave

---

### Task 9 — Spatial audio with Web Audio API
- [ ] Create a single `AudioContext` on first join
- [ ] For each remote audio consumer: `MediaStreamSource → GainNode → destination`
- [ ] On every position update, compute Euclidean distance between own dot and remote dot
- [ ] Set `gainNode.gain.value`:
  - `1.0` at distance 0
  - Linear falloff to `0.0` at `hearingRadius`
  - `0.0` beyond hearing range (silence)
- [ ] Update all gain nodes whenever positions change

---

### Task 10 — Mic toggle
- [ ] Add 🎙️ Mic button (toggle on/off)
- [ ] **On:** `getUserMedia({ audio: true })` → create mediasoup audio **Producer** → emit `mic-on`
- [ ] **Off:** stop audio track → close Producer → emit `mic-off`
- [ ] Show active state visually on the button

---

### Task 11 — Camera toggle and video tiles
- [ ] Add 📷 Camera button (toggle on/off)
- [ ] **On:** `getUserMedia({ video: true })` → show own video preview tile → create mediasoup video **Producer**
- [ ] Render remote participant video streams as small tiles alongside the arena map
- [ ] **Off:** stop video track → close Producer → remove own preview tile
- [ ] Show active state visually on the button

---

## Part C — Deployment

### Task 12 — Deploy server to Fly.io
- [ ] Install `flyctl`, run `fly launch` inside `/server`
- [ ] Configure `fly.toml`:
  - Expose TCP port (e.g. `3000`) for HTTP + Socket.io
  - Expose UDP port range (e.g. `10000–10100`) for mediasoup RTP
- [ ] Set env vars: `ANNOUNCED_IP` (Fly machine public IP), `MEDIASOUP_MIN_PORT=10000`, `MEDIASOUP_MAX_PORT=10100`
- [ ] `fly deploy` and verify `GET https://<app>.fly.dev/health` returns `200 OK`

---

### Task 13 — Deploy frontend to Netlify / Vercel / Cloudflare Pages
- [ ] Set `VITE_SERVER_URL=https://<app>.fly.dev` in the platform env vars
- [ ] Run `npm run build` to generate `/client/dist`
- [ ] Deploy `/client/dist` to chosen platform
- [ ] Verify live URL loads the app and connects to the server

---

### Task 14 — End-to-end acceptance testing
- [ ] Open two browser tabs (or two machines) on the live frontend URL
- [ ] Both join the same room name → both dots appear on the map
- [ ] Direction buttons move a dot → other tab sees it move in real time
- [ ] Mic on → audio heard by other tab, volume fades as dots move apart
- [ ] Camera on → video tile visible for other participant
- [ ] Dot pulses when mic is active
- [ ] `/health` returns 200, `/rooms/:roomId/participants` returns correct data

---

## Deliverables
- [ ] GitHub repo (frontend + server code)
- [ ] Live public URL — frontend
- [ ] Live public URL — server (`/health` must respond 200)
