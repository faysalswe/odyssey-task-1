import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardContent } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import ArenaMap from '@/components/ArenaMap'
import VideoTile from '@/components/VideoTile'
import { useSocket } from '@/hooks/useSocket'
import { useMediasoup } from '@/hooks/useMediasoup'
import { useSpatialAudio } from '@/hooks/useSpatialAudio'
import { clampToCircle, STEP_SIZE, HEARING_RADIUS } from '@/lib/arena'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Mic, MicOff, Camera, CameraOff, Copy, Check } from 'lucide-react'
import type { Position } from '@/types'

export default function App() {
  const socket = useSocket()
  const { participants, localId, joined, join, leave, produceAudio, stopAudio, produceVideo, stopVideo, localVideoStream, emitMove, emitMicStatus, remoteAudioStreams, remoteVideoStreams } = useMediasoup(socket)

  const [roomId, setRoomId] = useState(() => {
    const param = new URLSearchParams(window.location.search).get('room')
    return param ? decodeURIComponent(param) : ''
  })
  const [roomFromUrl] = useState(() => !!new URLSearchParams(window.location.search).get('room'))
  const [name, setName] = useState('')
  const [micOn, setMicOn] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [localPosition, setLocalPosition] = useState<Position>({ x: 0, y: 0 })
  const [copied, setCopied] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const displayParticipants = useMemo(() =>
    participants.map(p => p.id === localId ? { ...p, position: localPosition } : p),
    [participants, localId, localPosition]
  )

  const { initAudio } = useSpatialAudio(remoteAudioStreams, displayParticipants, localId, HEARING_RADIUS)

  async function handleJoin() {
    if (!roomId.trim() || !name.trim()) return
    initAudio()
    setLocalPosition({ x: 0, y: 0 })
    await join(roomId.trim(), name.trim())
  }

  function handleLeave() {
    leave()
    setMicOn(false)
    setCameraOn(false)
    setLocalPosition({ x: 0, y: 0 })
  }

  function handleCopyRoomId() {
    const url = `${window.location.origin}?room=${encodeURIComponent(roomId)}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  async function handleCameraToggle(on: boolean) {
    setCameraOn(on)
    setCameraError(null)
    if (on) {
      try {
        await produceVideo()
      } catch (err) {
        setCameraOn(false)
        const msg = err instanceof DOMException && err.name === 'NotFoundError'
          ? 'Camera not available on this device'
          : 'Could not start camera'
        setCameraError(msg)
        setTimeout(() => setCameraError(null), 4000)
      }
    } else {
      stopVideo()
    }
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

  const dpadBtn = "h-10 w-10 sm:h-9 sm:w-9 bg-accent/40 border border-border/60 text-slate-300 hover:text-foreground hover:bg-accent disabled:opacity-30"

  const mediaToggle = (active: boolean) => cn(
    "h-8 px-3 gap-1.5 text-sm border transition-all duration-150",
    active
      ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 aria-pressed:bg-primary/10 data-[state=on]:bg-primary/10"
      : "border-border/60 text-muted-foreground hover:bg-accent/50 hover:text-foreground aria-pressed:bg-transparent data-[state=on]:bg-transparent"
  )

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">

      {/* Header */}
      <header className="flex items-center px-3 sm:px-5 py-2.5 border-b border-border bg-card/60 backdrop-blur-sm shrink-0">

        {/* Left — app title / room label + copy */}
        {joined ? (
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-muted-foreground">Room</span>
            <span className="text-sm font-semibold font-mono text-foreground">{roomId}</span>
            <button
              type="button"
              onClick={handleCopyRoomId}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-muted-foreground hover:text-foreground bg-accent/30 hover:bg-accent/60 border border-border/50 transition-colors"
              title="Copy room ID"
            >
              {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        ) : (
          <span className="text-sm font-semibold tracking-wide text-foreground/80">Odyssey</span>
        )}

        {/* Right — participant count + leave */}
        {joined && (
          <div className="ml-auto flex items-center gap-3">
            {/* Online count */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>{participants.length} online</span>
            </div>

            <div className="w-px h-5 bg-border/60" />

            <Button
              size="sm"
              variant="outline"
              onClick={handleLeave}
              className="h-7 px-4 text-xs border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-400/60"
            >
              Leave
            </Button>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex flex-1 items-center justify-center p-6 overflow-hidden">
        <div className="flex items-start gap-4">

          {/* Arena column */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-[660px] h-[660px]">
              <CardContent className="w-full h-full p-0">
                {joined
                  ? <ArenaMap participants={displayParticipants} localId={localId} hearingRadius={HEARING_RADIUS} />
                  : (
                    /* Join form centered in arena area */
                    <div className="flex flex-col items-center justify-center w-full h-full gap-4 select-none">
                      <div className="flex flex-col items-center gap-1 mb-2">
                        <span className="text-4xl opacity-15">⬛</span>
                        <p className="text-base font-medium text-foreground/70">Join a room</p>
                        <p className="text-xs text-muted-foreground">Enter a room ID and your name to start</p>
                      </div>
                      <div className="flex flex-col gap-2 w-56">
                        <Input
                          placeholder="Room ID"
                          value={roomId}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoomId(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                          disabled={roomFromUrl}
                          className="h-9 bg-card border-border/60 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                          autoFocus={!roomFromUrl}
                        />
                        <Input
                          placeholder="Your name"
                          value={name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                          className="h-9 bg-card border-border/60 text-sm"
                        />
                        <Button
                          onClick={handleJoin}
                          disabled={!roomId.trim() || !name.trim()}
                          className="h-9 w-full mt-1"
                        >
                          Join room
                        </Button>
                      </div>
                    </div>
                  )
                }
              </CardContent>
            </div>
            {joined && (
              <p className="text-[11px] text-muted-foreground/50 tracking-wide">
                Arrow keys or buttons below to move
              </p>
            )}
          </div>

          {/* Video tiles column — beside arena */}
          {joined && (remoteVideoStreams.size > 0 || localVideoStream) && (
            <div className="flex flex-col gap-2 h-[660px] justify-center">
              {localVideoStream && <VideoTile stream={localVideoStream} name="You" muted />}
              {[...remoteVideoStreams.entries()].map(([socketId, stream]) => {
                const peer = participants.find(p => p.socketId === socketId)
                return <VideoTile key={socketId} stream={stream} name={peer?.name} />
              })}
            </div>
          )}

        </div>
      </main>

      {/* Camera error toast */}
      {cameraError && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-rose-950/90 border border-rose-800/60 text-rose-300 text-xs px-4 py-2 rounded-lg shadow-lg whitespace-nowrap">
          {cameraError}
        </div>
      )}

      {/* Footer */}
      <footer className="flex items-center justify-center gap-5 px-5 py-3 border-t border-border bg-card/60 backdrop-blur-sm shrink-0">

        {/* D-pad */}
        <div className="grid grid-cols-3 gap-0.5">
          <div className="border-0" />
          <Button variant="ghost" size="icon" disabled={!joined} className={dpadBtn} onClick={() => handleMove(0, -STEP_SIZE)}><ChevronUp className="size-4" /></Button>
          <div className="border-0" />
          <Button variant="ghost" size="icon" disabled={!joined} className={dpadBtn} onClick={() => handleMove(-STEP_SIZE, 0)}><ChevronLeft className="size-4" /></Button>
          <Button variant="ghost" size="icon" disabled={!joined} className={dpadBtn} onClick={() => handleMove(0, STEP_SIZE)}><ChevronDown className="size-4" /></Button>
          <Button variant="ghost" size="icon" disabled={!joined} className={dpadBtn} onClick={() => handleMove(STEP_SIZE, 0)}><ChevronRight className="size-4" /></Button>
        </div>

        <div className="w-px h-8 bg-border/60" />

        <Toggle
          pressed={micOn}
          onPressedChange={handleMicToggle}
          disabled={!joined}
          aria-label="Toggle microphone"
          className={mediaToggle(micOn)}
        >
          {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          {micOn ? 'Mic on' : 'Mic off'}
        </Toggle>

        <Toggle
          pressed={cameraOn}
          onPressedChange={handleCameraToggle}
          disabled={!joined}
          aria-label="Toggle camera"
          className={mediaToggle(cameraOn)}
        >
          {cameraOn ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
          {cameraOn ? 'Cam on' : 'Cam off'}
        </Toggle>

      </footer>
    </div>
  )
}
