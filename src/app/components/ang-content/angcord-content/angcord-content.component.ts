import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, InputSignal, OnInit, OnDestroy, ViewChild, effect, inject, signal, WritableSignal, input} from '@angular/core';
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {Subscription, take} from "rxjs";
import {MessageWebService} from "../../../services/message-web-service/message-web.service";
import {ChannelSocketService} from "../../../services/socket-service/channel-socket.service";
import {AlertService} from "../../../services/alert-service/alert-service";
import {Message, Author, Mention} from "../../../models/message/message";
import {Server} from "../../../models/server/server";
import {Channel} from "../../../models/channel/channel";
import {User} from "../../../models/user/user";
import {DatetimeFormatterPipe} from "../../../pipes/datetimeFormatter/datetime-formatter.pipe";
import {SearchComponent} from "../../search/search.component";
import {EmojiPickerComponent, Emoji} from "../../emoji-picker/emoji-picker.component";
import * as moment from "moment";

@Component({
  selector: 'angcord-content',
  templateUrl: './angcord-content.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatetimeFormatterPipe,
    SearchComponent,
    EmojiPickerComponent,
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

  private subs: Subscription = new Subscription();

  constructor(
    private webService: MessageWebService,
    private socketService: ChannelSocketService,
    private cdr: ChangeDetectorRef,
    private alertService: AlertService
  ) {
    effect(() => {
      this.subs.unsubscribe();
      this.subs = new Subscription();
      const server = this.server();
      const channel = this.channel();
      if (server && channel) {
        const serverId = server.serverId;
        const channelId = channel.channelId;
        this.socketService.setChannelId(channelId + "");
        this.socketService.setUserId(1);
        this.messageList = [];
        this.messageBox.nativeElement.value = '';
        // Need to get the latest messages from the web service
        this.subs.add(
          this.webService.getLatestMessages(serverId + "", channelId + "").subscribe((resp) => {
            resp.forEach((m) => {
              m.postedTimestamp = moment(m.postedTimestamp);
              m.editTimestamp = moment(m.editTimestamp);
            });
            this.messageList.push(...resp);
            cdr.detectChanges();
          })
        );
        this.subs.add(
          this.socketService.onMessage().subscribe((msg) => {
            const message = JSON.parse(msg.data) as Message;
            message.editTimestamp = moment(message.editTimestamp);
            message.postedTimestamp = moment(message.postedTimestamp);
            this.messageList.push(message);
            cdr.detectChanges();
          })
        );
        cdr.detectChanges();
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
    if (!channel) return 'General discussion';
    
    // You can customize this based on channel properties
    if (channel.channelName?.toLowerCase().includes('general')) {
      return 'General discussion';
    } else if (channel.channelName?.toLowerCase().includes('help')) {
      return 'Get help and support';
    } else if (channel.channelName?.toLowerCase().includes('announcements')) {
      return 'Important announcements';
    } else {
      return 'Channel discussion';
    }
  }

  /**
   * Get message input placeholder text
   */
  getMessagePlaceholder(): string {
    const channelName = this.channel()?.channelName || 'general';
    return `Message #${channelName}`;
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
    
    // Close the emoji picker
    this.isEmojiPickerOpen.set(false);
  }

  public handleKeyDownEvent($event: KeyboardEvent) {
    if ($event.key.toUpperCase() == 'ENTER' && this.messageBox.nativeElement != undefined) {
      this.postMessage(this.messageBox.nativeElement.value);
      this.messageBox.nativeElement.value = '';
    }
  }

  public postMessage(textRaw: string) {
    const msg: Message = {
      id: "test",
      text: textRaw,
      rawText: textRaw,
      mentions: {} as Mention[],
      postedTimestamp: moment(),
      edited: false,
      editTimestamp: moment(),
      attachments: [],
      author: {
        userId: 1,
        username: 'Badger',
        profilePic: 'https://avatars.githubusercontent.com/u/8027457?v=4'
      } as Author
    };
    const user: User = {
      id: '1',
      username: 'Badger',
      fullName: 'badger.jar',
      profilePic: ''
    } as unknown as User;
    this.webService.postMessage(user, this.channel().channelId + "", msg).pipe(take(1)).subscribe((resp) => {
      // TODO Check that the message was success, send it to everyone
      this.socketService.sendMessage(msg);
    });
  }
}
