import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChannelSocketService {
  private io: WebSocket | null = null;
  private channelId: string | null = null;
  private userId: number | null = null;
  private connecting = false;
  private pendingMessages: unknown[] = [];

  private messageSubject = new Subject<MessageEvent>();
  private errSubject = new Subject<Event>();
  private connected = false;

  isConnected() {
    return this.connected && this.io?.readyState === WebSocket.OPEN;
  }

  setChannelId(channelId: string) {
    if (this.channelId === channelId) {
      return;
    }
    this.channelId = channelId;
    this.reconnect();
  }

  setUserId(userId: number) {
    if (this.userId === userId) {
      return;
    }
    this.userId = userId;
    this.reconnect();
  }

  onMessage(): Observable<MessageEvent> {
    return this.messageSubject.asObservable();
  }

  onError(): Observable<Event> {
    return this.errSubject.asObservable();
  }

  connect(): boolean {
    if (!this.channelId || this.userId == null) {
      return false;
    }

    if (
      this.io &&
      (this.io.readyState === WebSocket.OPEN || this.io.readyState === WebSocket.CONNECTING)
    ) {
      return true;
    }

    this.connecting = true;
    const url = `${environment.wsUrl}/channel?channelId=${encodeURIComponent(this.channelId)}&userId=${this.userId}`;
    this.io = new WebSocket(url);

    this.io.onopen = () => {
      this.connected = true;
      this.connecting = false;
      const queued = [...this.pendingMessages];
      this.pendingMessages = [];
      queued.forEach((message) => this.io?.send(JSON.stringify(message)));
    };

    this.io.onmessage = (msg) => {
      this.messageSubject.next(msg);
    };

    this.io.onerror = (err) => {
      this.connecting = false;
      this.errSubject.next(err);
    };

    this.io.onclose = () => {
      this.connected = false;
      this.connecting = false;
    };

    return true;
  }

  disconnect() {
    if (this.io) {
      this.connected = false;
      this.connecting = false;
      this.io.onopen = null;
      this.io.onmessage = null;
      this.io.onerror = null;
      this.io.onclose = null;
      if (
        this.io.readyState === WebSocket.OPEN ||
        this.io.readyState === WebSocket.CONNECTING
      ) {
        this.io.close();
      }
      this.io = null;
    }
  }

  sendMessage(message: unknown) {
    if (this.io?.readyState === WebSocket.OPEN) {
      this.io.send(JSON.stringify(message));
      return;
    }

    this.pendingMessages.push(message);
    if (!this.connecting) {
      this.connect();
    }
  }

  private reconnect() {
    this.disconnect();
    this.connect();
  }
}
