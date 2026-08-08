import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  signal,
  WritableSignal,
  input,
  computed
} from '@angular/core';
import { Subscription, take } from 'rxjs';
import { MessageWebService } from '../../../services/message-web-service/message-web.service';
import { ChannelSocketService } from '../../../services/socket-service/channel-socket.service';
import { AlertService } from '../../../services/alert-service/alert-service';
import { AuthService } from '../../../services/auth-service/auth.service';
import { PhantomCryptoService } from '../../../services/crypto/phantom-crypto.service';
import { PhantomKeyService } from '../../../services/crypto/phantom-key.service';
import { Message, Author, Mention } from '../../../models/message/message';
import { Server } from '../../../models/server/server';
import { Channel } from '../../../models/channel/channel';
import { DatetimeFormatterPipe } from '../../../pipes/datetimeFormatter/datetime-formatter.pipe';
import { SearchComponent } from '../../search/search.component';
import { EmojiPickerComponent, Emoji } from '../../emoji-picker/emoji-picker.component';
import { GifPickerComponent, GifResult } from '../../gif-picker/gif-picker.component';
import * as moment from 'moment';

@Component({
  selector: 'angcord-content',
  templateUrl: './angcord-content.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatetimeFormatterPipe,
    SearchComponent,
    EmojiPickerComponent,
    GifPickerComponent
  ],
  standalone: true
})
export class AngcordContentComponent implements OnInit, OnDestroy {
  server = input<Server>();
  channel = input<Channel>();

  @ViewChild('messageBox') private messageBox!: ElementRef;
  public messageList: Message[] = [] as Message[];

  showSearch = false;
  isEmojiPickerOpen: WritableSignal<boolean> = signal(false);
  isGifPickerOpen: WritableSignal<boolean> = signal(false);
  phantomReady = signal(false);
  phantomLoading = signal(false);

  readonly isPhantomChannel = computed(() => !!this.channel()?.isPhantom);

  private subs: Subscription = new Subscription();

