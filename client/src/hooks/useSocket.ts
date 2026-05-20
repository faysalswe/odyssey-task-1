import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@/types'

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

const SERVER_URL = import.meta.env.VITE_SERVER_URL as string

export function useSocket(): AppSocket {
  const ref = useRef<AppSocket | null>(null)
  if (!ref.current) {
    ref.current = io(SERVER_URL) as AppSocket
  }
  useEffect(() => {
    return () => {
      ref.current?.disconnect()
      ref.current = null
    }
  }, [])
  return ref.current
}
