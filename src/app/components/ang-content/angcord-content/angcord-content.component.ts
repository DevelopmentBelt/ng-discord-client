import {
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component, effect,
  ElementRef,
  input,
  Input,
  InputSignal, OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {Author, Mention, Message} from "../../../models/message/message";
import * as moment from "moment";
import {MessageWebService} from "../../../services/message-web-service/message-web.service";
import {User} from "../../../models/user/user";
import {DatetimeFormatterPipe} from "../../../pipes/datetimeFormatter/datetime-formatter.pipe";
import {Subscription, take} from "rxjs";
import {ChannelSocketService} from "../../../services/socket-service/channel-socket.service";
import {Channel} from "../../../models/channel/channel";
import {Server} from "../../../models/server/server";
import {AlertService} from "../../../services/alert-service/alert-service";

@Component({
  selector: 'angcord-content',
  templateUrl: './angcord-content.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatetimeFormatterPipe
  ],
  standalone: true
})
export class AngcordContentComponent implements OnInit, OnDestroy {
  server: InputSignal<Server> = input(); // TODO Get rid of 1
  channel: InputSignal<Channel> = input(); // TODO Get rid of 1

  @ViewChild('messageBox') private messageBox!: ElementRef;
  public messageList: Message[] = [] as Message[];

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
    const channelName = this.channel()?.channelName || 'general';
    console.log(`Opening search for #${channelName}`);
    
    // TODO: Implement search modal/overlay
    // This could open a search overlay similar to Discord's Ctrl+K functionality
    this.alertService.featureComingSoon(`Search in #${channelName}`);
  }

  /**
   * Open inbox/messages functionality
   */
  openInbox(): void {
    console.log('Opening inbox');
    
    // TODO: Implement inbox modal/overlay
    // This could show direct messages, mentions, etc.
    this.alertService.featureComingSoon('Inbox');
  }

  /**
   * Open help and support functionality
   */
  openHelp(): void {
    console.log('Opening help');
    
    // TODO: Implement help modal/overlay
    // This could show help documentation, keyboard shortcuts, etc.
    this.alertService.featureComingSoon('Help and Support');
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

  /**
   * Open emoji picker functionality
   */
  openEmojiPicker(): void {
    console.log('Opening emoji picker');
    
    // TODO: Implement emoji picker modal/overlay
    // This could show a grid of emojis organized by category
    this.alertService.featureComingSoon('Emoji Picker');
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
