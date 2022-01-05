import { Socket } from "socket.io"
import ClientInfo from "./clientInfo"
import config from '../config'
import SocketServer from "./socket"
import SongInfo from "./web-shared/songInfo"

export default class Player {
  public trackUri = ""
  public paused = true
  public loadingTrack: NodeJS.Timeout | null = null
  public milliseconds = 0
  public locked = false
  public millisecondsLastUpdate = Date.now()
  public songInfo = new SongInfo()
  
  constructor(public socketServer: SocketServer) { }

  static isTrackListenable(trackUri: string) {
    return trackUri.startsWith("spotify:track:") || trackUri.startsWith("spotify:episode:")
  }

  static isTrackAd(trackUri: string) {
    return trackUri.startsWith("spotify:ad:")
  }

  // Returns elapsed duration in milliseconds
  getTrackProgress() {
    return this.paused ? this.milliseconds : this.milliseconds+(Date.now()-this.millisecondsLastUpdate)
  }

  /*
    Commands
  */
  updateSong(pause: boolean, milliseconds: number) {
    if (this.loadingTrack === null && Player.isTrackListenable(this.trackUri)) {
      this.paused = pause
      this.milliseconds = milliseconds
      this.millisecondsLastUpdate = Date.now()
      this.socketServer.emitToListeners("updateSong", this.paused, milliseconds)
      this.updateSongInfo()
      return true
    }
    return false
  }

  changeSong(trackUri: string) {
    if (Player.isTrackListenable(trackUri)) {
      if (this.loadingTrack !== null)
        clearTimeout(this.loadingTrack)
      
      this.milliseconds = 0
      this.trackUri = trackUri
      this.socketServer.emitToListeners("changeSong", trackUri)
      this.loadingTrack = setTimeout(() => {
        console.log("Timed out for loading track!")
        this.trackLoaded()
      }, config.maxDelay)
    }
  }

  /*
    Requests
  */
  requestUpdateSong(info: ClientInfo | undefined, pause: boolean, milliseconds: number) {
    if (info === undefined || info?.isHost) {
      if (this.locked) {
        info?.socket.emit("bottomMessage", "Listen together is currently locked!", true)
      } else {
        this.updateSong(pause, milliseconds)
      }
    }
  }

  /*
    Updates
  */
  listenerChangedSong(info: ClientInfo, newTrackUri: string, songName?: string, songImage?: string) {
    info.trackUri = newTrackUri
    if (info.isHost && info.trackUri !== this.trackUri) {
      if (this.locked) {
        info.socket.emit("bottomMessage", "Listen together is currently locked!", true)
      } else if (info.trackUri !== this.trackUri) {
        this.updateSongInfo(songName, songImage)
        this.changeSong(info.trackUri)
      }
    }
    this.checkListenerHasAD()
    if (!this.locked) {
      if (this.loadingTrack !== null) {
        this.checkTrackLoaded()
      } else {
        this.checkDesynchronizedListeners()
      }
    }
  }

  listenerLoggedIn(info: ClientInfo) {
    this.checkListenerHasAD()
    if (!this.locked) {
      this.checkDesynchronizedListeners()
    }
  }

  listenerLoggedOut() {
    this.checkListenerHasAD()
  }

  /*
    Checks
  */
  checkTrackLoaded() {
    if (this.socketServer.getListeners().every((info) => info.trackUri === this.trackUri))
      this.trackLoaded()
  }

  checkListenerHasAD() {
    this.lock(this.socketServer.getListeners().some((info) => Player.isTrackAd(info.trackUri)))
  }

  checkDesynchronizedListeners() {
    if (this.loadingTrack === null) {
      if (this.socketServer.getListeners().some((info) => info.trackUri !== this.trackUri && !(info.isHost && info.trackUri == "")))
        this.changeSong(this.trackUri)
      // TODO: do the same with track progress
    }
  }

  ///////////

  trackLoaded() {
    if (this.loadingTrack)
      clearTimeout(this.loadingTrack)
    this.loadingTrack = null

    setTimeout(() => {
      this.requestUpdateSong(undefined, false, 0)
    }, 1000)
  }

  lock(lock: boolean) {
    console.log("LOCKING: " + lock)
    if (this.locked != lock) {
      this.locked = lock
      if (this.locked) {
        this.updateSong(true, 0)
      } else {
        this.changeSong(this.socketServer.getHost()?.trackUri || this.trackUri)
      }
    }
  }
  
  onRequestSongInfo(info: ClientInfo) {
    info.socket.emit("songInfo", this.songInfo)
  }

  onNoListeners() {
    this.trackUri = ""
    this.paused = true
    this.milliseconds = 0
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