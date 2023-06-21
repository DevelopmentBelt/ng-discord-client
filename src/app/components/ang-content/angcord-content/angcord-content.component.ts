import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {Author, Mention, Message} from "../../../models/message/message";
import * as moment from "moment";

@Component({
  selector: 'angcord-content',
  templateUrl: './angcord-content.component.html',
  styleUrls: ['./angcord-content.component.css']
})
export class AngcordContentComponent implements OnInit {
  @ViewChild('messageBox') private messageBox!: ElementRef;
  public messageList: Message[] = [] as Message[];

  constructor() {}

  ngOnInit(): void {
    // TODO Need to get the latest messages from the web service
  }

  public handleKeyDownEvent($event: KeyboardEvent) {
    if ($event.key.toUpperCase() == 'ENTER' && this.messageBox.nativeElement != undefined) {
      this.postMessage(this.messageBox.nativeElement.value);
      this.messageBox.nativeElement.value = '';
    }
  }

  public postMessage(textRaw: string) {
    const msg: Message = {
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
    this.messageList.push(msg);
    // TODO We need to post this to the web service
  }
}
