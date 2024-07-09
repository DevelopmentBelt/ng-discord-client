import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ChannelSocketService {
  private io: WebSocket;
  private connected: boolean = false;
  constructor() {
    this.io = new WebSocket('ws://localhost:8080/channel');
    this.io.onopen = () => {
      this.connected = true;
    }
  }
  sendMessage(message: any) {
    this.io.send(message);
  }
}
