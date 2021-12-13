import { Server, Socket } from 'socket.io';
import { createServer } from 'http'
import ClientInfo from './clientInfo';
import "dotenv-defaults/config"

// track uri example: "spotify:track:5Hyr47BBGpvOfcykSCcaw9"

const HOST_PASSWORD = process.env.HOST_PASSWORD
const MAXDELAY = parseInt(process.env.MAXDELAY!)

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  },
  pingInterval: 1000
})

let clientsInfo = new Map<string, ClientInfo>()

io.on("connection", (socket: Socket) => {
  console.log("Connected!")
  clientsInfo.set(socket.id, new ClientInfo())
  
  let lastPing = 0

  socket.conn.on('packet', function (packet) {
    if (packet.type === 'pong') {
      clientsInfo.get(socket.id)!.latency = Math.min((Date.now() - lastPing)/2, MAXDELAY)
    }
  });
  
  socket.conn.on('packetCreate', function (packet) {
    if (packet.type === 'ping')
      lastPing = Date.now()
  });

  socket.on("login", (name: string) => {
    clientsInfo.get(socket.id)!.name = name
    socket.join("listeners")
  })

  socket.on("requestHost", (password: string, callback: (permitted: boolean) => void) => {
    let info = clientsInfo.get(socket.id)
    if (info?.isHost || (info !== undefined && password === HOST_PASSWORD)) {
      info.isHost = true
      callback(true)
    } else {
      callback(false)
    }
  })

  socket.on("playSong", (trackUri: string) => {
    if (clientsInfo.get(socket.id)?.isHost)
      emitToListeners("playSongFromHost", trackUri) 
  })

  socket.on("stopSong", (trackUri: string) => {
    if (clientsInfo.get(socket.id)?.isHost)
      emitToListeners("stopSongFromHost", trackUri) 
  })

  socket.on("continueSong", (trackUri: string, position: number) => {
    if (clientsInfo.get(socket.id)?.isHost) {
      emitToListeners("continueSongFromHost", trackUri, position)
    }
  })

  function emitToListeners(ev: string, ...args: any) {
    let listeners = io.sockets.adapter.rooms.get("listeners")!
    let maxLatency = 0
    let minLatency = MAXDELAY
    listeners.forEach(socketId => {
      let info = clientsInfo.get(socketId)!
      maxLatency = Math.max(info.latency, maxLatency)
      minLatency = Math.min(info.latency, minLatency)
    })
    listeners.forEach(socketId => {
      let delay = ((maxLatency - minLatency) - (clientsInfo.get(socketId)!.latency - minLatency))
      console.log(`Sending to ${socketId} with ${delay} ms delay.`)
      setTimeout(() => {
        io.sockets.sockets.get(socketId)!.emit(ev, ...args) 
      }, delay)
    });
  }

  socket.on("getName", () => {
    console.log(clientsInfo.get(socket.id)?.name)
  })

  socket.on("disconnecting", (reason) => {
    console.log("Disconnected: " + clientsInfo.get(socket.id)?.name)
    clientsInfo.delete(socket.id)
  })
})

httpServer.listen(parseInt(process.env.PORT!))
console.log("Server is running.")