  constructor(
    private webService: MessageWebService,
    private socketService: ChannelSocketService,
    private cdr: ChangeDetectorRef,
    private alertService: AlertService,
    private authService: AuthService,
    private phantomCrypto: PhantomCryptoService,
    private phantomKeys: PhantomKeyService
  ) {
    effect(() => {
      this.subs.unsubscribe();
      this.subs = new Subscription();
      const server = this.server();
      const channel = this.channel();
      const currentUser = this.authService.currentUser();
      this.messageList = [];
      this.phantomReady.set(false);
      this.phantomLoading.set(false);
      if (this.messageBox?.nativeElement) {
        this.messageBox.nativeElement.value = '';
      }
      cdr.detectChanges();

      if (server?.serverId && channel?.channelId) {
        const serverId = server.serverId + '';
        const channelId = channel.channelId + '';
        const requestKey = `${serverId}:${channelId}`;
        this.socketService.setChannelId(channelId);
        if (currentUser?.id) {
          this.socketService.setUserId(currentUser.id);
        }

        void this.preparePhantomChannel(server, channel).then(() => {
          if (`${this.server()?.serverId}:${this.channel()?.channelId}` !== requestKey) {
            return;
          }
          this.subs.add(
            this.webService.getLatestMessages(serverId, channelId).subscribe(async (resp) => {
              if (`${this.server()?.serverId}:${this.channel()?.channelId}` !== requestKey) {
                return;
              }
              const normalized = await Promise.all(
                (resp || []).map((m) => this.normalizeIncomingMessage(m, channel))
              );
              this.messageList = normalized;
              cdr.detectChanges();
            })
          );
          this.subs.add(
            this.socketService.onMessage().subscribe(async (msg) => {
              const message = JSON.parse(msg.data) as Message;
              if (message.channelId != null && message.channelId + '' !== channelId) {
                return;
              }
              const normalized = await this.normalizeIncomingMessage(message, channel);
              this.messageList = [...this.messageList, normalized];
              cdr.detectChanges();
            })
          );
        });
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  getChannelDescription(): string {
    const channel = this.channel();
    if (!channel) return 'Select a channel';

    if (channel.isPhantom) {
      if (this.phantomLoading()) {
        return 'Phantom channel — loading E2EE key…';
      }
      if (!this.phantomReady()) {
        return 'Phantom channel — waiting for an E2EE key share from a member.';
      }
      const ttl = channel.ephemeralTtlSeconds || 0;
      return ttl > 0
        ? `Phantom E2EE — anonymous, client-held keys, messages expire after ${ttl}s.`
        : 'Phantom E2EE — anonymous & encrypted with client-held keys. Authors are never stored.';
    }

    if (channel.channelName?.toLowerCase().includes('general')) {
      return 'General discussion';
    } else if (channel.channelName?.toLowerCase().includes('help')) {
      return 'Get help and support';
    } else if (channel.channelName?.toLowerCase().includes('announcements')) {
      return 'Important announcements';
    }
    return 'Channel discussion';
  }

  getMessagePlaceholder(): string {
    const channel = this.channel();
    if (!channel?.channelName) {
      return 'Select a channel to send a message';
    }
    if (channel.isPhantom && this.phantomLoading()) {
      return 'Loading Phantom key…';
    }
    if (channel.isPhantom && !this.phantomReady()) {
      return 'Phantom key unavailable…';
    }
    if (channel.isPhantom) {
      return `Send anonymously in #${channel.channelName}`;
    }
    return `Message #${channel.channelName}`;
  }

  openSearch(): void {
    this.showSearch = true;
    this.cdr.detectChanges();
  }

  closeSearch(): void {
    this.showSearch = false;
    this.cdr.detectChanges();
  }

  onMessageSelected(message: Message): void {
    this.alertService.info('Message Selected', 'Message selected from search results');
  }

  uploadFile(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt';

    fileInput.onchange = (event: any) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        this.alertService.info(
          'File Upload',
          `${files.length} file(s) selected. File upload functionality is coming soon!`
        );
      }
    };

    fileInput.click();
  }

  openEmojiPicker(): void {
    this.isEmojiPickerOpen.set(true);
  }

  onCloseEmojiPicker(): void {
    this.isEmojiPickerOpen.set(false);
  }

  onEmojiSelected(emoji: Emoji): void {
    if (this.messageBox?.nativeElement) {
      this.messageBox.nativeElement.value += emoji.char;
      this.messageBox.nativeElement.focus();
      this.cdr.detectChanges();
    }
  }

  openGifPicker(): void {
    this.isGifPickerOpen.set(true);
  }

  onCloseGifPicker(): void {
    this.isGifPickerOpen.set(false);
  }

  onGifSelected(gif: GifResult): void {
    if (this.messageBox?.nativeElement) {
      this.messageBox.nativeElement.value += ` [GIF: ${gif.title}]`;
      this.messageBox.nativeElement.focus();
      this.cdr.detectChanges();
    }
  }

  public handleKeyDownEvent($event: KeyboardEvent) {
    if ($event.key.toUpperCase() === 'ENTER' && this.messageBox?.nativeElement) {
      void this.postMessage(this.messageBox.nativeElement.value);
      this.messageBox.nativeElement.value = '';
    }
  }

  public async postMessage(textRaw: string) {
    const currentUser = this.authService.currentUser();
    const channel = this.channel();
    const server = this.server();
    if (!currentUser || !channel?.channelId) {
      this.alertService.warning('Not signed in', 'Please log in to send messages.');
      return;
    }

    const plain = (textRaw || '').trim();
    if (!plain) {
      return;
    }

    const isPhantom = !!channel.isPhantom;
    if (isPhantom) {
      let key = await this.phantomKeys.getKey(channel.channelId);
      if (!key && server?.serverId) {
        key = await this.phantomKeys.ensureKey(server.serverId, channel.channelId);
      }
      if (!key) {
        this.alertService.warning('Phantom unavailable', 'Could not load this channel encryption key.');
        this.phantomReady.set(false);
        return;
      }

      const outboundText = await this.phantomCrypto.encrypt(plain, key);
      const author: Author = { userId: 0, username: 'Anonymous', profilePic: '' };
      const msg: Message = {
        id: 'pending',
        text: plain,
        rawText: outboundText,
        mentions: {} as Mention[],
        postedTimestamp: moment(),
        edited: false,
        editTimestamp: moment(),
        attachments: [],
        channelId: channel.channelId,
        isAnonymous: true,
        isEncrypted: true,
        author
      };

      const socketPayload: Message = {
        ...msg,
        text: outboundText,
        rawText: outboundText,
        author
      };

      this.webService
        .postMessage(currentUser, channel.channelId + '', msg, {
          anonymous: true,
          encrypted: true
        })
        .pipe(take(1))
        .subscribe({
          next: () => this.socketService.sendMessage(socketPayload),
          error: (err) =>
            this.alertService.warning(
              'Send failed',
              err?.error?.message || 'Could not send your message.'
            )
        });
      return;
    }

    const author: Author = {
      userId: currentUser.id,
      username: currentUser.username,
      profilePic: currentUser.userPic || ''
    };

    const msg: Message = {
      id: 'pending',
      text: plain,
      rawText: plain,
      mentions: {} as Mention[],
      postedTimestamp: moment(),
      edited: false,
      editTimestamp: moment(),
      attachments: [],
      channelId: channel.channelId,
      isAnonymous: false,
      isEncrypted: false,
      author
    };

    this.webService
      .postMessage(currentUser, channel.channelId + '', msg, {
        anonymous: false,
        encrypted: false
      })
      .pipe(take(1))
      .subscribe({
        next: () => this.socketService.sendMessage(msg),
        error: (err) =>
          this.alertService.warning(
            'Send failed',
            err?.error?.message || 'Could not send your message.'
          )
      });
  }

  private async preparePhantomChannel(server: Server, channel: Channel): Promise<void> {
    if (!channel.isPhantom) {
      this.phantomReady.set(true);
      this.phantomLoading.set(false);
      this.cdr.detectChanges();
      return;
    }

    this.phantomLoading.set(true);
    this.phantomReady.set(false);
    this.cdr.detectChanges();

    const key = await this.phantomKeys.ensureKey(server.serverId, channel.channelId);
    if (key) {
      // Forward secrecy for membership: wrap channel key for members missing a share
      void this.phantomKeys.syncShares(server.serverId, channel.channelId);
    }
    this.phantomReady.set(!!key);
    this.phantomLoading.set(false);
    this.cdr.detectChanges();
  }

  private async normalizeIncomingMessage(message: Message, channel: Channel): Promise<Message> {
    const copy: Message = {
      ...message,
      postedTimestamp: moment(message.postedTimestamp),
      editTimestamp: moment(message.editTimestamp || message.postedTimestamp),
      isAnonymous: !!message.isAnonymous || message.author?.username === 'Anonymous',
      isEncrypted:
        !!message.isEncrypted || this.phantomCrypto.isCiphertext(message.rawText || message.text || '')
    };

    if (copy.isAnonymous) {
      copy.author = { userId: 0, username: 'Anonymous', profilePic: '' };
    }

    const ciphertext = copy.rawText || copy.text || '';
    if (copy.isEncrypted && this.phantomCrypto.isCiphertext(ciphertext)) {
      const key = channel.isPhantom ? await this.phantomKeys.getKey(channel.channelId) : null;
      if (key) {
        try {
          const plain = await this.phantomCrypto.decrypt(ciphertext, key);
          copy.text = plain;
          copy.decryptFailed = false;
        } catch {
          copy.text = '🔒 Encrypted message (wrong key)';
          copy.decryptFailed = true;
        }
      } else {
        copy.text = '🔒 Encrypted phantom message';
        copy.decryptFailed = true;
      }
    } else {
      copy.text = copy.text || copy.rawText || '';
    }

    return copy;
  }
}
