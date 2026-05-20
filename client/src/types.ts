export type Position = { x: number; y: number }

export type Participant = {
  id: string
  socketId: string
  name: string
  position: Position
  micActive: boolean
}
