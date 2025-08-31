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

  constructor(private alertService: AlertService) {}

  ngOnInit(): void {
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
}
