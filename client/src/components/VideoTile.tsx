import { useEffect, useRef } from 'react'
import { Mic, MicOff } from 'lucide-react'

type Props = {
  stream?: MediaStream | null
  name?: string
  muted?: boolean
  micActive?: boolean
}

export default function VideoTile({ stream, name, muted = false, micActive = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream ?? null
  }, [stream])

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-800 aspect-video w-44 ring-1 ring-border/50 shadow-lg">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-2xl font-semibold text-slate-400 select-none">
            {name ? name[0].toUpperCase() : '?'}
          </span>
        </div>
      )}

      {/* Bottom bar — name + mic status */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-1.5 py-1 bg-slate-900/70 backdrop-blur-sm">
        <span className="text-xs text-slate-200 font-medium truncate">{name ?? 'Unknown'}</span>
        {micActive ? (
          <Mic className="size-3 text-green-400 shrink-0 ml-1" />
        ) : (
          <MicOff className="size-3 text-slate-500 shrink-0 ml-1" />
        )}
      </div>
    </div>
  )
}
