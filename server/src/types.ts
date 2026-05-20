import type { types } from 'mediasoup'

export type Position = { x: number; y: number }

// Broadcast shape — what clients receive over the wire
export type Participant = {
  id: string
  socketId: string
  name: string
  position: Position
  micActive: boolean
}

export type WebRtcTransportParams = {
  id: string
  iceParameters: types.IceParameters
  iceCandidates: types.IceCandidate[]
  dtlsParameters: types.DtlsParameters
}

export type ConsumerParams = {
  id: string
  producerId: string
  kind: types.MediaKind
  rtpParameters: types.RtpParameters
}

export type ClientToServerEvents = {
  'get-router-rtp-capabilities': (
    roomId: string,
    callback: (rtpCapabilities: types.RtpCapabilities) => void
  ) => void
  'create-webrtc-transport': (
    data: { roomId: string },
    callback: (params: WebRtcTransportParams | { error: string }) => void
  ) => void
  'connect-transport': (
    data: { transportId: string; dtlsParameters: types.DtlsParameters },
    callback: (result: { error?: string }) => void
  ) => void
  produce: (
    data: { transportId: string; kind: types.MediaKind; rtpParameters: types.RtpParameters },
    callback: (result: { id: string } | { error: string }) => void
  ) => void
  consume: (
    data: { roomId: string; transportId: string; producerId: string; rtpCapabilities: types.RtpCapabilities },
    callback: (params: ConsumerParams | { error: string }) => void
  ) => void
  'join-room': (
    data: { roomId: string; name: string },
    callback: (result: { error?: string }) => void
  ) => void
  'leave-room': () => void
  move: (position: Position) => void
  'mic-status': (micActive: boolean) => void
}

export type ServerToClientEvents = {
  'new-producer': (data: { producerId: string; socketId: string; kind: types.MediaKind }) => void
  'room-state': (participants: Participant[]) => void
}

export type InterServerEvents = Record<string, never>
export type SocketData = Record<string, never>
