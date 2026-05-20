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
    <div className="relative rounded-md overflow-hidden bg-muted aspect-video w-40">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
      />
      {name && (
        <span className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-1 rounded">
          {name}
        </span>
      )}
    </div>
  )
}
