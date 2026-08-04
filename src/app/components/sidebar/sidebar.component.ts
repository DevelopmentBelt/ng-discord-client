import { ChangeDetectionStrategy, Component, OnInit, signal, WritableSignal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServerBrowserComponent } from '../server-browser/server-browser.component';
import { SidebarServerComponent } from '../sidebar-server/sidebar-server.component';
import { ServerCreationModalComponent } from '../server-creation-modal/server-creation-modal.component';
import { InboxModalComponent } from '../inbox-modal/inbox-modal.component';
import { NotificationBadgeComponent } from '../notification-badge/notification-badge.component';
import { UserSettingsModalComponent } from '../user-settings-modal/user-settings-modal.component';
import { Server } from '../../models/server/server';
import { ServerConnectivityService } from '../../services/server-connectivity.service';
import { InboxService } from '../../services/inbox-service/inbox.service';
import { ServerWebService } from '../../services/server-web-service/server-web.service';
import { AuthService } from '../../services/auth-service/auth.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',

  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, ServerBrowserComponent, SidebarServerComponent, ServerCreationModalComponent, InboxModalComponent, NotificationBadgeComponent, UserSettingsModalComponent]
})
export class SidebarComponent implements OnInit {
  // Input Signals
  currentServer = input<Server | null>(null);
  isConnected = input<boolean>(false);

  // Output Signals
  serverSelected = output<Server>();
  serverCreated = output<Server>();

  // Local state
  servers: WritableSignal<Server[]> = signal([]);
  showServerBrowser: WritableSignal<boolean> = signal(false);
  isLoading: WritableSignal<boolean> = signal(false);
  searchQuery: WritableSignal<string> = signal('');
  showCreateServer: WritableSignal<boolean> = signal(false);
  newServerName: WritableSignal<string> = signal('');
  newServerDescription: WritableSignal<string> = signal('');

  // Legacy properties for template compatibility
  selectedServerId: WritableSignal<string> = signal('home');
  sidebarServers: WritableSignal<Server[]> = signal([]);
  showServerCreation: WritableSignal<boolean> = signal(false);
  showInboxModal: WritableSignal<boolean> = signal(false);
  showUserSettings: WritableSignal<boolean> = signal(false);

  constructor(
    private serverService: ServerConnectivityService,
    private inboxService: InboxService,
    private serverWebService: ServerWebService,
    private authService: AuthService
  ) {}

  currentUsername(): string {
    return this.authService.currentUser()?.username || 'User';
  }

  currentUserPic(): string {
    return this.authService.currentUser()?.userPic || '';
  }

  openUserSettings(): void {
    this.showUserSettings.set(true);
  }

  closeUserSettings(): void {
    this.showUserSettings.set(false);
  }

  logout(): void {
    this.authService.logout().pipe(take(1)).subscribe();
  }

  ngOnInit(): void {
    this.loadServers();
    this.inboxService.refresh();
    // Keep Home selection in sync with the main layout on first load
    this.selectHome();
  }

  /**
   * Load user's servers from the backend
   */
  loadServers(): void {
    this.isLoading.set(true);
    
    this.serverWebService.getUserServers().subscribe({
      next: (servers: any[]) => {
        // Backend now returns data in the correct format
        const transformedServers = servers.map(server => ({
          serverId: server.serverId?.toString() || '',
          serverName: server.serverName || '',
          iconURL: server.iconURL || '',
          ownerId: server.ownerId?.toString() || '',
          serverDescription: server.serverDescription || ''
        }));
        
        this.servers.set(transformedServers);
        this.sidebarServers.set(transformedServers);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Failed to load servers:', error);
        // Fallback to empty array on error
        this.servers.set([]);
        this.sidebarServers.set([]);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Select a server
   */
  selectServer(server: Server): void {
    this.selectedServerId.set(server.serverId);
    this.serverSelected.emit(server);
  }

  /**
   * Select home
   */
  selectHome(): void {
    this.selectedServerId.set('home');
    const homeServer: Server = {
      serverId: 'home',
      serverName: 'Home',
      iconURL: '',
      ownerId: '',
      serverDescription: 'Home server'
    };
    this.serverSelected.emit(homeServer);
  }

  /**
   * Show server browser
   */
  exploreServers(): void {
    this.showServerBrowser.set(true);
  }

  /**
   * Close server browser
   */
  closeServerBrowser(): void {
    this.showServerBrowser.set(false);
  }

  /**
   * Handle server joined event
   */
  onServerJoined(server: Server): void {
    // TODO: Add the joined server to the user's server list
    console.log('Server joined:', server);
    
    // Add to local servers list
    const currentServers = this.servers();
    if (!currentServers.find(s => s.serverId === server.serverId)) {
      this.servers.set([...currentServers, server]);
      this.sidebarServers.set([...this.sidebarServers(), server]);
    }
    
    // Close the browser
    this.closeServerBrowser();
  }

  /**
   * Show create server form
   */
  addServer(): void {
    this.showServerCreation.set(true);
  }

  /**
   * Close server creation modal
   */
  closeServerCreation(): void {
    this.showServerCreation.set(false);
  }

  /**
   * Handle server creation
   */
  onServerCreated(serverData: any): void {
    this.serverWebService.createServer(serverData).subscribe({
      next: (newServer: any) => {
        const transformedServer = {
          serverId: newServer.serverId?.toString() || '',
          serverName: newServer.serverName || '',
          serverDescription: newServer.serverDescription || '',
          iconURL: newServer.iconURL || '',
          ownerId: newServer.ownerId?.toString() || ''
        };

        this.servers.set([...this.servers(), transformedServer]);
        this.sidebarServers.set([...this.sidebarServers(), transformedServer]);
        this.closeServerCreation();
        // Select the new server so channels/members load immediately
        this.selectServer(transformedServer);
      },
      error: (error: any) => {
        console.error('Failed to create server:', error);
      }
    });
  }

  /**
   * Filter servers based on search query
   */
  get filteredServers(): Server[] {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.servers();
    
    return this.servers().filter(server => 
      server.serverName.toLowerCase().includes(query) ||
      server.serverDescription.toLowerCase().includes(query)
    );
  }

  /**
   * Check if server is currently selected
   */
  isServerSelected(server: Server): boolean {
    return this.currentServer()?.serverId === server.serverId;
  }

  /**
   * Get server initials for avatar fallback
   */
  getServerInitials(server: Server): string {
    return server.serverName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  /**
   * Open inbox modal
   */
  openInbox(): void {
    this.inboxService.refresh();
    this.showInboxModal.set(true);
  }

  /**
   * Close inbox modal
   */
  closeInboxModal(): void {
    this.showInboxModal.set(false);
  }

  /**
   * Get unread count from inbox service
   */
  getUnreadCount(): number {
    return this.inboxService.getUnreadCount();
  }

  /**
   * Handle inbox item selection
   */
  onInboxItemSelected(item: any): void {
    this.closeInboxModal();

    if (item?.type === 'direct_message' && item.conversationId) {
      this.selectHome();
      this.inboxService.requestOpenConversation(String(item.conversationId));
      return;
    }

    if (item?.type === 'mention' && item.serverId) {
      const server = this.sidebarServers().find((s) => String(s.serverId) === String(item.serverId));
      if (server) {
        this.selectServer(server);
      }
      if (item.channelId != null) {
        this.inboxService.requestOpenChannel(item.serverId, item.channelId);
      }
    }
  }
}
