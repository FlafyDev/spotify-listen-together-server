import { Socket } from "socket.io"
import ClientInfo from "./clientInfo"
import config from './config'

export default class Player {
  public currentTrackUri = ""
  public isPlaying = false
  public loadingTrack: NodeJS.Timeout | null = null

  constructor(private emitToListeners: (ev: string, ...args: any) => void, private clientsInfo: Map<string, ClientInfo>) {}

  static isTrackValid(trackUri: string) {
    return trackUri.includes("spotify:track:") || trackUri.includes("spotify:episode:")
  }

  isTrackLoaded() {
    return Player.isTrackValid(this.currentTrackUri) && (this.loadingTrack === null)
  }

  updateSong(pause: boolean, milliseconds: number) {
    if (this.isTrackLoaded()) {
      this.isPlaying = pause
      this.emitToListeners("updateSong", this.isPlaying, milliseconds)
      return true
    }
    return false
  }

  changeSong(trackUri: string) {
    if (Player.isTrackValid(trackUri) && (this.loadingTrack === null)) {
      this.currentTrackUri = trackUri
      this.emitToListeners("changeSong", trackUri)
      this.loadingTrack = setTimeout(() => {
        console.log("Timed out for loading track!")
        this.loadingTrack = null
        this.updateSong(false, 0)
      }, config.maxDelay)
    }
  }

  addClientEvents(socket: Socket) {
    const info = this.clientsInfo.get(socket.id)!
    socket.on("requestUpdateSong", (pause: boolean, milliseconds: number) => {
      if (info.isHost) {
        this.updateSong(pause, milliseconds)
      }
    })

    socket.on("requestChangeSong", (trackUri: string) => {
      if (info.isHost) {
        this.changeSong(trackUri)
      }
    })

    socket.on("changedSong", (trackUri: string) => {
      info.currentTrackUri = trackUri
      if (this.loadingTrack !== null && Object.values(this.clientsInfo).every((client: ClientInfo) => client.currentTrackUri === this.currentTrackUri)) {
        clearTimeout(this.loadingTrack)
        this.loadingTrack = null
        setTimeout(() => {
          this.updateSong(false, 0)
        }, 1000)
      } else if (info.isHost) {
        this.changeSong(trackUri)
      }
    })
  }
}