Candidate Task — Odyssey Engineering Assessment
Two independent tasks. Complete both. Each is assessed separately.

Build everything from scratch.

TASK 1 — Spatial Audio & Video Room (Build Frontend + Server)
What we are testing: mediasoup server setup, mediasoup-client WebRTC integration, spatial audio with Web Audio API, React frontend, deployment

Overview
Build a Node.js mediasoup server and a React frontend from scratch. Users join a room, appear as dots on a big circular arena map, move around using direction buttons, and hear each other — volume automatically gets louder or quieter depending on how close the dots are on the map.

PART A — Server (Node.js + mediasoup + Socket.io)
What we want to see:

Users can join and leave named rooms
The server tracks every participant's position and broadcasts updates to others in the room in real time
The server handles WebRTC transport, producer, and consumer lifecycle so audio and video can flow between participants
A /health endpoint returns a 200 response
A /rooms/:roomId/participants endpoint returns the current participants and their positions
PART B — Frontend (React + TypeScript + Vite)
UI Layout
┌──────────────────────────────────────────────────┐
│  Room: [input]   Name: [input]   [Join] [Leave]  │
├──────────────────────────────────────────────────┤
│                                                  │
│         BIG CIRCULAR ARENA MAP                   │
│         (400–500px diameter circle)              │
│                                                  │
│   • Each user = a coloured dot with name label   │
│   • Your dot = distinct colour + border          │
│   • Hearing range = faint circle around your dot │
│   • Dot glows/pulses when user has mic on        │
│                                                  │
├──────────────────────────────────────────────────┤
│   [▲]                [🎙️ Mic]  [📷 Camera]       │
│  [◄][►]   Move                                   │
│   [▼]                                            │
└──────────────────────────────────────────────────┘
Feature 1 — Circular Arena Map
Large circle (SVG or Canvas, 400–500px diameter)
Each participant appears as a coloured dot with their name label
Your own dot is a distinct colour and slightly larger
A faint circle around your dot indicates the hearing range
When a participant has their mic active, their dot pulses or glows
Feature 2 — Direction Buttons (Move the Dot)
Four arrow buttons below the map: Up / Down / Left / Right.

Pressing a button moves your dot in that direction
Your dot updates on the circle map immediately and other users see it move in real time
The dot cannot go outside the circle arena boundary
Feature 3 — Spatial Audio (Distance-Based Volume)
Audio from other participants plays in the browser
Volume gets louder as two dots move closer together and quieter as they move apart
Users outside the hearing range are silent
Feature 4 — Mic Toggle
Mic on/off button
When on, your voice is broadcast to others in the room
When off, your audio track is stopped and removed
Feature 5 — Camera Toggle
Camera on/off button
Your own video preview is shown when camera is on
Incoming video from other participants is visible as small tiles alongside the map
PART C — Deployment
Deploy both the server and frontend publicly.

Server:

Deploy to Fly.io (free tier — supports UDP needed for mediasoup)
Set ANNOUNCED_IP to your Fly.io machine IP
GET https://your-app.fly.dev/health must return 200 OK
Frontend:

Static Vite build → deploy to Netlify, Vercel, or Cloudflare Pages
Point VITE_SERVER_URL env var to your Fly.io server URL
Acceptance:

/health endpoint returns 200 OK
Two browser tabs on different machines join the same room
Both dots visible on the circular map
Direction buttons move the dot — other tab sees it move in real time
Mic works — audio heard, volume fades as dots move apart
Camera works — video visible from other participant
Dot pulses when mic is on
Task 1 Deliverables
GitHub repo — frontend + server code
Live public URL of the frontend
Live public URL of the server (/health must respond)

# Evaluation Criteria

| Area | What we look for |
|---|---|
| **mediasoup integration** | Audio and video work correctly, no drops |
| **Spatial audio** | Volume changes (attentuates) realistically with distance on the map |
| **Map UI** | Circular arena clean, dots accurate, pulse when speaking |
| **Code quality** | TypeScript, clean structure, no prop drilling |
| **Docker** | Single-command startup, env-driven config, health check passes |
| **Kubernetes** | Valid manifests, all pods Running, UDP handling explained |
| **Three.js / GLB** | Character renders, animations switch correctly |
