export function calculateGain(distance: number, hearingRadius: number): number {
  if (distance >= hearingRadius) return 0
  return 1 - distance / hearingRadius
}
