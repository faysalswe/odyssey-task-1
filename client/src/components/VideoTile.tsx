import { useEffect, useRef } from 'react'

type Props = {
  stream: MediaStream
  name?: string
  muted?: boolean
}

export default function VideoTile({ stream, name, muted = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream])

  return (
    <div className="relative rounded-xl overflow-hidden bg-card aspect-video w-44 ring-1 ring-border/50 shadow-lg">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
      />
      {name && (
        <span className="absolute bottom-1.5 left-1.5 text-xs text-slate-200 bg-slate-900/75 backdrop-blur-sm px-2 py-0.5 rounded-md font-medium">
          {name}
        </span>
      )}
    </div>
  )
}
