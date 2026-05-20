import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import ArenaMap from '@/components/ArenaMap'
import { useSocket } from '@/hooks/useSocket'
import { useMediasoup } from '@/hooks/useMediasoup'
import { useSpatialAudio } from '@/hooks/useSpatialAudio'
import { clampToCircle, STEP_SIZE, HEARING_RADIUS } from '@/lib/arena'
import type { Position } from '@/types'

export default function App() {
  const socket = useSocket()
  const { participants, localId, joined, join, leave, produceAudio, stopAudio, emitMove, emitMicStatus, remoteStreams } = useMediasoup(socket)

  const [roomId, setRoomId] = useState('')
  const [name, setName] = useState('')
  const [micOn, setMicOn] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [localPosition, setLocalPosition] = useState<Position>({ x: 0, y: 0 })

  // Optimistic position override for the local participant
  const displayParticipants = useMemo(() =>
    participants.map(p => p.id === localId ? { ...p, position: localPosition } : p),
    [participants, localId, localPosition]
  )

  useSpatialAudio(remoteStreams, displayParticipants, localId, HEARING_RADIUS)

  async function handleJoin() {
    if (!roomId.trim() || !name.trim()) return
    setLocalPosition({ x: 0, y: 0 })
    await join(roomId.trim(), name.trim())
  }

  function handleLeave() {
    leave()
    setMicOn(false)
    setCameraOn(false)
    setLocalPosition({ x: 0, y: 0 })
  }

  const handleMove = useCallback((dx: number, dy: number) => {
    setLocalPosition(prev => {
      const next = clampToCircle(prev, dx, dy)
      emitMove(next)
      return next
    })
  }, [emitMove])

  async function handleMicToggle(on: boolean) {
    setMicOn(on)
    emitMicStatus(on)
    if (on) await produceAudio()
    else stopAudio()
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!joined) return
      const moves: Record<string, [number, number]> = {
        ArrowUp:    [0, -STEP_SIZE],
        ArrowDown:  [0,  STEP_SIZE],
        ArrowLeft:  [-STEP_SIZE, 0],
        ArrowRight: [ STEP_SIZE, 0],
      }
      const delta = moves[e.key]
      if (!delta) return
      e.preventDefault()
      handleMove(delta[0], delta[1])
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [joined, handleMove])

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">

      {/* Header */}
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Input
          placeholder="Room ID"
          value={roomId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoomId(e.target.value)}
          disabled={joined}
          className="w-36"
        />
        <Input
          placeholder="Your name"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          disabled={joined}
          className="w-36"
        />
        <Button onClick={handleJoin} disabled={joined || !roomId.trim() || !name.trim()}>
          Join
        </Button>
        <Button variant="outline" onClick={handleLeave} disabled={!joined}>
          Leave
        </Button>
      </header>

      {/* Main — arena map */}
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-[480px] h-[480px]">
          <CardContent className="w-full h-full p-4">
            {joined
              ? <ArenaMap participants={displayParticipants} localId={localId} hearingRadius={HEARING_RADIUS} />
              : <div className="flex items-center justify-center w-full h-full text-muted-foreground text-sm">Join a room to see the arena</div>
            }
          </CardContent>
        </Card>
      </main>

      {/* Footer — controls */}
      <footer className="flex items-center justify-center gap-3 px-4 py-3 border-t border-border">
        <div className="grid grid-cols-3 gap-1">
          <div />
          <Button variant="outline" size="icon" disabled={!joined} onClick={() => handleMove(0, -STEP_SIZE)}>▲</Button>
          <div />
          <Button variant="outline" size="icon" disabled={!joined} onClick={() => handleMove(-STEP_SIZE, 0)}>◄</Button>
          <Button variant="outline" size="icon" disabled={!joined} onClick={() => handleMove(0, STEP_SIZE)}>▼</Button>
          <Button variant="outline" size="icon" disabled={!joined} onClick={() => handleMove(STEP_SIZE, 0)}>►</Button>
        </div>

        <div className="w-px h-10 bg-border mx-2" />

        <Toggle
          pressed={micOn}
          onPressedChange={handleMicToggle}
          disabled={!joined}
          aria-label="Toggle microphone"
          variant="outline"
          className="w-20"
        >
          {micOn ? '🎙️ On' : '🎙️ Off'}
        </Toggle>

        <Toggle
          pressed={cameraOn}
          onPressedChange={setCameraOn}
          disabled={!joined}
          aria-label="Toggle camera"
          variant="outline"
          className="w-20"
        >
          {cameraOn ? '📷 On' : '📷 Off'}
        </Toggle>
      </footer>

    </div>
  )
}
