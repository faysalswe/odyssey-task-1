import type { Position } from '@/types'

export const ARENA_RADIUS = 350
export const STEP_SIZE = 10
export const HEARING_RADIUS = 100

export function clampToCircle(pos: Position, dx: number, dy: number): Position {
  const nx = pos.x + dx
  const ny = pos.y + dy
  const dist = Math.sqrt(nx * nx + ny * ny)
  if (dist <= ARENA_RADIUS) return { x: nx, y: ny }
  return { x: (nx / dist) * ARENA_RADIUS, y: (ny / dist) * ARENA_RADIUS }
}
