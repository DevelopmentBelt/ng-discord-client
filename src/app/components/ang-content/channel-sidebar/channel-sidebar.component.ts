import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  signal,
  WritableSignal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { take } from 'rxjs';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { Category } from '../../../models/channel/category';
import { Channel } from '../../../models/channel/channel';
import { Server } from '../../../models/server/server';
import { AlertService } from '../../../services/alert-service/alert-service';
import { ServerOverviewModalComponent } from '../../server-overview-modal/server-overview-modal.component';
import { ServerSettingsModalComponent } from '../../server-settings-modal/server-settings-modal.component';
import { ServerWebService } from '../../../services/server-web-service/server-web.service';
import { DmWebService } from '../../../services/dm-web-service/dm-web.service';
import { InboxService } from '../../../services/inbox-service/inbox.service';
import { DmConversation } from '../../../models/dm/dm-conversation';

@Component({
  selector: 'channel-sidebar',
  templateUrl: './channel-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SidebarComponent,
    NgClass,
    FormsModule,
    ServerOverviewModalComponent,
    ServerSettingsModalComponent
  ],
  standalone: true
})
export class ChannelSidebarComponent implements OnInit {
  selectedServerChange: OutputEmitterRef<Server> = output();
  selectedChannelChange: OutputEmitterRef<Channel | null> = output();
  selectedConversationChange: OutputEmitterRef<DmConversation | null> = output();

  selectedChannel: WritableSignal<Channel | null> = signal(null);
  selectedServer: WritableSignal<Server | null> = signal(null);
  selectedConversation: WritableSignal<DmConversation | null> = signal(null);
  categories: WritableSignal<Category[]> = signal([]);
  conversations: WritableSignal<DmConversation[]> = signal([]);

  showServerOverview: WritableSignal<boolean> = signal(false);
  showServerSettings: WritableSignal<boolean> = signal(false);
  showPhantomPassphrase: WritableSignal<boolean> = signal(false);
  phantomPassphraseReveal = signal('');
  phantomChannelName = signal('');
  dmUsername = signal('');
  dmError = signal('');
  dmLoading = signal(false);
  private pendingConversationId: string | null = null;
  private pendingChannelId: string | null = null;

  servers: InputSignal<Server[]> = input([]);

  constructor(
    private alertService: AlertService,
    private serverWebService: ServerWebService,
    private dmWebService: DmWebService,
    private inboxService: InboxService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.inboxService.openConversation$.subscribe((conversationId) => {
      this.pendingConversationId = conversationId;
      this.tryOpenPendingConversation();
      if (this.isHomeSelected()) {
        this.loadConversations();
      }
    });

    this.inboxService.openChannel$.subscribe(({ channelId }) => {
      this.pendingChannelId = channelId;
      this.tryOpenPendingChannel();
    });
  }

  handleChannelSelect(chan: Channel) {
    this.selectedChannel.set(chan);
    this.selectedChannelChange.emit(chan);
    this.selectedConversation.set(null);
    this.selectedConversationChange.emit(null);
  }

  togglePhantom(chan: Channel): void {
    const server = this.selectedServer();
    if (!server?.serverId || server.serverId === 'home') {
      return;
    }

    if (chan.isPhantom) {
      this.serverWebService.disablePhantomChannel(String(server.serverId), chan.channelId).pipe(take(1)).subscribe({
        next: () => {
          this.patchChannel(chan.channelId, { isPhantom: false, phantomSalt: null });
          this.alertService.success('Phantom disabled', `#${chan.channelName} is a normal channel again.`);
        },
        error: (err) => {
          this.alertService.error('Could not disable Phantom', err?.error?.message || 'Only the server owner can change this.');
        }
      });
      return;
    }

    this.serverWebService.enablePhantomChannel(String(server.serverId), chan.channelId).pipe(take(1)).subscribe({
      next: (resp) => {
        this.patchChannel(chan.channelId, {
          isPhantom: true,
          phantomSalt: resp.phantomSalt
        });
        this.phantomChannelName.set(chan.channelName);
        this.phantomPassphraseReveal.set(resp.passphrase);
        this.showPhantomPassphrase.set(true);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.alertService.error('Could not enable Phantom', err?.error?.message || 'Only the server owner can enable Phantom mode.');
      }
    });
  }

  closePhantomPassphrase(): void {
    this.showPhantomPassphrase.set(false);
    this.phantomPassphraseReveal.set('');
    this.phantomChannelName.set('');
  }

