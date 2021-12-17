import { Server, Socket } from 'socket.io';
import { createServer } from 'http'
import ClientInfo from './clientInfo';
import "dotenv-defaults/config"
import Player from './player';

// track uri example: "spotify:track:5Hyr47BBGpvOfcykSCcaw9"

const HOST_PASSWORD = process.env.HOST_PASSWORD
const MAXDELAY = parseInt(process.env.MAXDELAY!)
const PORT = parseInt(process.env.PORT!)

const io = new Server({
  cors: {
    origin: '*'
  },
  pingInterval: 1000
})
let clientsInfo = new Map<string, ClientInfo>()
const player = new Player(emitToListeners, clientsInfo)

function emitToListeners(ev: string, ...args: any) {
  console.log("sending EVENT: " + ev + "    :    " + args)
  let listeners = io.sockets.adapter.rooms.get("listeners")!
  let maxLatency = 0
  let minLatency = MAXDELAY
  listeners.forEach(socketId => {
    let info = clientsInfo.get(socketId)!
    // console.log(`Latency for ${info.name} is ${info.latency}`)
    maxLatency = Math.max(info.latency, maxLatency)
    minLatency = Math.min(info.latency, minLatency)
  })
  listeners.forEach(socketId => {
    let delay = ((maxLatency - minLatency) - (clientsInfo.get(socketId)!.latency - minLatency))
    // console.log(`Sending to ${socketId} with ${delay} ms delay.`)
    setTimeout(() => {
      io.sockets.sockets.get(socketId)!.emit(ev, ...args) 
    }, delay)
  });
}

io.on("connection", (socket: Socket) => {
  console.log("Connected!")
  let info = new ClientInfo()
  clientsInfo.set(socket.id, info)
  socket.join("listeners")
  
  let lastPing = 0

  player.addClientEvents(socket)

  socket.conn.on('packet', function (packet) {
    if (packet.type === 'pong') {
      info.latency = Math.min((Date.now() - lastPing)/2, MAXDELAY)
    }
  });

  socket.onAny((ev: string, ...args: any) => {
    console.log(`got ${ev}(${info.isHost}): ${args}`)
  })
  
  socket.conn.on('packetCreate', function (packet) {
    if (packet.type === 'ping')
      lastPing = Date.now()
  });

  socket.on("login", (name: string) => {
    info.name = name
    info.loggedIn = true;
    socket.join("listeners")
  })

  socket.on("requestHost", (password: string, callback: (permitted: boolean) => void) => {
    if (info?.isHost || (info !== undefined && password === HOST_PASSWORD)) {
      info.isHost = true
      callback(true)
    } else {
      callback(false)
    }
  })

  socket.on("disconnecting", (reason) => {
    console.log("Disconnected: " + info.name)
    clientsInfo.delete(socket.id)
  })
})

io.listen(PORT)