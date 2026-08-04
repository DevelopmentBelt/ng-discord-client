import { Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { InboxItem, InboxItemType, InboxPriority, DirectMessageThread, InboxFilters } from '../../models/inbox/inbox-item';
import * as moment from 'moment';
import { environment } from '../../../environments/environment';

export interface InboxChannelNav {
  serverId: string;
  channelId: string;
}

@Injectable({
  providedIn: 'root'
})
export class InboxService {
  private baseUrl = environment.apiUrl;
  private readonly creds = { withCredentials: true };

  private inboxItems: WritableSignal<InboxItem[]> = signal([]);
  private unreadCount: WritableSignal<number> = signal(0);
  private directMessageThreads: WritableSignal<DirectMessageThread[]> = signal([]);

  private inboxUpdateSubject = new BehaviorSubject<InboxItem[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private openConversationSubject = new Subject<string>();
  private openChannelSubject = new Subject<InboxChannelNav>();

  inboxItems$ = this.inboxUpdateSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();
  openConversation$ = this.openConversationSubject.asObservable();
  openChannel$ = this.openChannelSubject.asObservable();

  constructor(private http: HttpClient) {
    this.refresh();
  }

  getInboxItems(): InboxItem[] {
    return this.inboxItems();
  }

  getUnreadCount(): number {
    return this.unreadCount();
  }

  getDirectMessageThreads(): DirectMessageThread[] {
    return this.directMessageThreads();
  }

  refresh(): void {
    this.fetchInboxItems().subscribe({
      next: (items) => this.setItems(items || []),
      error: () => this.setItems([])
    });
  }

  markAsRead(itemId: string): void {
    this.markItemAsRead(itemId).subscribe({
      next: () => {
        const updatedItems = this.inboxItems().map((item) =>
          item.id === itemId ? { ...item, isRead: true } : item
        );
        this.setItems(updatedItems);
      }
    });
  }

  markAllAsRead(): void {
    this.http.put(`${this.baseUrl}/api/inbox/read-all`, {}, this.creds).subscribe({
      next: () => {
        const updatedItems = this.inboxItems().map((item) => ({ ...item, isRead: true }));
        this.setItems(updatedItems);
      }
    });
  }

  deleteItem(itemId: string): void {
    this.deleteInboxItem(itemId).subscribe({
      next: () => {
        const updatedItems = this.inboxItems().filter((item) => item.id !== itemId);
        this.setItems(updatedItems);
      }
    });
  }

  requestOpenConversation(conversationId: string): void {
    this.openConversationSubject.next(conversationId);
  }

  requestOpenChannel(serverId: string, channelId: string | number): void {
    this.openChannelSubject.next({
      serverId: String(serverId),
      channelId: String(channelId)
    });
  }

  filterItems(filters: InboxFilters): InboxItem[] {
    let items = this.inboxItems();

    if (!filters.showRead) {
      items = items.filter((item) => !item.isRead);
    }
    if (!filters.showUnread) {
      items = items.filter((item) => item.isRead);
    }
    if (filters.types.length > 0) {
      items = items.filter((item) => filters.types.includes(item.type));
    }
    if (filters.priority.length > 0) {
      items = items.filter((item) => filters.priority.includes(item.priority));
    }
    if (filters.dateRange) {
      items = items.filter((item) =>
        item.timestamp.isBetween(filters.dateRange!.start, filters.dateRange!.end, 'day', '[]')
      );
    }
    return items;
  }

  getItemsByType(type: InboxItemType): InboxItem[] {
    return this.inboxItems().filter((item) => item.type === type);
  }

  searchItems(query: string): InboxItem[] {
    const searchTerm = query.toLowerCase();
    return this.inboxItems().filter((item) =>
      item.title.toLowerCase().includes(searchTerm) ||
      item.content.toLowerCase().includes(searchTerm) ||
      item.sender?.username?.toLowerCase().includes(searchTerm)
    );
  }

  fetchInboxItems(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/inbox`, this.creds);
  }

  markItemAsRead(itemId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/inbox/${encodeURIComponent(itemId)}/read`, {}, this.creds);
  }

  deleteInboxItem(itemId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/inbox/${encodeURIComponent(itemId)}`, this.creds);
  }

  private setItems(rawItems: any[]): void {
    const items = rawItems.map((item) => this.normalizeItem(item));
    this.inboxItems.set(items);
    this.updateUnreadCount();
    this.inboxUpdateSubject.next(items);
  }

  private normalizeItem(item: any): InboxItem {
    return {
      id: String(item.id),
      type: item.type as InboxItemType,
      title: item.title || '',
      content: item.content || '',
      timestamp: moment(item.timestamp),
      isRead: !!item.isRead || !!item.is_read,
      priority: (item.priority || InboxPriority.MEDIUM) as InboxPriority,
      sender: item.sender,
      mentionCount: item.mentionCount,
      conversationId: item.conversationId ? String(item.conversationId) : undefined,
      serverId: item.serverId ? String(item.serverId) : undefined,
      serverName: item.serverName,
      channelId: item.channelId,
      channelName: item.channelName
    };
  }

  private updateUnreadCount(): void {
    const count = this.inboxItems().filter((item) => !item.isRead).length;
    this.unreadCount.set(count);
    this.unreadCountSubject.next(count);
  }
}
