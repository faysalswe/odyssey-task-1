# Spatial Audio & Video Room

Real-time spatial audio/video room — users appear as dots on a circular arena map, move around, and hear each other with distance-based volume falloff.

## Stack

| Layer | Tech |
|---|---|
| Server | Node.js · mediasoup · Socket.io · Express |
| Client | React · TypeScript · Vite · mediasoup-client · Web Audio API |
| Styling | Tailwind CSS · shadcn/ui |
| Deploy | Server → Fly.io · Frontend → Netlify/Vercel/Cloudflare Pages |

## Monorepo Layout

```
odyssey-task-1/
├── server/     # Node.js WebRTC + signalling server
├── client/     # React frontend
└── docs/       # Project documentation and task tracking
```

## Getting Started

### Server

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### Client

```bash
cd client
cp .env.local.example .env.local
npm install
npm run dev
```

Open `http://localhost:5173` in two tabs and join the same room.

## Environment Variables

### Server (`server/.env`)

| Variable | Description |
|---|---|
| `PORT` | HTTP server port (default: `3000`) |
| `ANNOUNCED_IP` | Public IP for mediasoup RTP (required on Fly.io) |
| `MEDIASOUP_MIN_PORT` | UDP port range start (default: `10000`) |
| `MEDIASOUP_MAX_PORT` | UDP port range end (default: `10100`) |

### Client (`client/.env.local`)

| Variable | Description |
|---|---|
| `VITE_SERVER_URL` | Full URL of the deployed server |

## API

| Endpoint | Description |
|---|---|
| `GET /health` | Returns `200 OK` |
| `GET /rooms/:roomId/participants` | Returns participants and positions for a room |

## Docs

- [`docs/TASKS.md`](docs/TASKS.md) — task checklist
- [`docs/ASSIGNMENT.md`](docs/ASSIGNMENT.md) — original brief
