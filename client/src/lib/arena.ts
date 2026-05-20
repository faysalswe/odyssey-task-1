import type { Position } from '@/types'

export const ARENA_RADIUS = 350
export const STEP_SIZE = 10
export const HEARING_RADIUS = 100

export function clampToRect(pos: Position, dx: number, dy: number): Position {
  return {
    x: Math.max(-ARENA_RADIUS, Math.min(ARENA_RADIUS, pos.x + dx)),
    y: Math.max(-ARENA_RADIUS, Math.min(ARENA_RADIUS, pos.y + dy)),
  }
}
