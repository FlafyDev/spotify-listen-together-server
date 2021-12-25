import express from 'express'
import next from 'next'
import http from 'http'
import { Server } from 'socket.io'
import Backend from './backend'
import path from 'path'

express()

const port = parseInt(process.env.PORT!, 10) || 3000
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = express()
  const httpServer = http.createServer(server);
  const io = new Server(httpServer, {
    cors: {
      origin: '*'
    },
    pingInterval: 1000
  })

  server.use(express.static(path.join(__dirname, '/public')))

  new Backend(io)

  server.all('*', (req, res) => {
    return handle(req, res)
  })

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})