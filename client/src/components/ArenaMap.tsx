import type { Participant } from '@/types'
import { ARENA_RADIUS } from '@/lib/arena'

const SVG_PADDING = 20
const LOCAL_COLOR = '#3b82f6'
const PEER_COLORS = ['#f97316', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#eab308']

function colorFor(id: string): string {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return PEER_COLORS[h % PEER_COLORS.length]
}

type Props = {
  participants: Participant[]
  localId: string
  hearingRadius: number
}

export default function ArenaMap({ participants, localId, hearingRadius }: Props) {
  const local = participants.find(p => p.id === localId)
  const extent = ARENA_RADIUS + SVG_PADDING
  const viewBox = `${-extent} ${-extent} ${extent * 2} ${extent * 2}`

  return (
    <svg viewBox={viewBox} className="w-full h-full">
      {/* Arena boundary */}
      <circle cx={0} cy={0} r={ARENA_RADIUS} fill="none" stroke="currentColor" strokeWidth={2} opacity={0.2} />

      {/* Hearing range ring around local dot */}
      {local && (
        <circle
          cx={local.position.x}
          cy={local.position.y}
          r={hearingRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.2}
        />
      )}

      {participants.map(p => {
        const isLocal = p.id === localId
        const r = isLocal ? 12 : 9
        const color = isLocal ? LOCAL_COLOR : colorFor(p.id)

        return (
          <g key={p.id}>
            {p.micActive && (
              <circle
                cx={p.position.x}
                cy={p.position.y}
                r={r + 8}
                fill={color}
                opacity={0.3}
                className="animate-pulse"
              />
            )}
            <circle
              cx={p.position.x}
              cy={p.position.y}
              r={r}
              fill={color}
              style={p.micActive ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}
            />
            <text
              x={p.position.x}
              y={p.position.y - r - 5}
              textAnchor="middle"
              fill="currentColor"
              fontSize={10}
              className="select-none"
            >
              {p.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
