# Spatial Audio & Video Room

Real-time spatial audio/video room — users appear as dots on a circular arena map, move around, and hear each other with distance-based volume falloff.

## Stack

| Layer | Tech |
|---|---|
| Server | Node.js · mediasoup · Socket.io · Express |
| Client | React · TypeScript · Vite · mediasoup-client · Web Audio API |
| Styling | Tailwind CSS · shadcn/ui |
| Deploy | Server → Fly.io · Frontend → Cloudflare Pages |

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
| `ANNOUNCED_IP` | Public IP announced in WebRTC ICE candidates |
| `WEBRTC_SERVER_PORT` | TCP port for mediasoup WebRtcServer (default: `10000`) |

### Client (`client/.env.local`)

| Variable | Description |
|---|---|
| `VITE_SERVER_URL` | Full URL of the deployed server |

## Deployment

### Server — Fly.io

```bash
cd server
fly deploy
```

**IPv6 note:** Fly.io free tier uses a shared IPv4 address that only routes ports 80 and 443. WebRTC media requires port 10000, which is blocked on shared IPv4. The server is configured with a free dedicated IPv6 address (`2a09:8280:1::118:8439:0`) which routes all ports. Audio/video requires IPv6 connectivity on the client's network.

### Frontend — Cloudflare Pages

```bash
cd client
npm run build
wrangler pages deploy dist
```

## API

| Endpoint | Description |
|---|---|
| `GET /health` | Returns `200 OK` |
