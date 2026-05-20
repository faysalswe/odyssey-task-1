import type { types as msTypes } from 'mediasoup-client'

export type Position = { x: number; y: number }

export type Participant = {
  id: string
  socketId: string
  name: string
  position: Position
  micActive: boolean
}

export type WebRtcTransportParams = {
  id: string
  iceParameters: msTypes.IceParameters
  iceCandidates: msTypes.IceCandidate[]
  dtlsParameters: msTypes.DtlsParameters
}

export type ConsumerParams = {
  id: string
  producerId: string
  kind: msTypes.MediaKind
  rtpParameters: msTypes.RtpParameters
}

export type ClientToServerEvents = {
  'get-router-rtp-capabilities': (roomId: string, callback: (caps: msTypes.RtpCapabilities) => void) => void
  'create-webrtc-transport': (
    data: { roomId: string },
    callback: (params: WebRtcTransportParams | { error: string }) => void
  ) => void
  'connect-transport': (
    data: { transportId: string; dtlsParameters: msTypes.DtlsParameters },
    callback: (result: { error?: string }) => void
  ) => void
  produce: (
    data: { transportId: string; kind: msTypes.MediaKind; rtpParameters: msTypes.RtpParameters },
    callback: (result: { id: string } | { error: string }) => void
  ) => void
  consume: (
    data: { roomId: string; transportId: string; producerId: string; rtpCapabilities: msTypes.RtpCapabilities },
    callback: (params: ConsumerParams | { error: string }) => void
  ) => void
  'join-room': (data: { roomId: string; name: string }, callback: (result: { error?: string }) => void) => void
  'leave-room': () => void
  move: (position: Position) => void
  'mic-status': (micActive: boolean) => void
}

export type ServerToClientEvents = {
  'new-producer': (data: { producerId: string; socketId: string; kind: msTypes.MediaKind }) => void
  'room-state': (participants: Participant[]) => void
}
