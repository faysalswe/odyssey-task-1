import type { Participant } from '@/types'
import { ARENA_RADIUS } from '@/lib/arena'

const SVG_PADDING = 20
const LOCAL_COLOR = '#4ade80'
const PEER_COLORS = ['#fb923c', '#60a5fa', '#c084fc', '#f472b6', '#2dd4bf', '#facc15']

function colorFor(id: string): string {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return PEER_COLORS[h % PEER_COLORS.length]
}

function trianglePoints(cx: number, cy: number, r: number): string {
  return `${cx},${cy - r} ${cx + r},${cy + r * 0.75} ${cx - r},${cy + r * 0.75}`
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
      <defs>
        <radialGradient id="arena-bg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0b1221" />
        </radialGradient>
        <clipPath id="arena-clip">
          <circle cx={0} cy={0} r={ARENA_RADIUS} />
        </clipPath>
      </defs>

      {/* Arena background */}
      <circle cx={0} cy={0} r={ARENA_RADIUS} fill="url(#arena-bg)" />

      {/* Subtle grid */}
      <g opacity={0.06} stroke="#94a3b8" strokeWidth={1} clipPath="url(#arena-clip)">
        {[-300, -250, -200, -150, -100, -50, 0, 50, 100, 150, 200, 250, 300].map(v => (
          <line key={`h${v}`} x1={-ARENA_RADIUS} y1={v} x2={ARENA_RADIUS} y2={v} />
        ))}
        {[-300, -250, -200, -150, -100, -50, 0, 50, 100, 150, 200, 250, 300].map(v => (
          <line key={`v${v}`} x1={v} y1={-ARENA_RADIUS} x2={v} y2={ARENA_RADIUS} />
        ))}
      </g>

      {/* Center crosshair */}
      {local && (
        <g opacity={0.1} stroke="#94a3b8" strokeWidth={0.75} clipPath="url(#arena-clip)">
          <line x1={-ARENA_RADIUS} y1={0} x2={ARENA_RADIUS} y2={0} />
          <line x1={0} y1={-ARENA_RADIUS} x2={0} y2={ARENA_RADIUS} />
        </g>
      )}

      {/* Hearing radius — radial gradient fading from strong at player to silent at edge */}
      {local && (
        <>
          <defs>
            <radialGradient
              id="hearing-gradient"
              cx={local.position.x}
              cy={local.position.y}
              r={hearingRadius}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
            </radialGradient>
          </defs>
          <g clipPath="url(#arena-clip)">
            <circle
              cx={local.position.x}
              cy={local.position.y}
              r={hearingRadius}
              fill="url(#hearing-gradient)"
            />
          </g>
        </>
      )}

      {/* Arena boundary — drawn on top so it reads as the wall */}
      <circle
        cx={0}
        cy={0}
        r={ARENA_RADIUS}
        fill="none"
        stroke="#60a5fa"
        strokeWidth={2}
        opacity={0.35}
      />

      {/* Participants */}
      <g clipPath="url(#arena-clip)">
        {participants.map(p => {
          const isLocal = p.id === localId
          const r = isLocal ? 10 : 8
          const color = isLocal ? LOCAL_COLOR : colorFor(p.id)

          return (
            <g key={p.id}>
              {/* Mic-active pulse halo */}
              {p.micActive && (
                <circle
                  cx={p.position.x}
                  cy={p.position.y}
                  r={r + 7}
                  fill={color}
                  opacity={0.18}
                  className="animate-pulse"
                />
              )}

              {isLocal ? (
                /* Own player — upward triangle */
                <>
                  <polygon points={trianglePoints(p.position.x + 1, p.position.y + 1, r)} fill="#000" opacity={0.4} />
                  <polygon
                    points={trianglePoints(p.position.x, p.position.y, r)}
                    fill={color}
                    filter={p.micActive ? `drop-shadow(0 0 6px ${color})` : undefined}
                  />
                </>
              ) : (
                /* Other participants — circle */
                <>
                  <circle cx={p.position.x + 1} cy={p.position.y + 1} r={r} fill="#000" opacity={0.45} />
                  <circle
                    cx={p.position.x}
                    cy={p.position.y}
                    r={r}
                    fill={color}
                    filter={p.micActive ? `drop-shadow(0 0 5px ${color})` : undefined}
                  />
                </>
              )}

              {/* Name label */}
              <text
                x={p.position.x}
                y={p.position.y - r - (isLocal ? 4 : 6)}
                textAnchor="middle"
                fill="#cbd5e1"
                fontSize={9}
                fontFamily="system-ui, sans-serif"
                className="select-none"
              >
                {p.name}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
