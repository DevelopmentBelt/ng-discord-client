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

@Component({
  selector: 'angcord-content',
  templateUrl: './angcord-content.component.html',
  styleUrls: ['./angcord-content.component.css'],
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
    private cdr: ChangeDetectorRef
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
