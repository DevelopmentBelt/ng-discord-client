import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  output,
  signal,
  WritableSignal,
  input,
  computed
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, take } from 'rxjs';
import { MessageWebService } from '../../../services/message-web-service/message-web.service';
import { ChannelSocketService } from '../../../services/socket-service/channel-socket.service';
import { AlertService } from '../../../services/alert-service/alert-service';
import { AuthService } from '../../../services/auth-service/auth.service';
import { PhantomCryptoService } from '../../../services/crypto/phantom-crypto.service';
import { PhantomKeyService } from '../../../services/crypto/phantom-key.service';
import { ServerWebService } from '../../../services/server-web-service/server-web.service';
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
    GifPickerComponent,
    FormsModule
  ],
  standalone: true
})
export class AngcordContentComponent implements OnInit, OnDestroy {
  server = input<Server>();
  channel = input<Channel>();
  channelUpdated = output<Channel>();

  @ViewChild('messageBox') private messageBox!: ElementRef;
  public messageList: Message[] = [] as Message[];

  showSearch = false;
  isEmojiPickerOpen: WritableSignal<boolean> = signal(false);
  isGifPickerOpen: WritableSignal<boolean> = signal(false);

  phantomPassphrase = signal('');
  phantomUnlockError = signal('');
  phantomUnlocking = signal(false);
  phantomUnlocked = signal(false);
  showPassphraseModal = signal(false);
  revealedPassphrase = signal('');

  readonly isPhantomChannel = computed(() => !!this.channel()?.isPhantom);

  private subs: Subscription = new Subscription();

