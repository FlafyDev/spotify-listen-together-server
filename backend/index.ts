import { Server, Socket } from 'socket.io';
import ClientInfo from './clientInfo';
import Player from './player';
import SocketServer from './socket';

// track uri example: "spotify:track:5Hyr47BBGpvOfcykSCcaw9"

export default class Backend {
  socketServer = new SocketServer(this.io);
  player = new Player(this.socketServer)

  constructor (public io: Server) {
    this.socketServer.addEvents(this.player)
  }
}