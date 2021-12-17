import { Server, Socket } from 'socket.io';
import { createServer } from 'http'
import ClientInfo from './clientInfo';
import "dotenv-defaults/config"

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

let changeSongTimeout: NodeJS.Timeout | null;
let currentTrackUri = ""
let clientsInfo = new Map<string, ClientInfo>()

io.on("connection", (socket: Socket) => {
  console.log("Connected!")
  clientsInfo.set(socket.id, new ClientInfo())
  socket.join("listeners")
  
  let lastPing = 0

  socket.conn.on('packet', function (packet) {
    if (packet.type === 'pong') {
      clientsInfo.get(socket.id)!.latency = Math.min((Date.now() - lastPing)/2, MAXDELAY)
    }
  });

  socket.onAny((ev: string, ...args: any) => {
    console.log(`got ${ev}(${clientsInfo.get(socket.id)?.isHost}): ${args}`)
  })
  
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

  socket.on("changedSong", (trackUri: string) => {
    const info = clientsInfo.get(socket.id)!
    // console.log(`changedSong from ${info.isHost ? "Host" : "Client"} from ${info.currentTrackUri} to ${trackUri}`)
    if (info.currentTrackUri === trackUri) return;
    

    info.currentTrackUri = trackUri

    // clientsInfo.forEach((client: ClientInfo) => {
    //   console.log(client.debugString())
    // })

    if (currentTrackUri !== trackUri) {
      socket.emit("changeSongFromHost", currentTrackUri)
      return;
    }
    if (changeSongTimeout != null && Object.values(clientsInfo).every((client: ClientInfo) => client.currentTrackUri === currentTrackUri)) {
      sendPlaySong()
    }
  })

  socket.on("playSong", (trackUri: string) => {
    if (clientsInfo.get(socket.id)?.isHost) {
      currentTrackUri = trackUri
      emitToListeners("changeSongFromHost", currentTrackUri)
      if (changeSongTimeout) clearTimeout(changeSongTimeout)
      changeSongTimeout = setTimeout(sendPlaySong, 8000)
    }
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



  socket.on("getName", () => {
    console.log(clientsInfo.get(socket.id)?.name)
  })

  socket.on("disconnecting", (reason) => {
    console.log("Disconnected: " + clientsInfo.get(socket.id)?.name)
    clientsInfo.delete(socket.id)
  })
})

function sendPlaySong() {
  if (changeSongTimeout) clearTimeout(changeSongTimeout)
  changeSongTimeout = null
  emitToListeners("playSongFromHost", currentTrackUri) 
}

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

io.listen(PORT)