  constructor(
    private webService: MessageWebService,
    private socketService: ChannelSocketService,
    private cdr: ChangeDetectorRef,
    private alertService: AlertService,
    private authService: AuthService,
    private phantomCrypto: PhantomCryptoService,
    private phantomKeys: PhantomKeyService,
    private serverWebService: ServerWebService
  ) {
    effect(() => {
      this.subs.unsubscribe();
      this.subs = new Subscription();
      const server = this.server();
      const channel = this.channel();
      const currentUser = this.authService.currentUser();
      this.messageList = [];
      this.phantomPassphrase.set('');
      this.phantomUnlockError.set('');
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

        void this.refreshPhantomUnlockState(channel);

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
      return this.phantomUnlocked()
        ? 'Phantom channel — anonymous & encrypted. Authors are never stored.'
        : 'Phantom channel locked — enter the passphrase to read and send.';
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
    if (channel.isPhantom && !this.phantomUnlocked()) {
      return 'Unlock Phantom mode to send anonymously…';
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

  togglePhantomFromHeader(): void {
    const server = this.server();
    const channel = this.channel();
    if (!server?.serverId || !channel?.channelId) {
      return;
    }

    if (channel.isPhantom) {
      this.serverWebService.disablePhantomChannel(String(server.serverId), channel.channelId).pipe(take(1)).subscribe({
        next: () => {
          const updated = { ...channel, isPhantom: false, phantomSalt: null };
          this.channelUpdated.emit(updated);
          this.phantomUnlocked.set(true);
          this.alertService.success('Phantom disabled', `#${channel.channelName} is a normal channel again.`);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.alertService.error(
            'Could not disable Phantom',
            err?.error?.message || 'Only the server owner can change this.'
          );
        }
      });
      return;
    }

    this.serverWebService.enablePhantomChannel(String(server.serverId), channel.channelId).pipe(take(1)).subscribe({
      next: (resp) => {
        const updated = {
          ...channel,
          isPhantom: true,
          phantomSalt: resp.phantomSalt
        };
        this.channelUpdated.emit(updated);
        this.revealedPassphrase.set(resp.passphrase);
        this.showPassphraseModal.set(true);
        this.phantomUnlocked.set(false);
        this.alertService.success('Phantom enabled', 'Save the passphrase — it is shown only once.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.alertService.error(
          'Could not enable Phantom',
          err?.error?.message || 'Only the server owner can enable Phantom mode.'
        );
      }
    });
  }

  closePassphraseModal(): void {
    this.showPassphraseModal.set(false);
    this.revealedPassphrase.set('');
  }

  copyRevealedPassphrase(): void {
    const value = this.revealedPassphrase();
    if (!value || !navigator?.clipboard) {
      return;
    }
    void navigator.clipboard.writeText(value);
    this.alertService.success('Copied', 'Phantom passphrase copied to clipboard.');
  }

  unlockPhantom(): void {
    const server = this.server();
    const channel = this.channel();
    const passphrase = this.phantomPassphrase().trim();
    if (!server?.serverId || !channel?.channelId || !passphrase) {
      this.phantomUnlockError.set('Enter the Phantom passphrase');
      return;
    }

    this.phantomUnlocking.set(true);
    this.phantomUnlockError.set('');

    this.serverWebService
      .verifyPhantomChannel(String(server.serverId), channel.channelId, passphrase)
      .pipe(take(1))
      .subscribe({
        next: async (resp) => {
          try {
            const salt = resp.phantomSalt || channel.phantomSalt;
            if (!salt) {
              throw new Error('Missing phantom salt');
            }
            await this.phantomKeys.unlock(channel.channelId, passphrase, salt);
            this.phantomUnlocked.set(true);
            this.phantomPassphrase.set('');
            // Re-decrypt history now that we have the key
            const refreshed = await Promise.all(
              this.messageList.map((m) => this.normalizeIncomingMessage(m, channel))
            );
            this.messageList = refreshed;
            this.alertService.success('Phantom unlocked', 'You can now read and send anonymous encrypted messages.');
          } catch {
            this.phantomUnlockError.set('Could not derive decryption key');
          } finally {
            this.phantomUnlocking.set(false);
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          this.phantomUnlocking.set(false);
          this.phantomUnlockError.set(err?.error?.message || 'Incorrect Phantom passphrase');
          this.cdr.detectChanges();
        }
      });
  }

  public async postMessage(textRaw: string) {
    const currentUser = this.authService.currentUser();
    const channel = this.channel();
    if (!currentUser || !channel?.channelId) {
      this.alertService.warning('Not signed in', 'Please log in to send messages.');
      return;
    }

    const plain = (textRaw || '').trim();
    if (!plain) {
      return;
    }

    const isPhantom = !!channel.isPhantom;
    if (isPhantom && !this.phantomUnlocked()) {
      this.alertService.warning('Phantom locked', 'Unlock this channel with the passphrase first.');
      return;
    }

    let outboundText = plain;
    if (isPhantom) {
      const key = await this.phantomKeys.getKey(channel.channelId);
      if (!key) {
        this.alertService.warning('Phantom locked', 'Unlock this channel with the passphrase first.');
        this.phantomUnlocked.set(false);
        return;
      }
      outboundText = await this.phantomCrypto.encrypt(plain, key);
    }

    const author: Author = isPhantom
      ? { userId: 0, username: 'Anonymous', profilePic: '' }
      : {
          userId: currentUser.id,
          username: currentUser.username,
          profilePic: currentUser.userPic || ''
        };

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
      isAnonymous: isPhantom,
      isEncrypted: isPhantom,
      author
    };

    // WS payload must not leak real identity or plaintext for phantom channels
    const socketPayload: Message = {
      ...msg,
      text: isPhantom ? outboundText : plain,
      rawText: outboundText,
      author
    };

    this.webService
      .postMessage(currentUser, channel.channelId + '', msg, {
        anonymous: isPhantom,
        encrypted: isPhantom
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
  }

  private async refreshPhantomUnlockState(channel: Channel): Promise<void> {
    if (!channel.isPhantom) {
      this.phantomUnlocked.set(true);
      return;
    }
    const key = await this.phantomKeys.getKey(channel.channelId);
    this.phantomUnlocked.set(!!key);
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
        copy.text = '🔒 Encrypted phantom message — unlock to read';
        copy.decryptFailed = true;
      }
    } else {
      copy.text = copy.text || copy.rawText || '';
    }

    return copy;
  }
}
