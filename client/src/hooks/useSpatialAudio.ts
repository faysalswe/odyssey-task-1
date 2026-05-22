import { useEffect, useRef, useCallback } from 'react'
import { calculateGain } from '@/lib/audio'
import type { Participant } from '@/types'

export function useSpatialAudio(
  remoteStreams: Map<string, MediaStream>,
  participants: Participant[],
  localId: string,
  hearingRadius: number
): { initAudio: () => void } {
  const audioElemsRef = useRef(new Map<string, HTMLAudioElement>())

  const initAudio = useCallback(() => {}, [])

  useEffect(() => {
    for (const [socketId, stream] of remoteStreams) {
      const existing = audioElemsRef.current.get(socketId)
      if (existing?.srcObject === stream) continue
      if (existing) { existing.pause(); existing.srcObject = null }
      const el = new Audio()
      el.srcObject = stream
      el.autoplay = true
      void el.play()
      audioElemsRef.current.set(socketId, el)
    }

    for (const [socketId, el] of audioElemsRef.current) {
      if (remoteStreams.has(socketId)) continue
      el.pause()
      el.srcObject = null
      audioElemsRef.current.delete(socketId)
    }

    const local = participants.find(p => p.id === localId)
    if (!local) return

    for (const [socketId, el] of audioElemsRef.current) {
      const remote = participants.find(p => p.socketId === socketId)
      if (!remote) continue
      const dx = remote.position.x - local.position.x
      const dy = remote.position.y - local.position.y
      el.volume = calculateGain(Math.sqrt(dx * dx + dy * dy), hearingRadius)
    }
  }, [remoteStreams, participants, localId, hearingRadius])

  useEffect(() => {
    return () => {
      for (const el of audioElemsRef.current.values()) {
        el.pause()
        el.srcObject = null
      }
      audioElemsRef.current.clear()
    }
  }, [])

  return { initAudio }
}
