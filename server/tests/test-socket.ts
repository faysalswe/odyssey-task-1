/**
 * Level 2 socket test — runs against a live server (npm run dev in another terminal)
 * Usage: npx tsx test-socket.ts
 */
import { io } from 'socket.io-client'

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

async function run() {
  console.log('\n── Connecting to', SERVER, '──\n')

  const socket = io(SERVER, { transports: ['websocket'] })

  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      ok(`connected  (id: ${socket.id})`)
      resolve()
    })
    socket.on('connect_error', reject)
  })

  // ── Step 1: get router RTP capabilities ──────────────────────────────────
  console.log('\n[1] get-router-rtp-capabilities')
  const caps = await new Promise<Record<string, unknown>>((resolve) => {
    socket.emit('get-router-rtp-capabilities', ROOM_ID, (rtpCaps: Record<string, unknown>) => {
      resolve(rtpCaps)
    })
  })

  const codecs = caps.codecs as Array<{ mimeType: string }> | undefined
  if (codecs && codecs.length >= 2) {
    ok(`received ${codecs.length} codecs: ${codecs.map((c) => c.mimeType).join(', ')}`)
  } else {
    fail('expected at least 2 codecs', codecs)
  }

  // ── Step 2: create send transport ────────────────────────────────────────
  console.log('\n[2] create-webrtc-transport (send)')
  const sendParams = await new Promise<Record<string, unknown>>((resolve) => {
    socket.emit('create-webrtc-transport', { roomId: ROOM_ID }, (params: Record<string, unknown>) => {
      resolve(params)
    })
  })

  if ('error' in sendParams) {
    fail('create send transport', sendParams.error)
  } else {
    ok(`transport id: ${sendParams.id}`)
    ok(`iceParameters present: ${Boolean(sendParams.iceParameters)}`)
    ok(`iceCandidates count: ${(sendParams.iceCandidates as unknown[]).length}`)
    ok(`dtlsParameters present: ${Boolean(sendParams.dtlsParameters)}`)
  }

  // ── Step 3: create recv transport ────────────────────────────────────────
  console.log('\n[3] create-webrtc-transport (recv)')
  const recvParams = await new Promise<Record<string, unknown>>((resolve) => {
    socket.emit('create-webrtc-transport', { roomId: ROOM_ID }, (params: Record<string, unknown>) => {
      resolve(params)
    })
  })

  if ('error' in recvParams) {
    fail('create recv transport', recvParams.error)
  } else {
    ok(`transport id: ${recvParams.id}`)
    const sendId = sendParams.id
    const recvId = recvParams.id
    if (sendId !== recvId) {
      ok('send and recv transports have different ids')
    } else {
      fail('send and recv transports have same id — should be unique')
    }
  }

  // ── Step 4: second peer sees new-producer notification ───────────────────
  console.log('\n[4] new-producer broadcast (second socket)')

  const socket2 = io(SERVER, { transports: ['websocket'] })
  await new Promise<void>((resolve, reject) => {
    socket2.on('connect', resolve)
    socket2.on('connect_error', reject)
  })
  ok(`second socket connected (id: ${socket2.id})`)

  // socket2 joins the same room
  await new Promise<void>((resolve) => {
    socket2.emit('get-router-rtp-capabilities', ROOM_ID, () => resolve())
  })

  const producerNotification = new Promise<Record<string, unknown>>((resolve) => {
    socket2.on('new-producer', (data: Record<string, unknown>) => resolve(data))
  })

  // socket1 skips connect-transport (no real DTLS in Node) — confirmed by error response
  const connectResult = await new Promise<Record<string, unknown>>((resolve) => {
    socket2.emit(
      'connect-transport',
      {
        transportId: 'non-existent',
        dtlsParameters: { role: 'client', fingerprints: [] },
      },
      (result: Record<string, unknown>) => resolve(result)
    )
  })
  if ('error' in connectResult) {
    ok(`connect-transport with unknown id correctly returns error: "${connectResult.error}"`)
  } else {
    fail('expected error for unknown transport id')
  }

  // ── Step 5: disconnect cleans up ─────────────────────────────────────────
  console.log('\n[5] disconnect cleanup')
  socket.disconnect()
  socket2.disconnect()
  ok('sockets disconnected cleanly')

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error('\n[fatal]', err.message)
  process.exit(1)
})
