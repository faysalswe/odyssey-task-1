import { createRouter } from './mediasoup'
import type { types } from 'mediasoup'
import type { Participant, Position } from './types'

export const ARENA_RADIUS = 350

// Full internal object — identity + media plumbing together
type Member = {
  id: string
  socketId: string
  name: string | null
  position: Position | null
  micActive: boolean
  transports: Map<string, types.WebRtcTransport>
  producers: Map<string, types.Producer>
  consumers: Map<string, types.Consumer>
}

type Room = {
  router: types.Router
  members: Map<string, Member>
}

export class RoomManager {
  private rooms = new Map<string, Room>()
  private socketToRoom = new Map<string, string>()

  async getOrCreate(roomId: string, worker: types.Worker): Promise<Room> {
    let room = this.rooms.get(roomId)
    if (!room) {
      const router = await createRouter(worker)
      room = { router, members: new Map() }
      this.rooms.set(roomId, room)
      console.log(`[room] created: ${roomId}`)
    }
    return room
  }

  getRouter(roomId: string): types.Router | undefined {
    return this.rooms.get(roomId)?.router
  }

  getRoomId(socketId: string): string | undefined {
    return this.socketToRoom.get(socketId)
  }

  addMember(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId)
    if (!room || room.members.has(socketId)) return
    room.members.set(socketId, {
      id: crypto.randomUUID(),
      socketId,
      name: null,
      position: null,
      micActive: false,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    })
    this.socketToRoom.set(socketId, roomId)
  }

  setIdentity(roomId: string, socketId: string, name: string): boolean {
    const member = this.rooms.get(roomId)?.members.get(socketId)
    if (!member) return false
    member.name = name
    member.position = { x: 0, y: 0 }
    return true
  }

  removeMember(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId)
    if (!room) return
    const member = room.members.get(socketId)
    if (member) {
      member.consumers.forEach((c) => c.close())
      member.producers.forEach((p) => p.close())
      member.transports.forEach((t) => t.close())
      room.members.delete(socketId)
    }
    this.socketToRoom.delete(socketId)
  }

  addTransport(roomId: string, socketId: string, transport: types.WebRtcTransport): void {
    this.rooms.get(roomId)?.members.get(socketId)?.transports.set(transport.id, transport)
  }

  getTransport(roomId: string, socketId: string, transportId: string): types.WebRtcTransport | undefined {
    return this.rooms.get(roomId)?.members.get(socketId)?.transports.get(transportId)
  }

  addProducer(roomId: string, socketId: string, producer: types.Producer): void {
    this.rooms.get(roomId)?.members.get(socketId)?.producers.set(producer.id, producer)
  }

  addConsumer(roomId: string, socketId: string, consumer: types.Consumer): void {
    this.rooms.get(roomId)?.members.get(socketId)?.consumers.set(consumer.id, consumer)
  }

  moveParticipant(roomId: string, socketId: string, position: Position): boolean {
    const member = this.rooms.get(roomId)?.members.get(socketId)
    if (!member) return false
    const { x, y } = position
    if (Math.abs(x) > ARENA_RADIUS || Math.abs(y) > ARENA_RADIUS) return false
    member.position = position
    return true
  }

  setMicStatus(roomId: string, socketId: string, micActive: boolean): boolean {
    const member = this.rooms.get(roomId)?.members.get(socketId)
    if (!member) return false
    member.micActive = micActive
    return true
  }

  getParticipants(roomId: string): Participant[] {
    const room = this.rooms.get(roomId)
    if (!room) return []
    return [...room.members.values()]
      .filter((m): m is Member & { name: string; position: Position } =>
        m.name !== null && m.position !== null
      )
      .map(({ id, socketId, name, position, micActive }) => ({ id, socketId, name, position, micActive }))
  }
}
