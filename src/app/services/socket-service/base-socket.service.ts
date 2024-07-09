import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BaseSocketService {
  private io: WebSocket;
  private connected: boolean = false;
  constructor() {
    this.io = new WebSocket('ws://localhost:8080/base');
    this.io.onopen = () => {
      this.connected = true;
    }
  }
  sendMessage(message: any) {
    this.io.send(message);
  }
}
