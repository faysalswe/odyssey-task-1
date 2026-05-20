import { useEffect, useRef } from 'react'
import { calculateGain } from '@/lib/audio'
import type { Participant } from '@/types'

type AudioNodes = { source: MediaStreamAudioSourceNode; gain: GainNode }

export function useSpatialAudio(
  remoteStreams: Map<string, MediaStream>,
  participants: Participant[],
  localId: string,
  hearingRadius: number
): void {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef(new Map<string, AudioNodes>())

  useEffect(() => {
    if (remoteStreams.size === 0) return

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') void ctx.resume()

    // Add nodes for new streams
    for (const [socketId, stream] of remoteStreams) {
      if (nodesRef.current.has(socketId)) continue
      const source = ctx.createMediaStreamSource(stream)
      const gain = ctx.createGain()
      source.connect(gain)
      gain.connect(ctx.destination)
      nodesRef.current.set(socketId, { source, gain })
    }

    // Remove nodes for streams that are gone
    for (const [socketId, nodes] of nodesRef.current) {
      if (remoteStreams.has(socketId)) continue
      nodes.source.disconnect()
      nodes.gain.disconnect()
      nodesRef.current.delete(socketId)
    }

    // Update gains based on current positions
    const local = participants.find(p => p.id === localId)
    if (!local) return

    for (const [socketId, nodes] of nodesRef.current) {
      const remote = participants.find(p => p.socketId === socketId)
      if (!remote) { nodes.gain.gain.value = 0; continue }
      const dx = remote.position.x - local.position.x
      const dy = remote.position.y - local.position.y
      nodes.gain.gain.value = calculateGain(Math.sqrt(dx * dx + dy * dy), hearingRadius)
    }
  }, [remoteStreams, participants, localId, hearingRadius])

  // Re-run gain calculation on every position update (no stream changes)
  useEffect(() => {
    if (!audioCtxRef.current) return
    const local = participants.find(p => p.id === localId)
    if (!local) return

    for (const [socketId, nodes] of nodesRef.current) {
      const remote = participants.find(p => p.socketId === socketId)
      if (!remote) { nodes.gain.gain.value = 0; continue }
      const dx = remote.position.x - local.position.x
      const dy = remote.position.y - local.position.y
      nodes.gain.gain.value = calculateGain(Math.sqrt(dx * dx + dy * dy), hearingRadius)
    }
  }, [participants, localId, hearingRadius])

  useEffect(() => {
    return () => { audioCtxRef.current?.close() }
  }, [])
}
