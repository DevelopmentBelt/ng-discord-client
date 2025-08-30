import {
  ChangeDetectionStrategy,
  Component,
  input,
  InputSignal,
  OnInit, output,
  OutputEmitterRef, signal,
  WritableSignal
} from '@angular/core';
import {SidebarComponent} from "../../sidebar/sidebar.component";
import {SidebarServerComponent} from "../../sidebar-server/sidebar-server.component";
import {Category} from "../../../models/channel/category";
import {Channel} from "../../../models/channel/channel";
import {NgClass} from "@angular/common";
import {Server} from "../../../models/server/server";
import {AlertService} from "../../../services/alert-service/alert-service";
import {ServerOverviewModalComponent} from "../../server-overview-modal/server-overview-modal.component";
import {ServerSettingsModalComponent} from "../../server-settings-modal/server-settings-modal.component";

@Component({
  selector: 'channel-sidebar',
  templateUrl: './channel-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SidebarComponent,
    SidebarServerComponent,
    NgClass,
    ServerOverviewModalComponent,
    ServerSettingsModalComponent
  ],
  standalone: true
})
export class ChannelSidebarComponent implements OnInit {
  selectedServerChange: OutputEmitterRef<Server> = output();
  selectedChannelChange: OutputEmitterRef<Channel> = output();

  selectedChannel: WritableSignal<Channel> = signal(null);
  selectedServer: WritableSignal<Server> = signal(null);

  // Modal visibility states
  showServerOverview: WritableSignal<boolean> = signal(false);
  showServerSettings: WritableSignal<boolean> = signal(false);

  servers: InputSignal<Server[]> = input([]);
  categories: InputSignal<Category[]> = input([
    {
      categoryName: "Information",
      categoryId: 1,
      channels: [
        {
          channelId: 1,
          channelName: 'General'
        } as Channel,
        {
          channelId: 2,
          channelName: 'My Computer Specs'
        } as Channel,
        {
          channelId: 3,
          channelName: 'School shit'
        } as Channel,
        {
          channelId: 4,
          channelName: 'Car parts'
        } as Channel
      ]
    } as Category,
  ]);

  // Internal sidebar resizing
  serverListWidth: WritableSignal<number> = signal(35);
  channelListWidth: WritableSignal<number> = signal(65);

  // Resize state
  isInternalResizing: boolean = false;
  private startInternalX: number = 0;
  private startInternalWidths: { server: number; channel: number } = { server: 35, channel: 65 };

  constructor(private alertService: AlertService) {}

  ngOnInit(): void {
    this.loadInternalWidths();
    this.handleChannelSelect(this.categories()[0].channels[0]); // Choose first channel
  }

  handleChannelSelect(chan: Channel) {
    this.selectedChannel.set(chan);
    this.selectedChannelChange.emit(chan);
  }

  /**
   * Handle server selection change from sidebar
   */
  onServerChange(server: Server) {
    this.selectedServer.set(server);
    this.selectedServerChange.emit(server);
  }

  /**
   * Open server overview modal (eye button)
   */
  openServerOverview(): void {
    const server = this.selectedServer();
    if (server) {
      this.showServerOverview.set(true);
    } else {
      this.alertService.warning('No Server Selected', 'Please select a server first to view its overview.');
    }
  }

  /**
   * Open server settings modal (gear button)
   */
  openServerSettings(): void {
    const server = this.selectedServer();
    if (server) {
      this.showServerSettings.set(true);
    } else {
      this.alertService.warning('No Server Selected', 'Please select a server first to access its settings.');
    }
  }

  /**
   * Close server overview modal
   */
  closeServerOverview(): void {
    this.showServerOverview.set(false);
  }

  /**
   * Close server settings modal
   */
  closeServerSettings(): void {
    this.showServerSettings.set(false);
  }

  /**
   * Get current server name for display
   */
  getCurrentServerName(): string {
    const server = this.selectedServer();
    return server ? server.serverName : 'Angcord Server';
  }

  /**
   * Check if user has permission to view server overview
   */
  canViewServerOverview(): boolean {
    // TODO: Implement permission checking logic
    // For now, allow all users to view overview
    return true;
  }

  /**
   * Check if user has permission to access server settings
   */
  canAccessServerSettings(): boolean {
    // TODO: Implement permission checking logic
    // Check if user is server owner or has admin role
    const server = this.selectedServer();
    if (!server) return false;
    
    // For now, allow access if server exists
    // In the future, check user roles and permissions
    return true;
  }

  startInternalResizing(event: MouseEvent): void {
    event.preventDefault();
    this.isInternalResizing = true;
    this.startInternalX = event.clientX;

    // Store current widths
    this.startInternalWidths = {
      server: this.serverListWidth(),
      channel: this.channelListWidth()
    };

    // Add global mouse events
    document.addEventListener('mousemove', this.handleInternalMouseMove.bind(this));
    document.addEventListener('mouseup', this.stopInternalResizing.bind(this));
  }

  private handleInternalMouseMove(event: MouseEvent): void {
    if (!this.isInternalResizing) return;

    const container = (event.target as Element).closest('.channel-sidebar-container') as HTMLElement;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const deltaX = event.clientX - this.startInternalX;
    const deltaPercent = (deltaX / containerWidth) * 100;

    let newServerWidth = this.startInternalWidths.server + deltaPercent;
    let newChannelWidth = this.startInternalWidths.channel - deltaPercent;

    // Constrain widths between 20% and 70%
    newServerWidth = Math.max(20, Math.min(70, newServerWidth));
    newChannelWidth = Math.max(30, Math.min(80, newChannelWidth));

    this.serverListWidth.set(newServerWidth);
    this.channelListWidth.set(newChannelWidth);
  }

  private stopInternalResizing(): void {
    if (this.isInternalResizing) {
      this.isInternalResizing = false;

      // Save widths to localStorage
      this.saveInternalWidths();

      // Remove global mouse events
      document.removeEventListener('mousemove', this.handleInternalMouseMove.bind(this));
      document.removeEventListener('mouseup', this.stopInternalResizing.bind(this));
    }
  }

  private saveInternalWidths(): void {
    const widths = {
      server: this.serverListWidth(),
      channel: this.channelListWidth()
    };
    localStorage.setItem('discord-internal-sidebar-widths', JSON.stringify(widths));
  }

  private loadInternalWidths(): void {
    try {
      const saved = localStorage.getItem('discord-internal-sidebar-widths');
      if (saved) {
        const widths = JSON.parse(saved);
        this.serverListWidth.set(widths.server || 35);
        this.channelListWidth.set(widths.channel || 65);
      }
    } catch (error) {
      console.warn('Failed to load saved internal sidebar widths:', error);
    }
  }
}
