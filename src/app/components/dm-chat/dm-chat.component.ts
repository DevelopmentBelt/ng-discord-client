import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, take } from 'rxjs';
import * as moment from 'moment';
import { DmConversation } from '../../models/dm/dm-conversation';
import { Message } from '../../models/message/message';
import { DmWebService } from '../../services/dm-web-service/dm-web.service';
import { DmSocketService } from '../../services/socket-service/dm-socket.service';
import { AuthService } from '../../services/auth-service/auth.service';
import { DatetimeFormatterPipe } from '../../pipes/datetimeFormatter/datetime-formatter.pipe';
import { DmCryptoService } from '../../services/crypto/dm-crypto.service';

@Component({
  selector: 'app-dm-chat',
  standalone: true,
  imports: [FormsModule, DatetimeFormatterPipe],
  templateUrl: './dm-chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DmChatComponent implements OnDestroy {
  conversation = input<DmConversation | null>(null);

  @ViewChild('messageBox') private messageBox!: ElementRef<HTMLInputElement>;

  messages = signal<Message[]>([]);
  draft = signal('');
  isLoading = signal(false);
  sendError = signal('');
  /** M1: indicates whether E2EE key is ready for this conversation */
  e2eeReady = signal(false);
  /** H4: TOFU warning for this conversation, if the peer's key changed */
  tofuWarning = signal<string | null>(null);

  private subs = new Subscription();

  constructor(
    private dmWebService: DmWebService,
    private dmSocketService: DmSocketService,
    private authService: AuthService,
    private dmCrypto: DmCryptoService,
    private cdr: ChangeDetectorRef
  ) {
    effect(() => {
      const conversation = this.conversation();
      this.subs.unsubscribe();
      this.subs = new Subscription();
      this.messages.set([]);
      this.sendError.set('');
      this.draft.set('');
      this.e2eeReady.set(false);
      this.tofuWarning.set(null);

      if (!conversation?.id) {
        this.dmSocketService.disconnect();
        this.isLoading.set(false);
        this.cdr.markForCheck();
        return;
      }

      this.isLoading.set(true);
      this.dmSocketService.connect(conversation.id);

      // M1: ensure E2EE key is ready before loading messages
      this.dmCrypto.ensureKey(conversation).then(key => {
        this.e2eeReady.set(!!key);
        // H4: surface any TOFU warning for this conversation
        const warning = this.dmCrypto.tofuWarnings.get(conversation.id) ?? null;
        this.tofuWarning.set(warning);
        this.cdr.markForCheck();
      }).catch(() => {
        this.e2eeReady.set(false);
      });

      this.subs.add(
        this.dmWebService.getMessages(conversation.id).subscribe({
          next: async (msgs) => {
            const normalized = await Promise.all(
              (msgs || []).map((m) => this.normalizeAndDecrypt(m, conversation.id))
            );
            this.messages.set(normalized);
            this.isLoading.set(false);
            this.cdr.markForCheck();
          },
          error: () => {
            this.isLoading.set(false);
            this.sendError.set('Failed to load messages');
            this.cdr.markForCheck();
          }
        })
      );

      this.subs.add(
        this.dmSocketService.onMessage().subscribe((event) => {
          (async () => {
            try {
              const raw = JSON.parse(event.data);
              const message = await this.normalizeAndDecrypt(raw, conversation.id);
              if (message.conversationId && String(message.conversationId) !== String(conversation.id)) {
                return;
              }
              if (this.messages().some((existing) => existing.id === message.id)) {
                return;
              }
              this.messages.set([...this.messages(), message]);
              this.cdr.markForCheck();
            } catch {
              // ignore malformed payloads
            }
          })();
        })
      );
    }, { allowSignalWrites: true });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.dmSocketService.disconnect();
  }

  participantName(): string {
    return this.conversation()?.participant?.username || 'Direct Message';
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.send();
    }
  }

  send(): void {
    const conversation = this.conversation();
    const text = this.draft().trim();
    const currentUser = this.authService.currentUser();
    if (!conversation?.id || !text || !currentUser) {
      return;
    }

    this.sendError.set('');

    // M1: encrypt before sending if E2EE key is available
    const convId = conversation.id;
    const sendPlaintext = (payload: string) => {
      this.dmWebService.postMessage(convId, payload).pipe(take(1)).subscribe({
        next: async (saved) => {
          const message = await this.normalizeAndDecrypt({
            ...saved,
            conversationId: convId,
            author: saved.author || {
              userId: currentUser.id,
              username: currentUser.username,
              profilePic: currentUser.userPic || ''
            }
          }, convId);
          this.messages.set([...this.messages(), message]);
          this.dmSocketService.sendMessage(message);
          this.draft.set('');
          if (this.messageBox?.nativeElement) {
            this.messageBox.nativeElement.value = '';
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.sendError.set(error?.error?.error || 'Failed to send message');
          this.cdr.markForCheck();
        }
      });
    };

    if (this.e2eeReady()) {
      this.dmCrypto.encryptMessage(convId, text)
        .then(ciphertext => sendPlaintext(ciphertext))
        .catch(() => sendPlaintext(text));  // fallback to plaintext if encryption fails
    } else {
      sendPlaintext(text);
    }
  }

  /** M1: normalize a raw server message object and decrypt its text if it is a DM ciphertext. */
  private async normalizeAndDecrypt(message: any, convId: string): Promise<Message> {
    const rawText = message.rawText || message.text || '';
    const displayText = this.dmCrypto.isCiphertext(rawText)
      ? await this.dmCrypto.decryptMessage(convId, rawText)
      : rawText;
    return {
      id: String(message.id ?? Date.now()),
      text: displayText,
      rawText,
      mentions: message.mentions || [],
      attachments: message.attachments || [],
      postedTimestamp: moment(message.postedTimestamp),
      edited: !!message.edited,
      editTimestamp: moment(message.editTimestamp || message.postedTimestamp),
      author: {
        userId: message.author?.userId,
        username: message.author?.username || 'Unknown',
        profilePic: message.author?.profilePic || message.author?.userPic || ''
      },
      conversationId: message.conversationId
    };
  }
}
