import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BaseSocketService {
  private io: WebSocket;
  private connected: boolean = false;
  constructor() {
    this.io = new WebSocket(`${environment.wsUrl}/base`);
    this.io.onopen = () => {
      this.connected = true;
    }
  }
  sendMessage(message: any) {
    this.io.send(message);
  }
}
