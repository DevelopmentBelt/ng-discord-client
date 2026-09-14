/**
 * C3 fix: authenticated DM WebSocket service.
 * Same ticket-based auth + topic-subscription protocol as ChannelSocketService.
 */
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { firstValueFrom, take } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserWebService } from '../user-web-service/user-web.service';

@Injectable({ providedIn: 'root' })
export class DmSocketService {
  private io: WebSocket | null = null;
  private conversationId: string | null = null;
  private connecting = false;
  private pendingMessages: unknown[] = [];
  private connected = false;

  private messageSubject = new Subject<MessageEvent>();

  constructor(private userWebService: UserWebService) {}

  onMessage(): Observable<MessageEvent> {
    return this.messageSubject.asObservable();
  }

  connect(conversationId: string): void {
    if (this.conversationId === conversationId && this.io?.readyState === WebSocket.OPEN) return;
    this.disconnect();
    this.conversationId = conversationId;
    this.connecting = true;

    firstValueFrom(this.userWebService.createWsTicket().pipe(take(1)))
      .then(({ ticket }) => this.openSocket(ticket, conversationId))
      .catch(() => {
        this.connecting = false;
      });
  }

  private openSocket(ticket: string, conversationId: string): void {
    const url = `${environment.wsUrl}/ws`;
    this.io = new WebSocket(url);

    this.io.onopen = () => {
      this.io!.send(JSON.stringify({ type: 'auth', ticket }));
    };

    this.io.onmessage = (event: MessageEvent) => {
      let data: any;
      try { data = JSON.parse(event.data as string); } catch { return; }

      switch (data.type) {
        case 'auth_ok':
          this.io!.send(JSON.stringify({ type: 'subscribe', topic: `dm:${conversationId}` }));
          break;

        case 'subscribed':
          this.connected  = true;
          this.connecting = false;
          const queued = [...this.pendingMessages];
          this.pendingMessages = [];
          queued.forEach(msg => this.io?.send(JSON.stringify({ type: 'message', data: msg })));
          break;

        case 'message':
          this.messageSubject.next(new MessageEvent('message', { data: JSON.stringify(data.data) }));
          break;

        case 'pong':
          break;
      }
    };

    this.io.onclose = () => {
      this.connected  = false;
      this.connecting = false;
    };
  }

  disconnect(): void {
    if (this.io) {
      this.io.onopen    = null;
      this.io.onmessage = null;
      this.io.onclose   = null;
      this.io.close();
      this.io = null;
    }
    this.conversationId = null;
    this.connected      = false;
    this.connecting     = false;
  }

  sendMessage(message: unknown): void {
    if (this.io?.readyState === WebSocket.OPEN && this.connected) {
      this.io.send(JSON.stringify({ type: 'message', data: message }));
      return;
    }
    this.pendingMessages.push(message);
  }
}
