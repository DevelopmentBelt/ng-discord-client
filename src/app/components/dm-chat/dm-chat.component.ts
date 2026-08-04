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

  private subs = new Subscription();

  constructor(
    private dmWebService: DmWebService,
    private dmSocketService: DmSocketService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    effect(() => {
      const conversation = this.conversation();
      this.subs.unsubscribe();
      this.subs = new Subscription();
      this.messages.set([]);
      this.sendError.set('');
      this.draft.set('');

      if (!conversation?.id) {
        this.dmSocketService.disconnect();
        this.isLoading.set(false);
        this.cdr.markForCheck();
        return;
      }

      this.isLoading.set(true);
      this.dmSocketService.connect(conversation.id);

      this.subs.add(
        this.dmWebService.getMessages(conversation.id).subscribe({
          next: (msgs) => {
            this.messages.set((msgs || []).map((m) => this.normalizeMessage(m)));
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
          try {
            const message = this.normalizeMessage(JSON.parse(event.data));
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
    this.dmWebService.postMessage(conversation.id, text).pipe(take(1)).subscribe({
      next: (saved) => {
        const message = this.normalizeMessage({
          ...saved,
          conversationId: conversation.id,
          author: saved.author || {
            userId: currentUser.id,
            username: currentUser.username,
            profilePic: currentUser.userPic || ''
          }
        });
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
  }

  private normalizeMessage(message: any): Message {
    return {
      id: String(message.id ?? Date.now()),
      text: message.text || message.rawText || '',
      rawText: message.rawText || message.text || '',
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
