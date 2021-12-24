import { Socket } from "socket.io"
import ClientInfo from "./clientInfo"
import config from '../config'
import SocketServer from "./socket"
import SongInfo from "./web-shared/songInfo"

export default class Player {
  public currentTrackUri = ""
  public paused = true
  public loadingTrack: NodeJS.Timeout | null = null
  public songInfo = new SongInfo()
  
  constructor(public socketServer: SocketServer) {}

  static isTrackValid(trackUri: string) {
    return trackUri.includes("spotify:track:") || trackUri.includes("spotify:episode:")
  }

  isTrackLoaded() {
    return Player.isTrackValid(this.currentTrackUri) && (this.loadingTrack === null)
  }

  updateSong(pause: boolean, milliseconds: number) {
    if (this.isTrackLoaded()) {
      this.paused = pause
      this.socketServer.emitToListeners("updateSong", this.paused, milliseconds)
      this.updateSongInfo()
      return true
    }
    return false
  }

  changeSong(trackUri: string) {
    if (Player.isTrackValid(trackUri) && (this.loadingTrack === null)) {
      this.currentTrackUri = trackUri
      this.socketServer.emitToListeners("changeSong", trackUri)
      this.loadingTrack = setTimeout(() => {
        console.log("Timed out for loading track!")
        this.loadingTrack = null
        this.updateSong(false, 0)
      }, config.maxDelay)
    }
  }

  onRequestUpdateSong(info: ClientInfo, pause: boolean, milliseconds: number) {
    if (info.isHost) {
      this.updateSong(pause, milliseconds)
    }
  }

  onRequestChangeSong(info: ClientInfo, trackUri: string) {
    if (info.isHost) {
      this.changeSong(trackUri)
    }
  }

  onClientChangedSong(info: ClientInfo, newTrackUri: string, songName?: string, songImage?: string) {
    info.currentTrackUri = newTrackUri
    if (this.loadingTrack !== null && [...this.socketServer.clientsInfo.values()].every((client: ClientInfo) => !client.loggedIn || client.currentTrackUri === this.currentTrackUri)) {
      clearTimeout(this.loadingTrack)
      this.loadingTrack = null
      setTimeout(() => {
        this.updateSong(false, 0)
      }, 1000)
    } else if (info.isHost) {
      this.updateSongInfo(songName, songImage)
      this.changeSong(newTrackUri)
    }
  }

  onRequestSongInfo(info: ClientInfo) {
    info.socket.emit("songInfo", this.songInfo)
  }

  onNoListeners() {
    this.currentTrackUri = ""
    this.paused = true
    this.updateSongInfo("", "")
  }
  
  updateSongInfo(newName?: string, newImage?: string) {
    if (newName != undefined)
      this.songInfo.name = newName

    if (newImage != undefined)
      if ((newImage.match(/:/g) || []).length === 2)
        this.songInfo.image = "https://i.scdn.co/image/" + newImage.split(":")[2]
      else
        this.songInfo.image = ""

    this.songInfo.paused = this.paused
    this.socketServer.emitToNonListeners("songInfo", this.songInfo)
  }
}