import { Injectable } from '@angular/core';
import {Message} from "../../models/message/message";
import {ServerConnectivityService} from "../server-connectivity.service";
import {Observable} from "rxjs";
import {User} from "../../models/user/user";
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class MessageWebService {
  constructor(private serverConnectivityService: ServerConnectivityService) {}

  public postMessage(user: User, msg: Message): Observable<Message> {
    return this.serverConnectivityService.sendPostReq("postMessage", {
      'postedByMemberId': user.id,
      'message': msg.text,
      'attachments': msg.attachments,
      'timestamp': moment().format("YYYY-MM-DD HH:mm:ss")
    }, {});
  }
  public getMessages(serverId: string, channelId: string, offset: number, limit: number): Observable<Message[]> {
    return this.serverConnectivityService.sendGetRequest("getMessages?serverId=" + serverId + "&channelId="
      + channelId + "&offset=" + offset + "&limit=" + limit, {});
  }
  public getLatestMessages(serverId: string, channelId: string): Observable<Message[]> {
    return this.serverConnectivityService.sendGetRequest("getMessages?serverId=" + serverId + "&channelId=" + channelId, {});
  }
  public deleteMessageById(msgId: string): Observable<Message> {
    return this.serverConnectivityService.sendDeleteRequest("deleteMessageById?messageId=" + msgId, {});
  }
  public hideMessageById(msgId: string) {}
}
