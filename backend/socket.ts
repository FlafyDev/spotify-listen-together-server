import { Server, Socket } from "socket.io";
import ClientInfo from "./clientInfo";
import config from "../config";
import ClientVersionValidator from './clientVersionValidator';
import Player from "./player";

export default class SocketServer {
  clientsInfo = new Map<string, ClientInfo>()
  private player: Player | undefined
  private clientVersionValidator = new ClientVersionValidator()

  constructor (private io: Server) {}

  getListeners() {
    return [...this.clientsInfo.values()].filter((info: ClientInfo) => info.loggedIn)
  }

  getHost(): ClientInfo | null {
    return [...this.clientsInfo.values()].find((info) => info.isHost) || null
  }

  emitToNonListeners(ev: string, ...args: any) {
    [...this.clientsInfo.values()].filter((info: ClientInfo) => !info.loggedIn).forEach(info => {
      info.socket.emit(ev, ...args)
    })
  }

  emitToListeners(ev: string, ...args: any) {
    let listeners = this.getListeners()
    let maxLatency = 0
    let minLatency = config.maxDelay
    listeners.forEach(info => {
      // console.log(`Latency for ${info.name} is ${info.latency}`)
      maxLatency = Math.max(info.latency, maxLatency)
      minLatency = Math.min(info.latency, minLatency)
    })
    listeners.forEach(info => {
      let delay = ((maxLatency - minLatency) - (info.latency - minLatency))
      // console.log(`Sending to ${socketId} with ${delay} ms delay.`)
      setTimeout(() => {
        info.socket.emit(ev, ...args) 
      }, delay)
    });
  }

  sendListeners(socket?: Socket) {
    if (!socket) 
      socket = <any>this.io

    socket?.emit("listeners", this.getListeners().map(info => {return {
      name: info.name,
      isHost: info.isHost,
      watchingAD: info.trackUri.includes("spotify:ad:")
    }}))
  }

  updateHost(info: ClientInfo, isHost: boolean) {
    info.isHost = isHost
    info.socket.emit("isHost", isHost)
    this.sendListeners()
  }

  addEvents(player: Player) {
    this.player = player
    this.io.on("connection", (socket: Socket) => {
      let lastPing = 0
      let info = new ClientInfo(socket)
      this.clientsInfo.set(socket.id, info)
    
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
        if (this.clientVersionValidator.validate(clientVersion)) {
          info.name = name
          info.loggedIn = true;
          this.player?.listenerLoggedIn(info)
          this.sendListeners()
        } else {
          if (badVersion != null)
            badVersion(config.clientVersionRequirements)
            
          setTimeout(() => {
            socket.disconnect()
          }, 3000)
        }
      })

      socket.on("requestHost", (password: string) => {
        if (password === config.hostPassword) {
          if ([...this.clientsInfo.values()].every((info: ClientInfo) => !info.loggedIn || !info.isHost)) {
            this.updateHost(info, true)
          } else {
            socket.emit("bottomMessage", "There is already an host.")
          }
        } else {
          this.updateHost(info, false)
          socket.emit("bottomMessage", "Incorrect password.", true)
        }
      })
    
      socket.on("cancelHost", () => {
        this.updateHost(info, false)
      })

      socket.on("requestUpdateSong", (pause: boolean, milliseconds: number) => {
        this.player?.requestUpdateSong(info, pause, milliseconds)
      })
  
      socket.on("requestSongInfo", () => {
        this.player?.onRequestSongInfo(info)
      })

      socket.on("loadingSong", (trackUri: string) => {
        this.player?.listenerLoadingSong(info, trackUri)
      })

      socket.on("changedSong", (trackUri: string, songName?: string, songImage?: string) => {
        this.player?.listenerChangedSong(info, trackUri, songName, songImage)
      })

      socket.on("requestListeners", () => {
        this.sendListeners(socket)
      })

      socket.on("requestSong", (trackUri: string, trackName: string) => {
        this.getHost()?.socket.emit("songRequested", trackUri, trackName, info.name)
      })

      socket.on("disconnecting", (reason) => {
        this.clientsInfo.delete(socket.id)
        this.player?.listenerLoggedOut()
        this.sendListeners()
        if (this.getListeners().length === 0) {
          this.player?.onNoListeners()
        }
      })
    })
  }
}