export default class ClientInfo {
  public latency = 0
  public name = "Unnamed"
  public isHost = false
  public loggedIn = false
  public currentTrackUri = ""

  debugString() {
    return `${this.name}: Host=${this.isHost} Track=${this.currentTrackUri}`
  }
}