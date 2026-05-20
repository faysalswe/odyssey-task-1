import * as mediasoup from 'mediasoup'
import type { types } from 'mediasoup'

const ANNOUNCED_IP = process.env.ANNOUNCED_IP ?? '127.0.0.1'
const MIN_PORT = Number(process.env.MEDIASOUP_MIN_PORT ?? 10000)
const MAX_PORT = Number(process.env.MEDIASOUP_MAX_PORT ?? 10100)

const MEDIA_CODECS: types.RtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    preferredPayloadType: 111,
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    preferredPayloadType: 96,
    clockRate: 90000,
    parameters: { 'x-google-start-bitrate': 1000 },
  },
]

export async function createWorker(): Promise<types.Worker> {
  const worker = await mediasoup.createWorker({
    rtcMinPort: MIN_PORT,
    rtcMaxPort: MAX_PORT,
  })
  worker.on('died', (error) => {
    console.error('[mediasoup] worker died:', error)
    process.exit(1)
  })
  return worker
}

export async function createRouter(worker: types.Worker): Promise<types.Router> {
  return worker.createRouter({ mediaCodecs: MEDIA_CODECS })
}

export async function createWebRtcTransport(
  router: types.Router
): Promise<types.WebRtcTransport> {
  return router.createWebRtcTransport({
    listenIps: [{ ip: '0.0.0.0', announcedIp: ANNOUNCED_IP }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  })
}
