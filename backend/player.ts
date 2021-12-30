import { Socket } from "socket.io"
import ClientInfo from "./clientInfo"
import config from '../config'
import SocketServer from "./socket"
import SongInfo from "./web-shared/songInfo"

export default class Player {
  public currentTrackUri = ""
  public paused = true
  public loadingTrack: NodeJS.Timeout | null = null
  public milliseconds = 0
  public locked = false
  public millisecondsLastUpdate = Date.now()
  public songInfo = new SongInfo()
  
  constructor(public socketServer: SocketServer) { }

  static isTrackValid(trackUri: string) {
    return trackUri.includes("spotify:track:") || trackUri.includes("spotify:episode:")
  }

  isTrackLoaded() {
    return Player.isTrackValid(this.currentTrackUri) && (this.loadingTrack === null)
  }

  getSongTime() {
    return this.paused ? this.milliseconds : this.milliseconds+(Date.now()-this.millisecondsLastUpdate)
  }

  updateSong(pause: boolean, milliseconds: number, force?: boolean) {
    if ((this.isTrackLoaded() && !this.locked) || force) {
      this.paused = pause
      this.milliseconds = milliseconds
      this.millisecondsLastUpdate = Date.now()
      this.socketServer.emitToListeners("updateSong", this.paused, milliseconds)
      this.updateSongInfo()
      return true
    }
    return false
  }

  checkADs() {
    this.lock(this.socketServer.getListeners().some(info => info.watchingAD))
  }

  lock(lock: boolean) {
    console.log("LOCKING: " + lock)
    if (this.locked != lock) {
      if (lock) {
        this.updateSong(true, 0, true)
        this.locked = lock
      } else {
        this.locked = lock
        this.changeSong(this.currentTrackUri)
      }
    }
  }

  changeSong(trackUri: string) {
    if (Player.isTrackValid(trackUri) && !this.locked) {
      this.milliseconds = 0
      this.currentTrackUri = trackUri
      this.socketServer.emitToListeners("changeSong", trackUri)
      clearTimeout(this.loadingTrack)
      this.loadingTrack = null
      this.loadingTrack = setTimeout(() => {
        console.log("Timed out for loading track!")
        this.loadingTrack = null
        this.updateSong(false, 0)
      }, config.maxDelay)
    }
  }

  onRequestSyncSong(info: ClientInfo) {
    if (Player.isTrackValid(this.currentTrackUri))
      info.socket.emit("syncSong", this.currentTrackUri, this.paused, this.getSongTime())
  }

  onRequestUpdateSong(info: ClientInfo, pause: boolean, milliseconds: number) {
    if (info.isHost) {
      if (this.locked) {
        info.socket.emit("showMessage", "Listen together is currently locked!", true)
      } else {
        this.updateSong(pause, milliseconds)
      }
    }
  }

  onRequestChangeSong(info: ClientInfo, trackUri: string) {
    if (info.isHost) {
      if (this.locked) {
        info.socket.emit("showMessage", "Listen together is currently locked!", true)
      } else {
        this.changeSong(trackUri)
      }
    }
  }

  onClientChangedSong(info: ClientInfo, newTrackUri: string, songName?: string, songImage?: string) {
    let changed = info.currentTrackUri != newTrackUri
    info.currentTrackUri = newTrackUri
    if (info.isHost && changed) {
      this.updateSongInfo(songName, songImage)
      this.changeSong(newTrackUri)
    }
    else if (this.loadingTrack !== null && [...this.socketServer.clientsInfo.values()].every((client: ClientInfo) => !client.loggedIn || client.currentTrackUri === this.currentTrackUri)) {
      clearTimeout(this.loadingTrack)
      this.loadingTrack = null
      setTimeout(() => {
        this.updateSong(false, 0)
      }, 1000)
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