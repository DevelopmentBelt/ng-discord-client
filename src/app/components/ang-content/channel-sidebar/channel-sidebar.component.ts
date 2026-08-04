import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  input,
  InputSignal,
  OnInit,
  output,
  OutputEmitterRef,
  signal,
  WritableSignal
} from '@angular/core';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { Category } from '../../../models/channel/category';
import { Channel } from '../../../models/channel/channel';
import { NgClass } from '@angular/common';
import { Server } from '../../../models/server/server';
import { AlertService } from '../../../services/alert-service/alert-service';
import { ServerOverviewModalComponent } from '../../server-overview-modal/server-overview-modal.component';
import { ServerSettingsModalComponent } from '../../server-settings-modal/server-settings-modal.component';
import { ServerWebService } from '../../../services/server-web-service/server-web.service';

@Component({
  selector: 'channel-sidebar',
  templateUrl: './channel-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SidebarComponent,
    NgClass,
    ServerOverviewModalComponent,
    ServerSettingsModalComponent
  ],
  standalone: true
})
export class ChannelSidebarComponent implements OnInit {
  selectedServerChange: OutputEmitterRef<Server> = output();
  selectedChannelChange: OutputEmitterRef<Channel | null> = output();

  selectedChannel: WritableSignal<Channel | null> = signal(null);
  selectedServer: WritableSignal<Server | null> = signal(null);
  categories: WritableSignal<Category[]> = signal([]);

  showServerOverview: WritableSignal<boolean> = signal(false);
  showServerSettings: WritableSignal<boolean> = signal(false);

  servers: InputSignal<Server[]> = input([]);

  constructor(
    private alertService: AlertService,
    private serverWebService: ServerWebService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  handleChannelSelect(chan: Channel) {
    this.selectedChannel.set(chan);
    this.selectedChannelChange.emit(chan);
  }

  onServerChange(server: Server) {
    this.selectedServer.set(server);
    this.selectedServerChange.emit(server);
    this.loadChannelsForServer(server);
  }

  private loadChannelsForServer(server: Server): void {
    if (!server?.serverId || server.serverId === 'home') {
      this.categories.set([]);
      this.selectedChannel.set(null);
      this.selectedChannelChange.emit(null);
      this.cdr.markForCheck();
      return;
    }

    this.serverWebService.getServerChannels(server.serverId).subscribe({
      next: (categories) => {
        this.categories.set(categories || []);
        const firstChannel = categories?.find((c) => c.channels?.length)?.channels?.[0] || null;
        this.selectedChannel.set(firstChannel);
        this.selectedChannelChange.emit(firstChannel);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load server channels:', error);
        this.categories.set([]);
        this.selectedChannel.set(null);
        this.selectedChannelChange.emit(null);
        this.cdr.markForCheck();
      }
    });
  }

  openServerOverview(): void {
    const server = this.selectedServer();
    if (server) {
      this.showServerOverview.set(true);
    } else {
      this.alertService.warning('No Server Selected', 'Please select a server first to view its overview.');
    }
  }

  openServerSettings(): void {
    const server = this.selectedServer();
    if (server) {
      this.showServerSettings.set(true);
    } else {
      this.alertService.warning('No Server Selected', 'Please select a server first to access its settings.');
    }
  }

  closeServerOverview(): void {
    this.showServerOverview.set(false);
  }

  closeServerSettings(): void {
    this.showServerSettings.set(false);
  }

  getCurrentServerName(): string {
    const server = this.selectedServer();
    return server ? server.serverName : 'Angcord Server';
  }

  canViewServerOverview(): boolean {
    return true;
  }

  canAccessServerSettings(): boolean {
    return !!this.selectedServer();
  }
}
