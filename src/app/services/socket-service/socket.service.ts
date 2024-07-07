import { Injectable } from '@angular/core';
import {Socket} from "ngx-socket-io";

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private io: Socket;
  constructor() {
    this.io = new Socket({url: 'ws://localhost:8080', options: {
      transports: ['websocket']
      }});
  }
  connect() {
    this.io.connect((err) => {
      console.log(err);
    });
  }
  sendMessage(message: any) {
    this.io.emit('message', message);
  }
}
