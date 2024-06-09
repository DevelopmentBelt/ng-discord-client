import {ChangeDetectionStrategy, Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import {Author, Mention, Message} from "../../../models/message/message";
import * as moment from "moment";
import {MessageWebService} from "../../../services/message-web-service/message-web.service";
import {User} from "../../../models/user/user";

@Component({
  selector: 'angcord-content',
  templateUrl: './angcord-content.component.html',
  styleUrls: ['./angcord-content.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AngcordContentComponent implements OnInit {
  @Input('serverId') serverId: string = "";
  @Input('channelId') channelId: string = "";

  @ViewChild('messageBox') private messageBox!: ElementRef;
  public messageList: Message[] = [] as Message[];

  constructor(private webService: MessageWebService) {}

  ngOnInit(): void {
    // TODO Need to get the latest messages from the web service
    this.webService.getLatestMessages(this.serverId, this.channelId).subscribe((resp) => {});
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
    if (this.webService.postMessage(user, msg))
      this.messageList.push(msg);
  }
}
