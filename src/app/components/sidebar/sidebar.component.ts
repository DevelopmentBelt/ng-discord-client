import { ChangeDetectionStrategy, Component, OnInit, signal, WritableSignal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServerBrowserComponent } from '../server-browser/server-browser.component';
import { SidebarServerComponent } from '../sidebar-server/sidebar-server.component';
import { ServerCreationModalComponent } from '../server-creation-modal/server-creation-modal.component';
import { InboxModalComponent } from '../inbox-modal/inbox-modal.component';
import { NotificationBadgeComponent } from '../notification-badge/notification-badge.component';
import { Server } from '../../models/server/server';
import { ServerConnectivityService } from '../../services/server-connectivity.service';
import { InboxService } from '../../services/inbox-service/inbox.service';
import { ServerWebService } from '../../services/server-web-service/server-web.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',

  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, ServerBrowserComponent, SidebarServerComponent, ServerCreationModalComponent, InboxModalComponent, NotificationBadgeComponent]
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

  constructor(
    private serverService: ServerConnectivityService,
    private inboxService: InboxService,
    private serverWebService: ServerWebService
  ) {}

  ngOnInit(): void {
    this.loadServers();
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
        // Backend now returns data in the correct format
        const transformedServer = {
          serverId: newServer.serverId?.toString() || '',
          serverName: newServer.serverName || '',
          serverDescription: newServer.serverDescription || '',
          iconURL: newServer.iconURL || '',
          ownerId: newServer.ownerId?.toString() || ''
        };
        
        // Add to local servers list
        this.servers.set([...this.servers(), transformedServer]);
        this.sidebarServers.set([...this.sidebarServers(), transformedServer]);
        
        // Close the modal
        this.closeServerCreation();
      },
      error: (error: any) => {
        console.error('Failed to create server:', error);
        // TODO: Show error message to user
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
    console.log('Inbox item selected:', item);
    // TODO: Handle different types of inbox items
    // - Direct messages: Open DM thread
    // - Mentions: Navigate to message
    // - Server invites: Show invite modal
    // - etc.
  }
}
