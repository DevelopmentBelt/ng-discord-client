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
    private inboxService: InboxService
  ) {}

  ngOnInit(): void {
    this.loadServers();
  }

  /**
   * Load user's servers
   */
  loadServers(): void {
    this.isLoading.set(true);
    
    // For now, load mock data since the service doesn't have getUserServers method
    this.loadMockServers();
    this.isLoading.set(false);
  }

  /**
   * Load mock servers for development
   */
  private loadMockServers(): void {
    const mockServers: Server[] = [
      {
        serverId: '1',
        serverName: 'My Gaming Server',
        iconURL: 'https://via.placeholder.com/64/7289da/ffffff?text=G',
        ownerId: '123',
        serverDescription: 'A server for my gaming community'
      },
      {
        serverId: '2',
        serverName: 'Project Team',
        iconURL: 'https://via.placeholder.com/64/43b581/ffffff?text=P',
        ownerId: '123',
        serverDescription: 'Collaboration space for our project'
      }
    ];
    
    this.servers.set(mockServers);
    this.sidebarServers.set(mockServers);
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
    // TODO: Implement actual server creation with backend API
    console.log('Server created:', serverData);
    
    // For now, create a mock server and add it to the list
    const newServer: Server = {
      serverId: Math.random().toString(36).substring(2, 15),
      serverName: serverData.serverName,
      serverDescription: serverData.serverDescription,
      iconURL: serverData.serverIcon ? URL.createObjectURL(serverData.serverIcon) : '',
      ownerId: 'current-user-id' // TODO: Get actual user ID
    };
    
    this.servers.set([...this.servers(), newServer]);
    this.sidebarServers.set([...this.sidebarServers(), newServer]);
    
    // Close the modal
    this.closeServerCreation();
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
