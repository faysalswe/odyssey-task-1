import type { Position } from '@/types'

export const ARENA_RADIUS = 200
export const STEP_SIZE = 10
export const HEARING_RADIUS = 150

export function clampToCircle(pos: Position, dx: number, dy: number): Position {
  const x = pos.x + dx
  const y = pos.y + dy
  const dist = Math.sqrt(x * x + y * y)
  if (dist <= ARENA_RADIUS) return { x, y }
  const scale = ARENA_RADIUS / dist
  return { x: x * scale, y: y * scale }
}
