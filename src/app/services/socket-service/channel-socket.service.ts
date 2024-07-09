import { Injectable } from '@angular/core';
import {Observable, Subject} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ChannelSocketService {
  private io: WebSocket;
  private channelId: number;
  private userId: number;

  private messageSubject = new Subject<MessageEvent>();
  private errSubject = new Subject<Event>();
  private messageObs = this.messageSubject.asObservable();
  private errObs = this.errSubject.asObservable();
  private connected: boolean = false;
  isConnected() {
    return this.connected;
  }
  setChannelId(channelId: number) {
    this.channelId = channelId;
    if (this.userId) {
      this.disconnect();
      this.connect();
    }
  }
  setUserId(userId: number) {
    this.userId = userId;
    if (this.channelId) {
      this.disconnect();
      this.connect();
    }
  }
  onMessage(): Observable<MessageEvent> {
    return this.messageObs;
  }
  onError(): Observable<Event> {
    return this.errObs;
  }
  constructor() {}
  connect(): boolean {
    this.io = new WebSocket('ws://localhost:8080/channel?channelId=' + this.channelId + "&userId=" + this.userId);
    this.io.onopen = () => {
      this.connected = true;
    }
    this.io.onmessage = (msg) => {
      this.messageSubject.next(msg);
    }
    this.io.onerror = (err) => {
      this.errSubject.next(err);
    }
    return true;
  }
  disconnect() {
    this.connected = false;
    this.io.close();
  }
  sendMessage(message: any) {
    this.io.send(JSON.stringify(message));
  }
}
