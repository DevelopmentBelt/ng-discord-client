import { Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { InboxItem, InboxItemType, InboxPriority, DirectMessageThread, InboxFilters } from '../../models/inbox/inbox-item';
import { User } from '../../models/user/user';
import { Message } from '../../models/message/message';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class InboxService {
  private baseUrl = 'http://localhost:8000';
  
  // Signals for reactive state management
  private inboxItems: WritableSignal<InboxItem[]> = signal([]);
  private unreadCount: WritableSignal<number> = signal(0);
  private directMessageThreads: WritableSignal<DirectMessageThread[]> = signal([]);
  
  // Behavior subjects for real-time updates
  private inboxUpdateSubject = new BehaviorSubject<InboxItem[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  
  // Public observables
  inboxItems$ = this.inboxUpdateSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadMockData(); // Load mock data for development
  }

  /**
   * Get all inbox items
   */
  getInboxItems(): InboxItem[] {
    return this.inboxItems();
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.unreadCount();
  }

  /**
   * Get direct message threads
   */
  getDirectMessageThreads(): DirectMessageThread[] {
    return this.directMessageThreads();
  }

  /**
   * Mark item as read
   */
  markAsRead(itemId: string): void {
    const items = this.inboxItems();
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, isRead: true } : item
    );
    
    this.inboxItems.set(updatedItems);
    this.updateUnreadCount();
    this.inboxUpdateSubject.next(updatedItems);
  }

  /**
   * Mark all items as read
   */
  markAllAsRead(): void {
    const items = this.inboxItems();
    const updatedItems = items.map(item => ({ ...item, isRead: true }));
    
    this.inboxItems.set(updatedItems);
    this.updateUnreadCount();
    this.inboxUpdateSubject.next(updatedItems);
  }

  /**
   * Delete inbox item
   */
  deleteItem(itemId: string): void {
    const items = this.inboxItems();
    const updatedItems = items.filter(item => item.id !== itemId);
    
    this.inboxItems.set(updatedItems);
    this.updateUnreadCount();
    this.inboxUpdateSubject.next(updatedItems);
  }

  /**
   * Filter inbox items
   */
  filterItems(filters: InboxFilters): InboxItem[] {
    let items = this.inboxItems();
    
    if (!filters.showRead) {
      items = items.filter(item => !item.isRead);
    }
    
    if (!filters.showUnread) {
      items = items.filter(item => item.isRead);
    }
    
    if (filters.types.length > 0) {
      items = items.filter(item => filters.types.includes(item.type));
    }
    
    if (filters.priority.length > 0) {
      items = items.filter(item => filters.priority.includes(item.priority));
    }
    
    if (filters.dateRange) {
      items = items.filter(item => 
        item.timestamp.isBetween(filters.dateRange!.start, filters.dateRange!.end, 'day', '[]')
      );
    }
    
    return items;
  }

  /**
   * Add new inbox item
   */
  addInboxItem(item: Omit<InboxItem, 'id' | 'timestamp' | 'isRead'>): void {
    const newItem: InboxItem = {
      ...item,
      id: this.generateId(),
      timestamp: moment(),
      isRead: false
    };
    
    const items = this.inboxItems();
    const updatedItems = [newItem, ...items];
    
    this.inboxItems.set(updatedItems);
    this.updateUnreadCount();
    this.inboxUpdateSubject.next(updatedItems);
  }

  /**
   * Update inbox item
   */
  updateInboxItem(itemId: string, updates: Partial<InboxItem>): void {
    const items = this.inboxItems();
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    );
    
    this.inboxItems.set(updatedItems);
    this.updateUnreadCount();
    this.inboxUpdateSubject.next(updatedItems);
  }

  /**
   * Get inbox items by type
   */
  getItemsByType(type: InboxItemType): InboxItem[] {
    return this.inboxItems().filter(item => item.type === type);
  }

  /**
   * Get high priority items
   */
  getHighPriorityItems(): InboxItem[] {
    return this.inboxItems().filter(item => 
      item.priority === InboxPriority.HIGH || item.priority === InboxPriority.URGENT
    );
  }

  /**
   * Search inbox items
   */
  searchItems(query: string): InboxItem[] {
    const searchTerm = query.toLowerCase();
    return this.inboxItems().filter(item => 
      item.title.toLowerCase().includes(searchTerm) ||
      item.content.toLowerCase().includes(searchTerm) ||
      item.sender?.username?.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Update unread count
   */
  private updateUnreadCount(): void {
    const count = this.inboxItems().filter(item => !item.isRead).length;
    this.unreadCount.set(count);
    this.unreadCountSubject.next(count);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Load mock data for development
   */
  private loadMockData(): void {
    const mockItems: InboxItem[] = [
      {
        id: '1',
        type: InboxItemType.DIRECT_MESSAGE,
        title: 'New message from John Doe',
        content: 'Hey! How are you doing?',
        timestamp: moment().subtract(5, 'minutes'),
        isRead: false,
        priority: InboxPriority.MEDIUM,
        sender: {
          id: 1,
          username: 'John Doe',
          email: 'john@example.com',
          userPic: 'https://via.placeholder.com/40/7289da/ffffff?text=J',
          userBio: 'A friendly user'
        } as User
      },
      {
        id: '2',
        type: InboxItemType.MENTION,
        title: 'You were mentioned in #general',
        content: '@username Check out this new feature!',
        timestamp: moment().subtract(15, 'minutes'),
        isRead: false,
        priority: InboxPriority.HIGH,
        sender: {
          id: 2,
          username: 'Jane Smith',
          email: 'jane@example.com',
          userPic: 'https://via.placeholder.com/40/43b581/ffffff?text=J',
          userBio: 'Another friendly user'
        } as User,
        mentionCount: 1
      },
      {
        id: '3',
        type: InboxItemType.SERVER_INVITE,
        title: 'Invitation to join Gaming Community',
        content: 'You have been invited to join the Gaming Community server',
        timestamp: moment().subtract(1, 'hour'),
        isRead: true,
        priority: InboxPriority.LOW,
        sender: {
          id: 3,
          username: 'Gaming Bot',
          email: 'bot@gaming.com',
          userPic: 'https://via.placeholder.com/40/faa61a/ffffff?text=G',
          userBio: 'A gaming bot'
        } as User
      },
      {
        id: '4',
        type: InboxItemType.SYSTEM_NOTIFICATION,
        title: 'Server maintenance scheduled',
        content: 'Scheduled maintenance will occur on Sunday at 2 AM UTC',
        timestamp: moment().subtract(2, 'hours'),
        isRead: true,
        priority: InboxPriority.MEDIUM
      }
    ];

    this.inboxItems.set(mockItems);
    this.updateUnreadCount();
    this.inboxUpdateSubject.next(mockItems);

    // Mock direct message threads
    const mockThreads: DirectMessageThread[] = [
      {
        id: '1',
        participants: [
          {
            id: 1,
            username: 'John Doe',
            email: 'john@example.com',
            userPic: 'https://via.placeholder.com/40/7289da/ffffff?text=J',
            userBio: 'A friendly user'
          } as User
        ],
        lastMessage: {
          id: '1',
          text: 'Hey! How are you doing?',
          rawText: 'Hey! How are you doing?',
          mentions: [],
          attachments: [],
          postedTimestamp: moment().subtract(5, 'minutes'),
          edited: false,
          editTimestamp: moment(),
          author: {
            userId: 1,
            username: 'John Doe'
          }
        } as Message,
        unreadCount: 1,
        lastActivity: moment().subtract(5, 'minutes')
      }
    ];

    this.directMessageThreads.set(mockThreads);
  }

  /**
   * API methods for backend integration
   */
  fetchInboxItems(): Observable<InboxItem[]> {
    return this.http.get<InboxItem[]>(`${this.baseUrl}/api/inbox`);
  }

  markItemAsRead(itemId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/inbox/${itemId}/read`, {});
  }

  deleteInboxItem(itemId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/inbox/${itemId}`);
  }
}
