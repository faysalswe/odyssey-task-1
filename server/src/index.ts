import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import type { types } from 'mediasoup'
import { createWorker } from './mediasoup'
import { RoomManager } from './room'
import { registerHandlers } from './handlers'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from './types'

const PORT = process.env.PORT ?? 3000

const app = express()
const httpServer = createServer(app)

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, { cors: { origin: '*' } })

app.use(express.json())

const roomManager = new RoomManager()

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.get('/rooms/:roomId/participants', (req, res) => {
  res.status(200).json({ participants: roomManager.getParticipants(req.params.roomId) })
})

let worker: types.Worker

async function start() {
  worker = await createWorker()
  console.log('[mediasoup] worker created')

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`)
    registerHandlers(socket, io, roomManager, worker)
  })

  httpServer.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('[server] startup error:', err)
  process.exit(1)
})
