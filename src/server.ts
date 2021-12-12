import { Server, Socket } from 'socket.io';
import { createServer } from 'http'
import ClientInfo from './clientInfo';
import "dotenv-defaults/config"

// track uri example: "spotify:track:5Hyr47BBGpvOfcykSCcaw9"

const HOST_PASSWORD = process.env.HOST_PASSWORD
const DELAY = parseInt(process.env.DELAY!)

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
})

let clientsInfo = new Map<string, ClientInfo>()

io.on("connection", (socket: Socket) => {
  console.log("Connected!")

  socket.on("login", (name: string) => {
    clientsInfo.set(socket.id, new ClientInfo(name))
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
    {
      io.to("listeners").emit("playSongFromHost", trackUri, Date.now()+DELAY) 
    }
  })

  socket.on("stopSong", (trackUri: string) => {
    if (clientsInfo.get(socket.id)?.isHost)
    {
      io.to("listeners").emit("stopSongFromHost", trackUri) 
    }
  })

  socket.on("continueSong", (trackUri: string, position: number) => {
    if (clientsInfo.get(socket.id)?.isHost)
    {
      io.to("listeners").emit("continueSongFromHost", trackUri, position, Date.now()+DELAY) 
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

httpServer.listen(parseInt(process.env.PORT!))
console.log("Server is running.")