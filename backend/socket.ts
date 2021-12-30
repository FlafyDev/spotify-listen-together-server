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
          this.emitToNonListeners("listeners", this.getListeners().map(info => info.name))
        } else {
          if (badVersion != null)
            badVersion(config.clientVersionRequirements)
            
          setTimeout(() => {
            socket.disconnect()
          }, 3000)
        }
      })

      socket.on("watchingAD", (watcingAD: boolean) => {
        info.watchingAD = watcingAD;
        this.player.checkADs();
      })
    
      socket.on("requestHost", (password: string) => {
        if (password === config.hostPassword) {
          if ([...this.clientsInfo.values()].every((info: ClientInfo) => !info.loggedIn || !info.isHost)) {
            info.isHost = true
            socket.emit("isHost", true)
          } else {
            console.log("There is already an host")
            socket.emit("showMessage", "There is already an host.", true)
          }
        } else {
          info.isHost = false
          socket.emit("isHost", false)
          socket.emit("showMessage", "Incorrect password.", true)
        }
      })
    
      socket.on("cancelHost", () => {
        info.isHost = false
        socket.emit("isHost", false)
      })
    
      socket.on("getListeners", (sendClients: (clients: string[]) => void) => {
        sendClients(this.getListeners().map((info: ClientInfo) => info.name))
      })
    
      socket.on("requestSyncSong", () => {
        this.player?.onRequestSyncSong(info)
      })

      socket.on("requestUpdateSong", (pause: boolean, milliseconds: number) => {
        this.player?.onRequestUpdateSong(info, pause, milliseconds)
      })
  
      socket.on("requestChangeSong", (trackUri: string) => {
        this.player?.onRequestChangeSong(info, trackUri)
      })
  
      socket.on("requestSongInfo", () => {
        this.player?.onRequestSongInfo(info)
      })

      socket.on("changedSong", (trackUri: string, songName?: string, songImage?: string) => {
        this.player?.onClientChangedSong(info, trackUri, songName, songImage)
      })

      socket.on("requestListeners", () => {
        socket.emit("listeners", this.getListeners().map(info => info.name))
      })

      socket.on("disconnecting", (reason) => {
        this.clientsInfo.delete(socket.id)
        this.emitToNonListeners("listeners", this.getListeners().map(info => info.name))
        if (this.getListeners().length === 0) {
          this.player?.onNoListeners()
        }
      })
    })
  }
}