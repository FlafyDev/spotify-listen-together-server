import { Server, Socket } from 'socket.io';
import ClientInfo from './clientInfo';
import Player from './player';
import config from './config'
import ClientVersionValidator from './clientVersionValidator';
// track uri example: "spotify:track:5Hyr47BBGpvOfcykSCcaw9"

const io = new Server({
  cors: {
    origin: '*'
  },
  pingInterval: 1000
})
let clientsInfo = new Map<string, ClientInfo>()
const player = new Player(emitToListeners, clientsInfo)
const clientVersionValidator = new ClientVersionValidator()

function emitToListeners(ev: string, ...args: any) {
  console.log(`Sending ${ev}: ${args}`)
  let listeners = io.sockets.adapter.rooms.get("listeners")!
  let maxLatency = 0
  let minLatency = config.maxDelay
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
      info.latency = Math.min((Date.now() - lastPing)/2, config.maxDelay)
    }
  });

  socket.onAny((ev: string, ...args: any) => {
    console.log(`Receiving ${ev}(host=${info.isHost}): ${args}`)
  })
  
  socket.conn.on('packetCreate', function (packet) {
    if (packet.type === 'ping')
      lastPing = Date.now()
  });

  socket.on("login", (name: string, clientVersion?: string, badVersion?: (requirements: string) => void) => {
    if (clientVersionValidator.validate(clientVersion)) {
      info.name = name
      info.loggedIn = true;
      socket.join("listeners")
    } else {
      if (badVersion != null)
        badVersion(clientVersionValidator.requirements)
        
      setTimeout(() => {
        socket.disconnect()
      }, 3000)
    }
  })

  socket.on("requestHost", (password: string, callback: (permitted: boolean) => void) => {
    if (info?.isHost || (info !== undefined && password === config.hostPassword)) {
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

io.listen(config.port)