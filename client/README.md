# Spatial Audio & Video Room — Client

React + TypeScript + Vite frontend for the spatial audio room app.

## Getting Started

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Open `http://localhost:5173` in two tabs and join the same room name.

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SERVER_URL` | Full URL of the deployed server |

## Deploy

```bash
npm run build
wrangler pages deploy dist
```
