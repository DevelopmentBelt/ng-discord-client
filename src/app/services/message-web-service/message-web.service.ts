import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Message } from '../../models/message/message';
import { User } from '../../models/user/user';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MessageWebService {
  private baseUrl = environment.apiUrl;
  private readonly creds = { withCredentials: true };

  constructor(private http: HttpClient) {}

  getLatestMessages(serverId: string, channelId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.baseUrl}/api/messages/${serverId}/${channelId}`, this.creds);
  }

  postMessage(
    user: User,
    channelId: string,
    message: Message,
    options: { anonymous?: boolean; encrypted?: boolean } = {}
  ): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/messages/${channelId}`, {
      postedByMemberId: user.id,
      message: message.rawText,
      attachments: [],
      timestamp: new Date().toISOString(),
      anonymous: !!options.anonymous || !!message.isAnonymous,
      encrypted: !!options.encrypted || !!message.isEncrypted
    }, this.creds);
  }

  searchMessages(serverId: string, channelId: string, query: string, limit: number = 50, offset: number = 0): Observable<Message[]> {
    const params = {
      q: query,
      limit: limit.toString(),
      offset: offset.toString()
    };

    return this.http.get<Message[]>(`${this.baseUrl}/api/search/${serverId}/${channelId}`, { params, ...this.creds });
  }

  searchServerMessages(serverId: string, query: string, limit: number = 50, offset: number = 0): Observable<Message[]> {
    const params = {
      q: query,
      limit: limit.toString(),
      offset: offset.toString()
    };

    return this.http.get<Message[]>(`${this.baseUrl}/api/search/${serverId}`, { params, ...this.creds });
  }
}
