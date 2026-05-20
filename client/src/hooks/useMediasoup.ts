import { useState, useEffect, useRef, useCallback } from 'react'
import { Device } from 'mediasoup-client'
import type { types } from 'mediasoup-client'
import type { AppSocket } from './useSocket'
import type { Participant, ConsumerParams, WebRtcTransportParams, Position } from '@/types'

export function useMediasoup(socket: AppSocket) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [localId, setLocalId] = useState('')
  const [joined, setJoined] = useState(false)
  const [remoteStreams, setRemoteStreams] = useState(new Map<string, MediaStream>())

  const roomIdRef = useRef('')
  const deviceRef = useRef<Device | null>(null)
  const sendTransportRef = useRef<types.Transport | null>(null)
  const recvTransportRef = useRef<types.Transport | null>(null)
  const audioProducerRef = useRef<types.Producer | null>(null)
  const consumersRef = useRef(new Map<string, types.Consumer>())
  const remoteStreamsRef = useRef(new Map<string, MediaStream>())

  useEffect(() => {
    function onRoomState(ps: Participant[]) {
      setParticipants(ps)
      const me = ps.find(p => p.socketId === socket.id)
      if (me) setLocalId(me.id)
    }
    socket.on('room-state', onRoomState)
    return () => { socket.off('room-state', onRoomState) }
  }, [socket])

  useEffect(() => {
    async function onNewProducer({ producerId, socketId }: { producerId: string; socketId: string; kind: types.MediaKind }) {
      if (!recvTransportRef.current || !deviceRef.current || !roomIdRef.current) return
      try {
        const result = await new Promise<ConsumerParams | { error: string }>((resolve) => {
          socket.emit('consume', {
            roomId: roomIdRef.current,
            transportId: recvTransportRef.current!.id,
            producerId,
            rtpCapabilities: deviceRef.current!.rtpCapabilities,
          }, resolve)
        })
        if ('error' in result) { console.error('[consume]', result.error); return }

        const consumer = await recvTransportRef.current.consume(result)
        consumersRef.current.set(consumer.id, consumer)
        const stream = new MediaStream([consumer.track])
        remoteStreamsRef.current = new Map(remoteStreamsRef.current).set(socketId, stream)
        setRemoteStreams(new Map(remoteStreamsRef.current))
      } catch (err) {
        console.error('[new-producer]', err)
      }
    }
    socket.on('new-producer', onNewProducer)
    return () => { socket.off('new-producer', onNewProducer) }
  }, [socket])

  const join = useCallback(async (roomId: string, name: string) => {
    try {
      roomIdRef.current = roomId

      const rtpCapabilities = await new Promise<types.RtpCapabilities>((resolve) => {
        socket.emit('get-router-rtp-capabilities', roomId, resolve)
      })

      const device = new Device()
      await device.load({ routerRtpCapabilities: rtpCapabilities })
      deviceRef.current = device

      const sendParams = await new Promise<WebRtcTransportParams | { error: string }>((resolve) => {
        socket.emit('create-webrtc-transport', { roomId }, resolve)
      })
      if ('error' in sendParams) throw new Error(sendParams.error)

      const sendTransport = device.createSendTransport(sendParams)
      sendTransportRef.current = sendTransport
      sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit('connect-transport', { transportId: sendTransport.id, dtlsParameters }, (res) => {
          res.error ? errback(new Error(res.error)) : callback()
        })
      })
      sendTransport.on('produce', ({ kind, rtpParameters }, callback, errback) => {
        socket.emit('produce', { transportId: sendTransport.id, kind, rtpParameters }, (res) => {
          'error' in res ? errback(new Error(res.error)) : callback({ id: res.id })
        })
      })

      const recvParams = await new Promise<WebRtcTransportParams | { error: string }>((resolve) => {
        socket.emit('create-webrtc-transport', { roomId }, resolve)
      })
      if ('error' in recvParams) throw new Error(recvParams.error)

      const recvTransport = device.createRecvTransport(recvParams)
      recvTransportRef.current = recvTransport
      recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit('connect-transport', { transportId: recvTransport.id, dtlsParameters }, (res) => {
          res.error ? errback(new Error(res.error)) : callback()
        })
      })

      await new Promise<void>((resolve, reject) => {
        socket.emit('join-room', { roomId, name }, (res) => {
          res.error ? reject(new Error(res.error)) : resolve()
        })
      })

      setJoined(true)
    } catch (err) {
      console.error('[join]', err)
    }
  }, [socket])

  const leave = useCallback(() => {
    socket.emit('leave-room')
    audioProducerRef.current?.close()
    consumersRef.current.forEach(c => c.close())
    consumersRef.current.clear()
    sendTransportRef.current?.close()
    recvTransportRef.current?.close()
    remoteStreamsRef.current.clear()
    deviceRef.current = null
    sendTransportRef.current = null
    recvTransportRef.current = null
    audioProducerRef.current = null
    roomIdRef.current = ''
    setParticipants([])
    setLocalId('')
    setJoined(false)
    setRemoteStreams(new Map())
  }, [socket])

  const produceAudio = useCallback(async (): Promise<MediaStream | null> => {
    if (!sendTransportRef.current) return null
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const track = stream.getAudioTracks()[0]
      const producer = await sendTransportRef.current.produce({ track })
      audioProducerRef.current = producer
      return stream
    } catch (err) {
      console.error('[produce-audio]', err)
      return null
    }
  }, [])

  const stopAudio = useCallback(() => {
    audioProducerRef.current?.close()
    audioProducerRef.current = null
  }, [])

  const emitMove = useCallback((position: Position) => {
    socket.emit('move', position)
  }, [socket])

  const emitMicStatus = useCallback((micActive: boolean) => {
    socket.emit('mic-status', micActive)
  }, [socket])

  return { participants, localId, joined, join, leave, produceAudio, stopAudio, emitMove, emitMicStatus, remoteStreams }
}
