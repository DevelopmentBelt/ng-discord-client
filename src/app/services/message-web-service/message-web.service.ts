import { Injectable } from '@angular/core';
import {Message} from "../../models/message/message";

@Injectable({
  providedIn: 'root'
})
export class MessageWebService {
  constructor() {}

  public postMessage(msg: Message): boolean {
    return true;
  }
  public getMessages(serverId: string, channelId: string, offset: number, limit: number): Array<Message> {
    // TODO Get them via call
    return new Array<Message>();
  }
  public deleteMessageById(msgId: string) {}
  public hideMessageById(msgId: string) {}
}
