import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
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
import { ServerSettingsModalComponent, ServerChannel } from '../../server-settings-modal/server-settings-modal.component';
import { ChannelManagementModalComponent } from '../../channel-management-modal/channel-management-modal.component';
import { ServerWebService } from '../../../services/server-web-service/server-web.service';
import { DmWebService } from '../../../services/dm-web-service/dm-web.service';
import { InboxService } from '../../../services/inbox-service/inbox.service';
import { PhantomKeyService } from '../../../services/crypto/phantom-key.service';
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
    ServerSettingsModalComponent,
    ChannelManagementModalComponent
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
  showChannelModal = signal(false);
  isEditingChannel = signal(false);
  channelModalTarget = signal<Channel | null>(null);
  defaultCategoryId = signal<number | null>(null);
  channelModalSaving = signal(false);
  dmUsername = signal('');
  dmError = signal('');
  dmLoading = signal(false);
  private pendingConversationId: string | null = null;
  private pendingChannelId: string | null = null;

  readonly categoryOptions = computed<ServerChannel[]>(() =>
    this.categories().map((category) => ({
      id: category.categoryId,
      name: category.categoryName,
      type: 'category' as const,
      position: 0,
      nsfw: false
    }))
  );

  readonly channelModalModel = computed<ServerChannel | null>(() => {
    const channel = this.channelModalTarget();
    if (!channel) {
      return null;
    }
    return {
      id: channel.channelId,
      name: channel.channelName,
      type: channel.type || 'text',
      position: channel.position || 0,
      parentId: String(channel.categoryId),
      categoryId: channel.categoryId,
      topic: channel.topic,
      nsfw: !!channel.nsfw,
      isPhantom: !!channel.isPhantom
    };
  });

  servers: InputSignal<Server[]> = input([]);

  constructor(
    private alertService: AlertService,
    private serverWebService: ServerWebService,
    private dmWebService: DmWebService,
    private inboxService: InboxService,
    private phantomKeys: PhantomKeyService,
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

  openCreateChannel(category: Category, event?: Event): void {
    event?.stopPropagation();
    const server = this.selectedServer();
    if (!server?.serverId || server.serverId === 'home') {
      return;
    }
    this.channelModalTarget.set(null);
    this.isEditingChannel.set(false);
    this.defaultCategoryId.set(category.categoryId);
    this.showChannelModal.set(true);
    this.cdr.markForCheck();
  }

  openChannelSettings(chan: Channel, event?: Event): void {
    event?.stopPropagation();
    const server = this.selectedServer();
    if (!server?.serverId || server.serverId === 'home') {
      return;
    }
    this.channelModalTarget.set(chan);
    this.isEditingChannel.set(true);
    this.defaultCategoryId.set(chan.categoryId);
    this.showChannelModal.set(true);
    this.cdr.markForCheck();
  }

  closeChannelModal(): void {
    this.showChannelModal.set(false);
    this.channelModalTarget.set(null);
    this.isEditingChannel.set(false);
    this.defaultCategoryId.set(null);
    this.channelModalSaving.set(false);
    this.cdr.markForCheck();
  }

  saveChannelFromModal(channelData: Partial<ServerChannel>): void {
    const server = this.selectedServer();
    if (!server?.serverId || server.serverId === 'home' || this.channelModalSaving()) {
      return;
    }

    const payload: Partial<Channel> = {
      channelName: channelData.name,
      categoryId: Number(channelData.categoryId || channelData.parentId || this.defaultCategoryId() || 0),
      type: channelData.type || 'text',
      topic: channelData.topic,
      nsfw: !!channelData.nsfw,
      isPhantom: !!channelData.isPhantom,
      slowmode: channelData.slowmode,
      userLimit: channelData.userLimit,
      bitrate: channelData.bitrate
    };

    if (!payload.categoryId) {
      this.alertService.error('Missing category', 'Choose a category for this channel.');
      return;
    }

    this.channelModalSaving.set(true);
    const editing = this.isEditingChannel();
    const target = this.channelModalTarget();

    const request$ = editing && target
      ? this.serverWebService.updateChannel(String(server.serverId), target.channelId, payload)
      : this.serverWebService.createChannel(String(server.serverId), payload);

    request$.pipe(take(1)).subscribe({
      next: (resp) => {
        if (target?.channelId) {
          this.phantomKeys.clear(target.channelId);
        }
        if (resp?.channelId) {
          this.phantomKeys.clear(resp.channelId);
        }
        this.channelModalSaving.set(false);
        this.closeChannelModal();
        this.alertService.success(
          editing ? 'Channel updated' : 'Channel created',
          editing
            ? `#${payload.channelName} settings saved.`
            : `#${payload.channelName} is ready.`
        );
        this.reloadChannels(String(server.serverId), resp?.channelId || target?.channelId);
      },
      error: (err) => {
        this.channelModalSaving.set(false);
        this.alertService.error(
          editing ? 'Could not update channel' : 'Could not create channel',
          err?.error?.message || 'Only the server owner can manage channels.'
        );
        this.cdr.markForCheck();
      }
    });
  }

  private reloadChannels(serverId: string, preferChannelId?: number): void {
    this.serverWebService.getServerChannels(serverId).pipe(take(1)).subscribe({
      next: (categories) => {
        this.categories.set(categories || []);
        if (preferChannelId) {
          for (const category of categories || []) {
            const match = category.channels?.find((c) => c.channelId === preferChannelId);
            if (match) {
              this.handleChannelSelect(match);
              this.cdr.markForCheck();
              return;
            }
          }
        }
        const selected = this.selectedChannel();
        if (selected) {
          for (const category of categories || []) {
            const match = category.channels?.find((c) => c.channelId === selected.channelId);
            if (match) {
              this.handleChannelSelect(match);
              break;
            }
          }
        }
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
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
