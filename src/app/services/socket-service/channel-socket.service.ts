/**
 * C3 fix: authenticated, per-topic channel WebSocket service.
 *
 * Protocol:
 *  1. POST /api/ws-ticket  → get a 60-second single-use ticket
 *  2. Open WebSocket to /ws
 *  3. Send { type:'auth', ticket }
 *  4. Receive { type:'auth_ok' } → send { type:'subscribe', topic:'channel:{channelId}' }
 *  5. Receive { type:'subscribed' } → ready; flush pending messages
 *  6. Outgoing messages: { type:'message', data:<payload> }
 *  7. Incoming messages: { type:'message', data:<payload>, ... } → emit to subscribers
 */
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { firstValueFrom, take } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserWebService } from '../user-web-service/user-web.service';

@Injectable({ providedIn: 'root' })
export class ChannelSocketService {
  private io: WebSocket | null = null;
  private channelId: string | null = null;
  private userId: number | null = null;
  private connecting = false;
  private pendingMessages: unknown[] = [];

  private messageSubject = new Subject<MessageEvent>();
  private errSubject    = new Subject<Event>();
  private connected     = false;

  constructor(private userWebService: UserWebService) {}

  isConnected(): boolean {
    return this.connected && this.io?.readyState === WebSocket.OPEN;
  }

  setChannelId(channelId: string): void {
    if (this.channelId === channelId) return;
    this.channelId = channelId;
    this.reconnect();
  }

  setUserId(userId: number): void {
    if (this.userId === userId) return;
    this.userId = userId;
    this.reconnect();
  }

  onMessage(): Observable<MessageEvent> {
    return this.messageSubject.asObservable();
  }

  onError(): Observable<Event> {
    return this.errSubject.asObservable();
  }

  connect(): void {
    if (!this.channelId || this.userId == null) return;
    if (this.io && (this.io.readyState === WebSocket.OPEN || this.io.readyState === WebSocket.CONNECTING)) return;
    if (this.connecting) return;

    this.connecting = true;

    // Step 1: fetch a single-use ticket
    firstValueFrom(this.userWebService.createWsTicket().pipe(take(1)))
      .then(({ ticket }) => this.openSocket(ticket))
      .catch(() => {
        this.connecting = false;
        this.errSubject.next(new ErrorEvent('error', { message: 'Failed to obtain WS ticket' }));
      });
  }

  private openSocket(ticket: string): void {
    const channelId = this.channelId;
    const url = `${environment.wsUrl}/ws`;
    this.io = new WebSocket(url);

    this.io.onopen = () => {
      // Step 2: authenticate
      this.io!.send(JSON.stringify({ type: 'auth', ticket }));
    };

    this.io.onmessage = (event: MessageEvent) => {
      let data: any;
      try { data = JSON.parse(event.data as string); } catch { return; }

      switch (data.type) {
        case 'auth_ok':
          // Step 3: subscribe to the channel topic
          this.io!.send(JSON.stringify({ type: 'subscribe', topic: `channel:${channelId}` }));
          break;

        case 'subscribed':
          // Step 4: ready — flush queued messages
          this.connected  = true;
          this.connecting = false;
          const queued = [...this.pendingMessages];
          this.pendingMessages = [];
          queued.forEach(msg => this.io?.send(JSON.stringify({ type: 'message', data: msg })));
          break;

        case 'message':
          // Forward inner payload so existing message handlers work unchanged
          this.messageSubject.next(new MessageEvent('message', { data: JSON.stringify(data.data) }));
          break;

        case 'pong':
          break;

        case 'error':
          this.errSubject.next(new ErrorEvent('error', { message: data.message }));
          break;
      }
    };

    this.io.onerror = (err) => {
      this.connecting = false;
      this.errSubject.next(err);
    };

    this.io.onclose = () => {
      this.connected  = false;
      this.connecting = false;
    };
  }

  disconnect(): void {
    if (this.io) {
      this.connected  = false;
      this.connecting = false;
      this.io.onopen    = null;
      this.io.onmessage = null;
      this.io.onerror   = null;
      this.io.onclose   = null;
      if (this.io.readyState === WebSocket.OPEN || this.io.readyState === WebSocket.CONNECTING) {
        this.io.close();
      }
      this.io = null;
    }
  }

  sendMessage(message: unknown): void {
    if (this.io?.readyState === WebSocket.OPEN && this.connected) {
      this.io.send(JSON.stringify({ type: 'message', data: message }));
      return;
    }
    this.pendingMessages.push(message);
    if (!this.connecting) {
      this.connect();
    }
  }

  private reconnect(): void {
    this.disconnect();
    this.connect();
  }
}
