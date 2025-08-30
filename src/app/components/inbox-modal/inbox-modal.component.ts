import { ChangeDetectionStrategy, Component, OnInit, signal, WritableSignal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InboxService } from '../../services/inbox-service/inbox.service';
import { InboxItem, InboxItemType, InboxPriority, InboxFilters } from '../../models/inbox/inbox-item';
import { DatetimeFormatterPipe } from '../../pipes/datetimeFormatter/datetime-formatter.pipe';
import * as moment from 'moment';

@Component({
  selector: 'app-inbox-modal',
  templateUrl: './inbox-modal.component.html',
  styleUrls: ['./inbox-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, DatetimeFormatterPipe]
})
export class InboxModalComponent implements OnInit {
  // Output Signals
  closeModal = output<void>();
  itemSelected = output<InboxItem>();

  // Local state
  inboxItems: WritableSignal<InboxItem[]> = signal([]);
  filteredItems: WritableSignal<InboxItem[]> = signal([]);
  selectedTab: WritableSignal<string> = signal('all');
  searchQuery: WritableSignal<string> = signal('');
  filters: WritableSignal<InboxFilters> = signal({
    showRead: true,
    showUnread: true,
    types: [],
    priority: []
  });

  // UI states
  isLoading: WritableSignal<boolean> = signal(false);
  showFilters: WritableSignal<boolean> = signal(false);

  constructor(private inboxService: InboxService) {}

  ngOnInit(): void {
    this.loadInboxItems();
    this.setupSubscriptions();
  }

  /**
   * Load inbox items
   */
  loadInboxItems(): void {
    this.isLoading.set(true);
    const items = this.inboxService.getInboxItems();
    this.inboxItems.set(items);
    this.applyFilters();
    this.isLoading.set(false);
  }

  /**
   * Setup service subscriptions
   */
  private setupSubscriptions(): void {
    this.inboxService.inboxItems$.subscribe(items => {
      this.inboxItems.set(items);
      this.applyFilters();
    });

    this.inboxService.unreadCount$.subscribe(count => {
      // Update unread count display if needed
    });
  }

  /**
   * Apply current filters and search
   */
  applyFilters(): void {
    let items = this.inboxItems();
    
    // Apply tab filtering
    if (this.selectedTab() === 'unread') {
      items = items.filter(item => !item.isRead);
    } else if (this.selectedTab() === 'mentions') {
      items = items.filter(item => item.type === InboxItemType.MENTION);
    } else if (this.selectedTab() === 'direct-messages') {
      items = items.filter(item => item.type === InboxItemType.DIRECT_MESSAGE);
    }

    // Apply search
    const query = this.searchQuery();
    if (query.trim()) {
      items = this.inboxService.searchItems(query);
    }

    // Apply additional filters
    const currentFilters = this.filters();
    if (currentFilters.types.length > 0 || currentFilters.priority.length > 0) {
      items = this.inboxService.filterItems(currentFilters);
    }

    this.filteredItems.set(items);
  }

  /**
   * Handle search input
   */
  onSearchInput(): void {
    this.applyFilters();
  }

  /**
   * Handle tab selection
   */
  selectTab(tab: string): void {
    this.selectedTab.set(tab);
    this.applyFilters();
  }

  /**
   * Mark item as read
   */
  markAsRead(item: InboxItem): void {
    this.inboxService.markAsRead(item.id);
  }

  /**
   * Mark all items as read
   */
  markAllAsRead(): void {
    this.inboxService.markAllAsRead();
  }

  /**
   * Delete inbox item
   */
  deleteItem(item: InboxItem): void {
    if (confirm('Are you sure you want to delete this item?')) {
      this.inboxService.deleteItem(item.id);
    }
  }

  /**
   * Select inbox item
   */
  selectItem(item: InboxItem): void {
    this.itemSelected.emit(item);
    this.markAsRead(item);
  }

  /**
   * Toggle filters panel
   */
  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  /**
   * Update filters
   */
  updateFilters(newFilters: Partial<InboxFilters>): void {
    const currentFilters = this.filters();
    this.filters.set({ ...currentFilters, ...newFilters });
    this.applyFilters();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filters.set({
      showRead: true,
      showUnread: true,
      types: [],
      priority: []
    });
    this.searchQuery.set('');
    this.applyFilters();
  }

  /**
   * Close modal
   */
  close(): void {
    this.closeModal.emit();
  }

  /**
   * Handle escape key
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  /**
   * Get priority color class
   */
  getPriorityColor(priority: InboxPriority): string {
    switch (priority) {
      case InboxPriority.URGENT:
        return 'text-red-500';
      case InboxPriority.HIGH:
        return 'text-orange-500';
      case InboxPriority.MEDIUM:
        return 'text-yellow-500';
      case InboxPriority.LOW:
        return 'text-green-500';
      default:
        return 'text-discord-text-muted';
    }
  }

  /**
   * Get type icon
   */
  getTypeIcon(type: InboxItemType): string {
    switch (type) {
      case InboxItemType.DIRECT_MESSAGE:
        return 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z';
      case InboxItemType.MENTION:
        return 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z';
      case InboxItemType.SERVER_INVITE:
        return 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A21.026 21.026 0 0112 21m0 0c-.778 0-1.533-.099-2.253-.284m0 0A8.959 8.959 0 013 12c0-.778.099-1.533.284-2.253M12 3c.778 0 1.533.099 2.253.284M12 21c-.778 0-1.533-.099-2.253-.284M12 3c-.778 0-1.533.099-2.253.284M12 21c.778 0 1.533-.099 2.253-.284';
      case InboxItemType.FRIEND_REQUEST:
        return 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z';
      case InboxItemType.SYSTEM_NOTIFICATION:
        return 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z';
      case InboxItemType.SERVER_UPDATE:
        return 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A21.026 21.026 0 0112 21m0 0c-.778 0-1.533-.099-2.253-.284m0 0A8.959 8.959 0 013 12c0-.778.099-1.533.284-2.253M12 3c.778 0 1.533.099 2.253.284M12 21c-.778 0-1.533-.099-2.253-.284M12 3c-.778 0-1.533.099-2.253.284M12 21c.778 0 1.533-.099 2.253-.284';
      default:
        return 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z';
    }
  }

  /**
   * Get unread count for current tab
   */
  getUnreadCountForTab(tab: string): number {
    const items = this.inboxItems();
    
    switch (tab) {
      case 'unread':
        return items.filter(item => !item.isRead).length;
      case 'mentions':
        return items.filter(item => item.type === InboxItemType.MENTION && !item.isRead).length;
      case 'direct-messages':
        return items.filter(item => item.type === InboxItemType.DIRECT_MESSAGE && !item.isRead).length;
      default:
        return 0;
    }
  }

  /**
   * Format relative time
   */
  getRelativeTime(timestamp: moment.Moment): string {
    const now = moment();
    const diff = now.diff(timestamp, 'minutes');
    
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    if (diff < 10080) return `${Math.floor(diff / 1440)}d ago`;
    return timestamp.format('MMM D');
  }
}
