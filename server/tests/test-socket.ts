/**
 * Socket test — runs against a live server (npm run dev in another terminal)
 * Usage: npx tsx tests/test-socket.ts
 */
import { io } from 'socket.io-client'
import type { Participant, Position } from '../src/types'

const SERVER = 'http://localhost:3000'
const ROOM_ID = 'test-room'

let passed = 0
let failed = 0

function ok(label: string) {
  console.log(`  ✓ ${label}`)
  passed++
}

function fail(label: string, detail?: unknown) {
  console.error(`  ✗ ${label}`, detail ?? '')
  failed++
}

function connect() {
  return new Promise<ReturnType<typeof io>>((resolve, reject) => {
    const socket = io(SERVER, { transports: ['websocket'] })
    socket.on('connect', () => resolve(socket))
    socket.on('connect_error', reject)
  })
}

async function run() {
  console.log('\n── Connecting to', SERVER, '──\n')

  const socket1 = await connect()
  const socket2 = await connect()
  ok(`two sockets connected (${socket1.id}, ${socket2.id})`)

  // ── Task 3: router caps + transports ─────────────────────────────────────
  console.log('\n[1] get-router-rtp-capabilities')
  const caps = await new Promise<Record<string, unknown>>((resolve) => {
    socket1.emit('get-router-rtp-capabilities', ROOM_ID, (c: Record<string, unknown>) => resolve(c))
  })
  const codecs = caps.codecs as Array<{ mimeType: string }> | undefined
  codecs && codecs.length >= 2
    ? ok(`${codecs.length} codecs: ${codecs.map((c) => c.mimeType).join(', ')}`)
    : fail('expected >= 2 codecs', codecs)

  console.log('\n[2] create-webrtc-transport')
  const transport1 = await new Promise<Record<string, unknown>>((resolve) => {
    socket1.emit('create-webrtc-transport', { roomId: ROOM_ID }, (p: Record<string, unknown>) => resolve(p))
  })
  'error' in transport1
    ? fail('create transport', transport1.error)
    : ok(`transport created: ${transport1.id}`)

  // ── Member vs Participant — mid-handshake socket not visible ────────────
  console.log('\n[3] mid-handshake member not visible before join-room')

  await new Promise<void>((resolve) => {
    socket2.emit('get-router-rtp-capabilities', ROOM_ID, () => resolve())
  })

  const preJoinRes = await fetch(`${SERVER}/rooms/${ROOM_ID}/participants`)
  const preJoinJson = await preJoinRes.json() as { participants: Participant[] }
  preJoinJson.participants.length === 0
    ? ok('socket after get-router-rtp-capabilities not visible until join-room')
    : fail('mid-handshake member should not appear in participants', preJoinJson.participants)

  // ── Task 4: join-room ─────────────────────────────────────────────────────
  console.log('\n[4] join-room — socket1 as Faysal')

  await new Promise<void>((resolve) => {
    socket2.emit('get-router-rtp-capabilities', ROOM_ID, () => resolve())
  })

  const roomStatePromise = new Promise<Participant[]>((resolve) => {
    socket2.on('room-state', (participants: Participant[]) => resolve(participants))
  })

  const joinResult = await new Promise<{ error?: string }>((resolve) => {
    socket1.emit('join-room', { roomId: ROOM_ID, name: 'Faysal' }, (r: { error?: string }) => resolve(r))
  })
  joinResult.error ? fail('join-room', joinResult.error) : ok('join-room callback ok')

  const afterJoin = await roomStatePromise
  afterJoin.some((p) => p.name === 'Faysal')
    ? ok('room-state broadcast received — Faysal is in the room')
    : fail('Faysal not found in room-state', afterJoin)
  afterJoin[0]?.position.x === 0 && afterJoin[0]?.position.y === 0
    ? ok('starting position is (0, 0)')
    : fail('unexpected starting position', afterJoin[0]?.position)
  afterJoin[0]?.micActive === false
    ? ok('micActive starts as false')
    : fail('micActive should start false')

  // ── Task 4: move ─────────────────────────────────────────────────────────
  console.log('\n[5] move')

  const moveStatePromise = new Promise<Participant[]>((resolve) => {
    socket2.once('room-state', (participants: Participant[]) => resolve(participants))
  })
  socket1.emit('move', { x: 50, y: 30 } satisfies Position)
  const afterMove = await moveStatePromise
  const moved = afterMove.find((p) => p.name === 'Faysal')
  moved?.position.x === 50 && moved?.position.y === 30
    ? ok('position updated to (50, 30)')
    : fail('position not updated', moved?.position)

  // invalid move — outside circle (radius 200)
  const invalidStatePromise = new Promise<Participant[] | 'timeout'>((resolve) => {
    const t = setTimeout(() => resolve('timeout'), 400)
    socket2.once('room-state', (p: Participant[]) => { clearTimeout(t); resolve(p) })
  })
  socket1.emit('move', { x: 9999, y: 9999 } satisfies Position)
  const invalidResult = await invalidStatePromise
  invalidResult === 'timeout'
    ? ok('invalid position (outside circle) correctly ignored — no broadcast')
    : fail('invalid position should have been rejected')

  // ── Task 4: mic-status ────────────────────────────────────────────────────
  console.log('\n[6] mic-status')

  const micStatePromise = new Promise<Participant[]>((resolve) => {
    socket2.once('room-state', (participants: Participant[]) => resolve(participants))
  })
  socket1.emit('mic-status', true)
  const afterMic = await micStatePromise
  afterMic.find((p) => p.name === 'Faysal')?.micActive === true
    ? ok('micActive updated to true')
    : fail('micActive not updated')

  // ── Task 4: leave-room ────────────────────────────────────────────────────
  console.log('\n[7] leave-room')

  const leaveStatePromise = new Promise<Participant[]>((resolve) => {
    socket2.once('room-state', (participants: Participant[]) => resolve(participants))
  })
  socket1.emit('leave-room')
  const afterLeave = await leaveStatePromise
  afterLeave.some((p) => p.name === 'Faysal')
    ? fail('Faysal should have been removed from room-state')
    : ok('Faysal removed from room-state after leave-room')

  // ── HTTP endpoint ─────────────────────────────────────────────────────────
  console.log('\n[8] GET /rooms/:roomId/participants')
  const res = await fetch(`${SERVER}/rooms/${ROOM_ID}/participants`)
  const json = await res.json() as { participants: Participant[] }
  Array.isArray(json.participants)
    ? ok(`endpoint returns array with ${json.participants.length} participant(s)`)
    : fail('unexpected response shape', json)

  // ── Cleanup ───────────────────────────────────────────────────────────────
  socket1.disconnect()
  socket2.disconnect()

  console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error('\n[fatal]', err.message)
  process.exit(1)
})
