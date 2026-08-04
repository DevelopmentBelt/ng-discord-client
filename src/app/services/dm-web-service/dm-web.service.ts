import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ServerConnectivityService } from '../server-connectivity.service';
import { DmConversation } from '../../models/dm/dm-conversation';
import { Message } from '../../models/message/message';
import { User } from '../../models/user/user';

@Injectable({
  providedIn: 'root'
})
export class DmWebService {
  constructor(private api: ServerConnectivityService) {}

  listConversations(): Observable<DmConversation[]> {
    return this.api.sendGetRequest('dms', {});
  }

  startConversation(payload: { userId?: number; username?: string }): Observable<DmConversation> {
    return this.api.sendPostReq('dms', payload, {});
  }

  getMessages(conversationId: string): Observable<Message[]> {
    return this.api.sendGetRequest(`dms/${conversationId}/messages`, {});
  }

  postMessage(conversationId: string, message: string): Observable<Message> {
    return this.api.sendPostReq(`dms/${conversationId}/messages`, {
      message,
      timestamp: new Date().toISOString()
    }, {});
  }

  searchUsers(query: string): Observable<User[]> {
    return this.api.sendGetRequest(`users/search?q=${encodeURIComponent(query)}`, {});
  }
}
