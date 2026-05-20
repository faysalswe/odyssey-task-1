import type { Server, Socket } from 'socket.io'
import type { types } from 'mediasoup'
import { createWebRtcTransport } from './mediasoup'
import type { RoomManager } from './room'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  Position,
} from './types'

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

export function registerHandlers(
  socket: AppSocket,
  io: AppServer,
  roomManager: RoomManager,
  worker: types.Worker
) {
  // ── WebRTC / mediasoup ────────────────────────────────────────────────────

  socket.on('get-router-rtp-capabilities', async (roomId, callback) => {
    try {
      const room = await roomManager.getOrCreate(roomId, worker)
      roomManager.addMember(roomId, socket.id)
      socket.join(roomId)
      callback(room.router.rtpCapabilities)
    } catch (err) {
      console.error('[get-router-rtp-capabilities]', err)
    }
  })

  socket.on('create-webrtc-transport', async ({ roomId }, callback) => {
    try {
      const room = await roomManager.getOrCreate(roomId, worker)
      const transport = await createWebRtcTransport(room.router)
      roomManager.addTransport(roomId, socket.id, transport)
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
      const roomId = roomManager.getRoomId(socket.id)
      const transport = roomId ? roomManager.getTransport(roomId, socket.id, transportId) : undefined
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
      const roomId = roomManager.getRoomId(socket.id)
      const transport = roomId ? roomManager.getTransport(roomId, socket.id, transportId) : undefined
      if (!roomId || !transport) { callback({ error: 'transport not found' }); return }
      const producer = await transport.produce({ kind, rtpParameters })
      roomManager.addProducer(roomId, socket.id, producer)
      socket.to(roomId).emit('new-producer', { producerId: producer.id, socketId: socket.id, kind })
      callback({ id: producer.id })
    } catch (err) {
      console.error('[produce]', err)
      callback({ error: String(err) })
    }
  })

  socket.on('consume', async ({ roomId, transportId, producerId, rtpCapabilities }, callback) => {
    try {
      const router = roomManager.getRouter(roomId)
      const transport = roomManager.getTransport(roomId, socket.id, transportId)
      if (!router || !transport) { callback({ error: 'room or transport not found' }); return }
      if (!router.canConsume({ producerId, rtpCapabilities })) { callback({ error: 'cannot consume' }); return }
      const consumer = await transport.consume({ producerId, rtpCapabilities, paused: false })
      roomManager.addConsumer(roomId, socket.id, consumer)
      callback({ id: consumer.id, producerId, kind: consumer.kind, rtpParameters: consumer.rtpParameters })
    } catch (err) {
      console.error('[consume]', err)
      callback({ error: String(err) })
    }
  })

  // ── Room presence ─────────────────────────────────────────────────────────

  socket.on('join-room', ({ roomId, name }, callback) => {
    try {
      roomManager.setIdentity(roomId, socket.id, name)
      for (const p of roomManager.getExistingProducers(roomId, socket.id)) {
        socket.emit('new-producer', { producerId: p.producerId, socketId: p.socketId, kind: p.kind })
      }
      io.to(roomId).emit('room-state', roomManager.getParticipants(roomId))
      console.log(`[room] ${name} joined ${roomId}`)
      callback({})
    } catch (err) {
      console.error('[join-room]', err)
      callback({ error: String(err) })
    }
  })

  socket.on('leave-room', () => {
    const roomId = roomManager.getRoomId(socket.id)
    if (!roomId) return
    roomManager.removeMember(roomId, socket.id)
    io.to(roomId).emit('room-state', roomManager.getParticipants(roomId))
    socket.leave(roomId)
    console.log(`[room] ${socket.id} left ${roomId}`)
  })

  socket.on('move', (position: Position) => {
    const roomId = roomManager.getRoomId(socket.id)
    if (!roomId) return
    const moved = roomManager.moveParticipant(roomId, socket.id, position)
    if (moved) io.to(roomId).emit('room-state', roomManager.getParticipants(roomId))
  })

  socket.on('mic-status', (micActive: boolean) => {
    const roomId = roomManager.getRoomId(socket.id)
    if (!roomId) return
    roomManager.setMicStatus(roomId, socket.id, micActive)
    io.to(roomId).emit('room-state', roomManager.getParticipants(roomId))
  })

  // ── Disconnect ────────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${socket.id}`)
    const roomId = roomManager.getRoomId(socket.id)
    if (roomId) {
      roomManager.removeMember(roomId, socket.id)
      io.to(roomId).emit('room-state', roomManager.getParticipants(roomId))
    }
  })
}