  copyPhantomPassphrase(): void {
    const value = this.phantomPassphraseReveal();
    if (!value || !navigator?.clipboard) {
      return;
    }
    void navigator.clipboard.writeText(value);
    this.alertService.success('Copied', 'Phantom passphrase copied to clipboard.');
  }

  private patchChannel(channelId: number, patch: Partial<Channel>): void {
    const nextCategories = this.categories().map((category) => ({
      ...category,
      channels: (category.channels || []).map((channel) =>
        channel.channelId === channelId ? { ...channel, ...patch } : channel
      )
    }));
    this.categories.set(nextCategories);

    const selected = this.selectedChannel();
    if (selected?.channelId === channelId) {
      const updated = { ...selected, ...patch };
      this.selectedChannel.set(updated);
      this.selectedChannelChange.emit(updated);
    }
    this.cdr.markForCheck();
  }

  handleConversationSelect(conversation: DmConversation) {
    this.selectedConversation.set(conversation);
    this.selectedConversationChange.emit(conversation);
  }

  onServerChange(server: Server) {
    this.selectedServer.set(server);
    this.selectedServerChange.emit(server);
    this.selectedConversation.set(null);
    this.selectedConversationChange.emit(null);
    this.loadChannelsForServer(server);
    if (!server?.serverId || server.serverId === 'home') {
      this.loadConversations();
    } else {
      this.conversations.set([]);
    }
  }

  startDirectMessage(): void {
    const username = this.dmUsername().trim();
    if (!username) {
      this.dmError.set('Enter a username');
      return;
    }

    this.dmLoading.set(true);
    this.dmError.set('');
    this.dmWebService.startConversation({ username }).pipe(take(1)).subscribe({
      next: (conversation) => {
        const existing = this.conversations().filter((c) => c.id !== conversation.id);
        this.conversations.set([conversation, ...existing]);
        this.dmUsername.set('');
        this.dmLoading.set(false);
        this.handleConversationSelect(conversation);
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.dmLoading.set(false);
        this.dmError.set(error?.error?.error || 'Could not start conversation');
        this.cdr.markForCheck();
      }
    });
  }

  private loadConversations(): void {
    this.dmWebService.listConversations().pipe(take(1)).subscribe({
      next: (conversations) => {
        this.conversations.set(conversations || []);
        this.tryOpenPendingConversation();
        this.cdr.markForCheck();
      },
      error: () => {
        this.conversations.set([]);
        this.cdr.markForCheck();
      }
    });
  }

  private tryOpenPendingConversation(): void {
    if (!this.pendingConversationId) {
      return;
    }
    const conversation = this.conversations().find(
      (c) => String(c.id) === String(this.pendingConversationId)
    );
    if (conversation) {
      this.pendingConversationId = null;
      this.handleConversationSelect(conversation);
    }
  }

  private tryOpenPendingChannel(): void {
    if (!this.pendingChannelId) {
      return;
    }
    for (const category of this.categories()) {
      const channel = category.channels?.find(
        (c) => String(c.channelId) === String(this.pendingChannelId)
      );
      if (channel) {
        this.pendingChannelId = null;
        this.handleChannelSelect(channel);
        return;
      }
    }
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
        if (this.pendingChannelId) {
          this.tryOpenPendingChannel();
          if (this.pendingChannelId) {
            const firstChannel = categories?.find((c) => c.channels?.length)?.channels?.[0] || null;
            this.selectedChannel.set(firstChannel);
            this.selectedChannelChange.emit(firstChannel);
          }
        } else {
          const firstChannel = categories?.find((c) => c.channels?.length)?.channels?.[0] || null;
          this.selectedChannel.set(firstChannel);
          this.selectedChannelChange.emit(firstChannel);
        }
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
    if (server && !this.isHomeSelected()) {
      this.showServerOverview.set(true);
    } else {
      this.alertService.warning('No Server Selected', 'Please select a server first to view its overview.');
    }
  }

  openServerSettings(): void {
    const server = this.selectedServer();
    if (server && !this.isHomeSelected()) {
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

  isHomeSelected(): boolean {
    const server = this.selectedServer();
    return !server || server.serverId === 'home';
  }

  getCurrentServerName(): string {
    if (this.isHomeSelected()) {
      return 'Direct Messages';
    }
    return this.selectedServer()?.serverName || 'Select a Server';
  }

  canViewServerOverview(): boolean {
    return !this.isHomeSelected();
  }

  canAccessServerSettings(): boolean {
    return !this.isHomeSelected();
  }

  lastMessagePreview(conversation: DmConversation): string {
    return conversation.lastMessage?.rawText || conversation.lastMessage?.text || 'No messages yet';
  }
}
