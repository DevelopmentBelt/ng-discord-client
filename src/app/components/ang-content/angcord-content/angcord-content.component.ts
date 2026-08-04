import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, InputSignal, OnInit, OnDestroy, ViewChild, effect, inject, signal, WritableSignal, input} from '@angular/core';
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {Subscription, take} from "rxjs";
import {MessageWebService} from "../../../services/message-web-service/message-web.service";
import {ChannelSocketService} from "../../../services/socket-service/channel-socket.service";
import {AlertService} from "../../../services/alert-service/alert-service";
import {AuthService} from "../../../services/auth-service/auth.service";
import {Message, Author, Mention} from "../../../models/message/message";
import {Server} from "../../../models/server/server";
import {Channel} from "../../../models/channel/channel";
import {User} from "../../../models/user/user";
import {DatetimeFormatterPipe} from "../../../pipes/datetimeFormatter/datetime-formatter.pipe";
import {SearchComponent} from "../../search/search.component";
import {EmojiPickerComponent, Emoji} from "../../emoji-picker/emoji-picker.component";
import {GifPickerComponent, GifResult} from "../../gif-picker/gif-picker.component";
import * as moment from "moment";

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
  server = input<Server>(); // TODO Get rid of 1
  channel = input<Channel>(); // TODO Get rid of 1

  @ViewChild('messageBox') private messageBox!: ElementRef;
  public messageList: Message[] = [] as Message[];
  
  // Search state
  showSearch: boolean = false;

  // Emoji picker state
  isEmojiPickerOpen: WritableSignal<boolean> = signal(false);

  // GIF picker state
  isGifPickerOpen: WritableSignal<boolean> = signal(false);

  private subs: Subscription = new Subscription();

  constructor(
    private webService: MessageWebService,
    private socketService: ChannelSocketService,
    private cdr: ChangeDetectorRef,
    private alertService: AlertService,
    private authService: AuthService
  ) {
    effect(() => {
      this.subs.unsubscribe();
      this.subs = new Subscription();
      const server = this.server();
      const channel = this.channel();
      const currentUser = this.authService.currentUser();
      this.messageList = [];
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

        this.subs.add(
          this.webService.getLatestMessages(serverId, channelId).subscribe((resp) => {
            // Ignore stale responses if the user already switched away
            if (`${this.server()?.serverId}:${this.channel()?.channelId}` !== requestKey) {
              return;
            }
            (resp || []).forEach((m) => {
              m.postedTimestamp = moment(m.postedTimestamp);
              m.editTimestamp = moment(m.editTimestamp);
            });
            this.messageList = resp || [];
            cdr.detectChanges();
          })
        );
        this.subs.add(
          this.socketService.onMessage().subscribe((msg) => {
            const message = JSON.parse(msg.data) as Message;
            if (message.channelId != null && message.channelId + '' !== channelId) {
              return;
            }
            message.editTimestamp = moment(message.editTimestamp);
            message.postedTimestamp = moment(message.postedTimestamp);
            this.messageList = [...this.messageList, message];
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

  /**
   * Get channel description based on channel type and settings
   */
  getChannelDescription(): string {
    const channel = this.channel();
    if (!channel) return 'Select a channel';

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
    const channelName = this.channel()?.channelName;
    return channelName ? `Message #${channelName}` : 'Select a channel to send a message';
  }

  /**
   * Open search functionality for the current channel
   */
  openSearch(): void {
    this.showSearch = true;
    this.cdr.detectChanges();
  }

  /**
   * Close search functionality
   */
  closeSearch(): void {
    this.showSearch = false;
    this.cdr.detectChanges();
  }

  /**
   * Handle message selection from search results
   */
  onMessageSelected(message: Message): void {
    // TODO: Navigate to the selected message in the chat
    // This could scroll to the message or highlight it
    console.log('Message selected from search:', message);
    this.alertService.info('Message Selected', 'Message selected from search results');
  }

  /**
   * Handle file upload functionality
   */
  uploadFile(): void {
    console.log('Opening file upload');
    
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt';
    
    fileInput.onchange = (event: any) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        console.log(`Selected ${files.length} file(s):`, files);
        
        // TODO: Implement actual file upload to server
        // This would typically involve:
        // 1. File validation (size, type, etc.)
        // 2. Upload to file storage service
        // 3. Send message with file attachment
        // 4. Update UI to show upload progress
        
        this.alertService.info(
          'File Upload',
          `${files.length} file(s) selected. File upload functionality is coming soon!`
        );
      }
    };
    
    fileInput.click();
  }

  openEmojiPicker(): void {
    console.log('🎯 Opening emoji picker...');
    this.isEmojiPickerOpen.set(true);
  }

  onCloseEmojiPicker(): void {
    console.log('🔒 Closing emoji picker...');
    this.isEmojiPickerOpen.set(false);
  }

  onEmojiSelected(emoji: Emoji): void {
    console.log('✅ Emoji selected:', emoji);
    // Add the emoji to the message input
    if (this.messageBox && this.messageBox.nativeElement) {
      const currentValue = this.messageBox.nativeElement.value;
      const newValue = currentValue + emoji.char;
      this.messageBox.nativeElement.value = newValue;
      
      // Focus back to the input
      this.messageBox.nativeElement.focus();
      
      // Trigger change detection
      this.cdr.detectChanges();
    }
    
    // Don't close the emoji picker - keep it open for multiple selections
    // this.isEmojiPickerOpen.set(false);
  }

  openGifPicker(): void {
    console.log('🎬 Opening GIF picker...');
    this.isGifPickerOpen.set(true);
  }

  onCloseGifPicker(): void {
    console.log('🔒 Closing GIF picker...');
    this.isGifPickerOpen.set(false);
  }

  onGifSelected(gif: GifResult): void {
    console.log('✅ GIF selected:', gif);
    // Add the GIF to the message input (you might want to handle this differently)
    if (this.messageBox && this.messageBox.nativeElement) {
      const currentValue = this.messageBox.nativeElement.value;
      const newValue = currentValue + ` [GIF: ${gif.title}]`;
      this.messageBox.nativeElement.value = newValue;
      
      // Focus back to the input
      this.messageBox.nativeElement.focus();
      
      // Trigger change detection
      this.cdr.detectChanges();
    }
    
    // Don't close the GIF picker - keep it open for multiple selections
    // this.isGifPickerOpen.set(false);
  }

  public handleKeyDownEvent($event: KeyboardEvent) {
    if ($event.key.toUpperCase() == 'ENTER' && this.messageBox.nativeElement != undefined) {
      this.postMessage(this.messageBox.nativeElement.value);
      this.messageBox.nativeElement.value = '';
    }
  }

  public postMessage(textRaw: string) {
    const currentUser = this.authService.currentUser();
    if (!currentUser || !this.channel()?.channelId) {
      this.alertService.warning('Not signed in', 'Please log in to send messages.');
      return;
    }

    const msg: Message = {
      id: 'pending',
      text: textRaw,
      rawText: textRaw,
      mentions: {} as Mention[],
      postedTimestamp: moment(),
      edited: false,
      editTimestamp: moment(),
      attachments: [],
      channelId: this.channel()?.channelId,
      author: {
        userId: currentUser.id,
        username: currentUser.username,
        profilePic: currentUser.userPic || ''
      } as Author
    };

    this.webService.postMessage(currentUser, this.channel().channelId + '', msg).pipe(take(1)).subscribe({
      next: () => this.socketService.sendMessage(msg),
      error: () => this.alertService.warning('Send failed', 'Could not send your message.')
    });
  }
}
