import { Injectable } from '@angular/core';
import {Message} from "../../models/message/message";
import {ServerConnectivityService} from "../server-connectivity.service";
import {Observable} from "rxjs";
import {User} from "../../models/user/user";

@Injectable({
  providedIn: 'root'
})
export class MessageWebService {
  constructor(private serverConnectivityService: ServerConnectivityService) {}

  public postMessage(user: User, msg: Message): Observable<any> {
    return this.serverConnectivityService.sendPostReq("postMessage", {
      'userId': user.id,
      'content': msg.text
    }, {});
  }
  public getMessages(serverId: string, channelId: string, offset: number, limit: number): Observable<any> {
    return this.serverConnectivityService.sendGetRequest("getMessages?serverId=" + serverId + "&channelId="
      + channelId + "&offset=" + offset + "&limit=" + limit, {});
  }
  public getLatestMessages(serverId: string, channelId: string): Observable<any> {
    return this.serverConnectivityService.sendGetRequest("getMessages?serverId=" + serverId + "&channelId=" + channelId, {});
  }
  public deleteMessageById(msgId: string): Observable<any> {
    return this.serverConnectivityService.sendDeleteRequest("deleteMessageById?messageId=" + msgId, {});
  }
  public hideMessageById(msgId: string) {}
}
