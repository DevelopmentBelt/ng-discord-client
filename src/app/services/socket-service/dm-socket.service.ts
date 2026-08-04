import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DmSocketService {
  private io: WebSocket | null = null;
  private conversationId: string | null = null;
  private pendingMessages: unknown[] = [];
  private messageSubject = new Subject<MessageEvent>();

  onMessage(): Observable<MessageEvent> {
    return this.messageSubject.asObservable();
  }

  connect(conversationId: string): void {
    if (this.conversationId === conversationId && this.io?.readyState === WebSocket.OPEN) {
      return;
    }
    this.disconnect();
    this.conversationId = conversationId;
    this.io = new WebSocket(`${environment.wsUrl}/dm?conversationId=${encodeURIComponent(conversationId)}`);
    this.io.onopen = () => {
      const queued = [...this.pendingMessages];
      this.pendingMessages = [];
      queued.forEach((message) => this.io?.send(JSON.stringify(message)));
    };
    this.io.onmessage = (msg) => this.messageSubject.next(msg);
  }

  disconnect(): void {
    if (this.io) {
      this.io.onopen = null;
      this.io.onmessage = null;
      this.io.close();
      this.io = null;
    }
    this.conversationId = null;
  }

  sendMessage(message: unknown): void {
    if (this.io?.readyState === WebSocket.OPEN) {
      this.io.send(JSON.stringify(message));
      return;
    }
    this.pendingMessages.push(message);
  }
}
