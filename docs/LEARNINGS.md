# Odyssey Task 1 — Learnings

A walkthrough of every task completed so far: what was built, why each piece exists, and the key decisions made along the way.

---

## Task 1 — Initialize Monorepo Structure

**What was built:**
- Root directory with `/server` and `/client` sub-folders
- Root `.gitignore` covering `node_modules`, `dist`, `.env`, build artifacts
- Root `README.md` with project overview and setup instructions
- `git init` at the monorepo root

**Why it matters:**
A monorepo keeps server and client in one repository so they can be versioned together. Changes to the socket contract on the server and client can live in the same commit, making drift easier to catch.

---

## Task 2 — Scaffold Node.js Server

**What was built:**
- `server/src/index.ts` — Express app + HTTP server + Socket.io attached to it
- `GET /health` endpoint returning `200 OK`
- `npm run dev` (tsx watch) and `npm run build` (tsc) scripts
- Dependencies: `mediasoup`, `socket.io`, `express`, `dotenv`

**Key files:**
- `server/src/index.ts` — entry point, wires everything together
- `server/.env.example` — documents required environment variables

**Why `tsx` for dev:**
`tsx` runs TypeScript directly without a compile step, making the dev loop fast. Production uses `tsc` to compile to plain JS for `node`.

---

## Task 3 — mediasoup Worker, Router, and WebRTC Transport Lifecycle

**What was built:**
- `server/src/mediasoup.ts` — factory functions for Worker, Router, and WebRTC transports
- Socket.io event handlers for the full WebRTC negotiation handshake

**The mediasoup object hierarchy:**
```
Worker          ← one per server process, manages OS-level media
  └── Router    ← one per room, defines supported codecs
        └── WebRtcTransport   ← one per peer direction (send + recv)
              ├── Producer    ← outgoing media track
              └── Consumer    ← incoming media track from a remote producer
```

**Socket events handled:**

| Event | What it does |
|---|---|
| `get-router-rtp-capabilities` | Returns the router's codec capabilities so the client can load its Device |
| `create-webrtc-transport` | Creates a server-side transport, returns ICE + DTLS params to client |
| `connect-transport` | Client sends its DTLS fingerprint to complete the handshake |
| `produce` | Client starts sending a track; server creates a Producer and notifies peers |
| `consume` | Client requests a remote Producer's stream; server creates a Consumer |

