import * as mediasoup from 'mediasoup'
import type { types } from 'mediasoup'

const ANNOUNCED_IP = process.env.ANNOUNCED_IP ?? '127.0.0.1'
const WEBRTC_SERVER_PORT = Number(process.env.WEBRTC_SERVER_PORT ?? 10000)

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

// One WebRtcServer per worker — all transports share a single port
const webRtcServers = new Map<number, types.WebRtcServer>()

export async function createWorker(): Promise<types.Worker> {
  const worker = await mediasoup.createWorker()
  const webRtcServer = await worker.createWebRtcServer({
    listenInfos: [
      { protocol: 'tcp', ip: '::', announcedIp: ANNOUNCED_IP, port: WEBRTC_SERVER_PORT },
    ],
  })
  webRtcServers.set(worker.pid, webRtcServer)
  worker.on('died', (error) => {
    webRtcServers.delete(worker.pid)
    console.error('[mediasoup] worker died:', error)
    process.exit(1)
  })
  return worker
}

export async function createRouter(worker: types.Worker): Promise<types.Router> {
  return worker.createRouter({ mediaCodecs: MEDIA_CODECS })
}

export async function createWebRtcTransport(
  router: types.Router,
  worker: types.Worker
): Promise<types.WebRtcTransport> {
  const webRtcServer = webRtcServers.get(worker.pid)
  if (!webRtcServer) throw new Error('WebRtcServer not found for worker')
  return router.createWebRtcTransport({ webRtcServer })
}
