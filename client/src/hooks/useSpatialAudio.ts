import { useEffect, useRef, useCallback } from 'react'
import { calculateGain } from '@/lib/audio'
import type { Participant } from '@/types'

type AudioNodes = { source: MediaStreamAudioSourceNode; gain: GainNode; stream: MediaStream }

export function useSpatialAudio(
  remoteStreams: Map<string, MediaStream>,
  participants: Participant[],
  localId: string,
  hearingRadius: number
): { initAudio: () => void } {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef(new Map<string, AudioNodes>())

  // Call this from a user-gesture handler (e.g. Join click) so Chrome allows playback
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    void audioCtxRef.current.resume()
  }, [])

  useEffect(() => {
    if (remoteStreams.size === 0) return

    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    const ctx = audioCtxRef.current
    void ctx.resume()

    // Add nodes for new streams; replace if stream object changed (e.g. producer restarted)
    for (const [socketId, stream] of remoteStreams) {
      const existing = nodesRef.current.get(socketId)
      if (existing?.stream === stream) continue
      if (existing) {
        existing.source.disconnect()
        existing.gain.disconnect()
        nodesRef.current.delete(socketId)
      }
      const source = ctx.createMediaStreamSource(stream)
      const gain = ctx.createGain()
      source.connect(gain)
      gain.connect(ctx.destination)
      nodesRef.current.set(socketId, { source, gain, stream })
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

  useEffect(() => {
    return () => { audioCtxRef.current?.close() }
  }, [])

  return { initAudio }
}
