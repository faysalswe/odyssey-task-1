import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'

export default function App() {
  const [roomId, setRoomId] = useState('')
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)

  function handleJoin() {
    if (!roomId.trim() || !name.trim()) return
    setJoined(true)
  }

  function handleLeave() {
    setJoined(false)
    setMicOn(false)
    setCameraOn(false)
  }

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
        <Card className="w-[480px] h-[480px] flex items-center justify-center">
          <CardContent className="flex items-center justify-center w-full h-full">
            <span className="text-muted-foreground text-sm">
              {joined
                ? `${name} in "${roomId}" — arena map coming soon`
                : 'Join a room to see the arena'}
            </span>
          </CardContent>
        </Card>
      </main>

      {/* Footer — controls */}
      <footer className="flex items-center justify-center gap-3 px-4 py-3 border-t border-border">
        <div className="grid grid-cols-3 gap-1">
          <div />
          <Button variant="outline" size="icon" disabled={!joined}>▲</Button>
          <div />
          <Button variant="outline" size="icon" disabled={!joined}>◄</Button>
          <Button variant="outline" size="icon" disabled={!joined}>▼</Button>
          <Button variant="outline" size="icon" disabled={!joined}>►</Button>
        </div>

        <div className="w-px h-10 bg-border mx-2" />

        <Toggle
          pressed={micOn}
          onPressedChange={setMicOn}
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
