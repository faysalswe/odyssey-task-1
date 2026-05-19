import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = process.env.PORT ?? 3000

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: { origin: '*' },
})

app.use(express.json())

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

// Placeholder — implemented in Task 4
app.get('/rooms/:roomId/participants', (_req, res) => {
  res.status(200).json({ participants: [] })
})

io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`)

  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${socket.id}`)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})
