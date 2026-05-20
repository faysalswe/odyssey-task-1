import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import type { types } from 'mediasoup'
import { createWorker, createRouter, createWebRtcTransport } from './mediasoup'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  Peer,
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

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

// Placeholder — implemented in Task 4
app.get('/rooms/:roomId/participants', (_req, res) => {
  res.status(200).json({ participants: [] })
})

const rooms = new Map<string, { router: types.Router }>()
const peers = new Map<string, Peer>()

function getOrCreatePeer(socketId: string): Peer {
  let peer = peers.get(socketId)
  if (!peer) {
    peer = { socketId, roomId: null, transports: new Map(), producers: new Map(), consumers: new Map() }
    peers.set(socketId, peer)
  }
  return peer
}

async function getOrCreateRoom(roomId: string): Promise<{ router: types.Router }> {
  let room = rooms.get(roomId)
  if (!room) {
    const router = await createRouter(worker)
    room = { router }
    rooms.set(roomId, room)
    console.log(`[room] created: ${roomId}`)
  }
  return room
}

let worker: types.Worker

async function start() {
  worker = await createWorker()
  console.log('[mediasoup] worker created')

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`)

    socket.on('get-router-rtp-capabilities', async (roomId, callback) => {
      try {
        const room = await getOrCreateRoom(roomId)
        const peer = getOrCreatePeer(socket.id)
        peer.roomId = roomId
        socket.join(roomId)
        callback(room.router.rtpCapabilities)
      } catch (err) {
        console.error('[get-router-rtp-capabilities]', err)
      }
    })

    socket.on('create-webrtc-transport', async ({ roomId }, callback) => {
      try {
        const room = await getOrCreateRoom(roomId)
        const transport = await createWebRtcTransport(room.router)
        getOrCreatePeer(socket.id).transports.set(transport.id, transport)
        callback({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        })
      } catch (err) {
        console.error('[create-webrtc-transport]', err)
        callback({ error: String(err) })
      }
    })

    socket.on('connect-transport', async ({ transportId, dtlsParameters }, callback) => {
      try {
        const transport = peers.get(socket.id)?.transports.get(transportId)
        if (!transport) { callback({ error: 'transport not found' }); return }
        await transport.connect({ dtlsParameters })
        callback({})
      } catch (err) {
        console.error('[connect-transport]', err)
        callback({ error: String(err) })
      }
    })

    socket.on('produce', async ({ transportId, kind, rtpParameters }, callback) => {
      try {
        const peer = peers.get(socket.id)
        const transport = peer?.transports.get(transportId)
        if (!peer || !transport) { callback({ error: 'transport not found' }); return }
        const producer = await transport.produce({ kind, rtpParameters })
        peer.producers.set(producer.id, producer)
        if (peer.roomId) {
          socket.to(peer.roomId).emit('new-producer', { producerId: producer.id, socketId: socket.id, kind })
        }
        callback({ id: producer.id })
      } catch (err) {
        console.error('[produce]', err)
        callback({ error: String(err) })
      }
    })

    socket.on('consume', async ({ roomId, transportId, producerId, rtpCapabilities }, callback) => {
      try {
        const room = rooms.get(roomId)
        const peer = peers.get(socket.id)
        const transport = peer?.transports.get(transportId)
        if (!room || !peer || !transport) { callback({ error: 'room, peer, or transport not found' }); return }
        if (!room.router.canConsume({ producerId, rtpCapabilities })) {
          callback({ error: 'cannot consume' }); return
        }
        const consumer = await transport.consume({ producerId, rtpCapabilities, paused: false })
        peer.consumers.set(consumer.id, consumer)
        callback({ id: consumer.id, producerId, kind: consumer.kind, rtpParameters: consumer.rtpParameters })
      } catch (err) {
        console.error('[consume]', err)
        callback({ error: String(err) })
      }
    })

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`)
      const peer = peers.get(socket.id)
      if (peer) {
        peer.consumers.forEach((c) => c.close())
        peer.producers.forEach((p) => p.close())
        peer.transports.forEach((t) => t.close())
        peers.delete(socket.id)
      }
    })
  })

  httpServer.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('[server] startup error:', err)
  process.exit(1)
})