**Why two transports per peer:**
mediasoup requires separate transport objects for sending and receiving. One peer has a send transport (for their mic/camera) and a receive transport (for everyone else's streams).

---

## Task 4 — Room and Participant Position Management

**What was built:**
- `server/src/room.ts` — `RoomManager` class managing all rooms and members in memory
- Position validation: `x² + y² ≤ ARENA_RADIUS²` (keeps dots inside the circle)
- Socket events: `join-room`, `leave-room`, `move`, `mic-status`
- `GET /rooms/:roomId/participants` HTTP endpoint

**Member vs Participant — the key distinction:**

`Member` (internal, never leaves the server):
```ts
{ id, socketId, name, position, micActive, transports, producers, consumers }
```

`Participant` (broadcast shape, sent to clients):
```ts
{ id, socketId, name, position, micActive }
```

A Member only becomes a visible Participant after `join-room` sets their name. Before that they are in the room (for WebRTC setup) but invisible to other peers.

**Why broadcast `room-state` instead of diffs:**
Sending the full participant list on every change is simpler and correct for small rooms. Every client always has a consistent snapshot — no need to reconcile partial updates.

---

## Task 5 — Scaffold React + TypeScript + Vite Client

**What was built:**
- Vite + React + TypeScript client in `client/`
- Tailwind CSS v4 via `@tailwindcss/vite` plugin
- shadcn/ui initialized with base components: `Button`, `Input`, `Card`, `Badge`, `Toggle`, `Tooltip`
- Dependencies installed: `socket.io-client`, `mediasoup-client`
- `App.tsx` shell with three-panel layout (header, arena map, footer controls)

**Layout structure:**
```
┌─────────────────────────────────┐
│ [Room ID] [Name] [Join] [Leave] │  ← header
├─────────────────────────────────┤
│                                 │
│         Arena Map Card          │  ← main
│                                 │
├─────────────────────────────────┤
│  ▲                              │
│ ◄ ▼ ►   │  🎙️ Off  │  📷 Off  │  ← footer
└─────────────────────────────────┘
```

**Why shadcn/ui:**
shadcn gives fully-typed, accessible base components installed directly into `src/components/ui/`. Unlike a component library, you own the code — extend with Tailwind `className` and `cn()` without fighting opinionated styles.

---

## Task 6 — Circular Arena Map Component

**What was built:**
- `client/src/types.ts` — `Position` and `Participant` types (client-side)
- `client/src/components/ArenaMap.tsx` — SVG arena map

**How ArenaMap works:**

The server uses `ARENA_RADIUS = 200`. Participant positions are `{ x, y }` where the origin `(0, 0)` is the center and `x² + y² ≤ 200²`. The SVG `viewBox` is set to `-220 -220 440 440`, so server coordinates map directly to SVG coordinates with no scaling.

**Visual elements:**
| Element | Description |
|---|---|
| Circle boundary | Faint ring at radius 200 — the arena edge |
| Hearing range ring | Dashed circle around the local dot showing audio range |
| Peer dot | Colored circle, radius 9, color derived from participant ID hash |
| Own dot | Blue (#3b82f6), radius 12 (larger to distinguish self) |
| Name label | SVG `<text>` above each dot |
| Mic-active halo | Larger pulsing circle (`animate-pulse`) + drop-shadow filter when `micActive === true` |

**Color assignment:**
Each peer gets a color deterministically from their ID using a simple hash:
```ts
function colorFor(id: string): string {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return PEER_COLORS[h % PEER_COLORS.length]
}
```
Same peer always gets the same color across renders and reconnects.

---

## Task 7 — Direction Buttons and Boundary-Clamped Movement

**What was built:**
- `client/src/lib/arena.ts` — `ARENA_RADIUS`, `STEP_SIZE` constants + `clampToCircle` function
- Direction buttons (▲▼◄►) wired to emit `move` events
- Keyboard arrow key support via `useEffect`

**How `clampToCircle` works:**
```ts
function clampToCircle(pos, dx, dy) {
  const x = pos.x + dx
  const y = pos.y + dy
  const dist = Math.sqrt(x² + y²)
  if (dist <= ARENA_RADIUS) return { x, y }       // inside — return as-is
  const scale = ARENA_RADIUS / dist
  return { x: x * scale, y: y * scale }            // outside — project onto boundary
}
```

The projection works by scaling the vector `(x, y)` down so its length equals `ARENA_RADIUS`. The direction stays the same — the dot slides to the nearest point on the circle edge.

**Optimistic UI:**
Local position is updated immediately in state before the server responds. The server's `room-state` broadcast confirms the move shortly after. On localhost this is imperceptible; on a real network it prevents the dot from lagging behind button presses.

---

## Task 8 — mediasoup-client WebRTC Integration

**What was built:**
- `client/src/types.ts` — extended with `ClientToServerEvents`, `ServerToClientEvents`, `WebRtcTransportParams`, `ConsumerParams` (fully typed socket contract)
- `client/src/hooks/useSocket.ts` — creates and manages the typed socket.io connection
- `client/src/hooks/useMediasoup.ts` — full WebRTC + room lifecycle hook
- `client/src/App.tsx` — wired to both hooks

### `useSocket`

Creates the socket once using a lazy ref (avoids re-creating on re-renders), disconnects on unmount. Returns a fully typed `AppSocket` so every `socket.emit` and `socket.on` call is checked at compile time.

### `useMediasoup`

**`join(roomId, name)` — the full handshake sequence:**
```
1. get-router-rtp-capabilities  →  server joins you to the Socket.io room
2. device.load(rtpCapabilities) →  client Device learns what codecs the server supports
3. create-webrtc-transport      →  server creates send transport, returns ICE/DTLS params
4.   sendTransport.on('connect')  →  wired: sends DTLS fingerprint to server on demand
5.   sendTransport.on('produce')  →  wired: tells server about new media track on demand
6. create-webrtc-transport      →  server creates recv transport
7.   recvTransport.on('connect')  →  wired: same DTLS handshake for recv direction
8. join-room                    →  server sets name + position, broadcasts room-state
```

**`new-producer` listener — auto-consume:**
When another peer starts producing (mic/camera), the server emits `new-producer`. The hook automatically:
1. Emits `consume` to the server with the recv transport ID + device RTP capabilities
2. Server creates a Consumer and returns its parameters
3. `recvTransport.consume(params)` → mediasoup Consumer
4. `new MediaStream([consumer.track])` → stored in `remoteStreams` keyed by `socketId`

**`room-state` listener:**
Every time someone joins, leaves, moves, or toggles mic, the server broadcasts the full participant list. The hook updates `participants` state and derives `localId` by finding the entry where `socketId === socket.id`.

**Why `localId` is derived from `room-state` not from `socket.id` directly:**
The server assigns a UUID (`crypto.randomUUID()`) as the participant's `id`, separate from the socket ID. This UUID is stable across reconnects if the server ever supports that. The client finds its own entry by matching `socketId`, then uses the UUID as `localId` for all subsequent lookups.

**Optimistic position in `App.tsx`:**
```ts
const displayParticipants = useMemo(() =>
  participants.map(p => p.id === localId ? { ...p, position: localPosition } : p),
  [participants, localId, localPosition]
)
```
The local participant's position is overridden with the client-side `localPosition` state so movement feels instant, independent of server round-trip time.

---

## Task 9 — Spatial Audio with Web Audio API

**What was built:**
- `client/src/lib/audio.ts` — `calculateGain(distance, hearingRadius)` pure function
- `client/src/lib/arena.ts` — added `HEARING_RADIUS = 150` constant
- `client/src/hooks/useSpatialAudio.ts` — manages AudioContext + GainNodes per remote peer
- `client/src/App.tsx` — wired `useSpatialAudio` with `remoteStreams` and `displayParticipants`

**How the audio graph works:**

For each remote peer a chain is built inside the Web Audio API:
```
MediaStreamSource → GainNode → AudioContext.destination
```
The `GainNode.gain.value` (0.0–1.0) controls volume. It is recalculated on every position update using `calculateGain`.

**`calculateGain` — linear falloff:**
```ts
function calculateGain(distance, hearingRadius) {
  if (distance >= hearingRadius) return 0       // silence beyond range
  return 1 - distance / hearingRadius           // linear 1.0 → 0.0
}
```
At distance 0 the peer is at full volume. At `hearingRadius` (150 units) they go silent. Linear falloff feels natural for this kind of spatial awareness use case.

**`useSpatialAudio` — three responsibilities:**

1. **Node lifecycle** — when `remoteStreams` changes, creates or destroys `Source + GainNode` pairs. Nodes are keyed by `socketId`.
2. **Gain updates** — on every `participants` or position change, recomputes Euclidean distance from local dot to each remote dot and sets the gain.
3. **Cleanup** — closes the `AudioContext` on unmount to release browser audio resources.

**Why `displayParticipants` (not raw `participants`) is passed in:**
`displayParticipants` already has the local participant's optimistic position merged in. This means the gain recalculates instantly when the local dot moves — no waiting for the server's `room-state` round-trip.

**AudioContext and browser autoplay policy:**
Browsers block audio until user interaction. The `AudioContext` is created lazily — only when the first remote stream arrives (which happens after the user has clicked Join, satisfying the interaction requirement). If the context is suspended at that point, `ctx.resume()` is called.

---

## Architecture Overview

```
Browser                                    Server
────────                                   ──────
useSocket ──── socket.io ────────────────► handlers.ts
                                               │
useMediasoup                               RoomManager
  ├── Device                                   ├── rooms: Map<roomId, Room>
  ├── sendTransport ── WebRTC (ICE/DTLS) ──►   │     └── members: Map<socketId, Member>
  └── recvTransport ◄─ WebRTC (RTP) ──────     └── socketToRoom: Map<socketId, roomId>
                                           
                                           mediasoup.ts
                                               ├── Worker  (1 per server)
                                               ├── Router  (1 per room)
                                               └── Transport factory
```

**Data flow for a move:**
```
User presses ▲
  → clampToCircle computes new position
  → setLocalPosition (optimistic, instant render)
  → socket.emit('move', position)
  → server validates + updates Member
  → server broadcasts room-state to all peers
  → all clients' room-state handler fires
  → setParticipants (all dots update)
```
