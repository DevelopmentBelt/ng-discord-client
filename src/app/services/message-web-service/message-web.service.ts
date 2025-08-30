import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Message } from '../../models/message/message';
import { User } from '../../models/user/user';

@Injectable({
  providedIn: 'root'
})
export class MessageWebService {
  private baseUrl = 'http://localhost:8000'; // Adjust this to match your backend URL

  constructor(private http: HttpClient) {}

  getLatestMessages(serverId: string, channelId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.baseUrl}/api/messages/${serverId}/${channelId}`);
  }

  postMessage(user: User, channelId: string, message: Message): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/messages`, {
      userId: user.id,
      channelId: channelId,
      text: message.text,
      rawText: message.rawText
    });
  }

  /**
   * Search for messages in a specific channel
   * @param serverId - The server ID to search in
   * @param channelId - The channel ID to search in
   * @param query - The search query text
   * @param limit - Maximum number of results to return (default: 50)
   * @param offset - Number of results to skip for pagination (default: 0)
   * @returns Observable of search results
   */
  searchMessages(serverId: string, channelId: string, query: string, limit: number = 50, offset: number = 0): Observable<Message[]> {
    const params = {
      q: query,
      limit: limit.toString(),
      offset: offset.toString()
    };
    
    return this.http.get<Message[]>(`${this.baseUrl}/api/search/${serverId}/${channelId}`, { params });
  }

  /**
   * Search for messages across all channels in a server
   * @param serverId - The server ID to search in
   * @param query - The search query text
   * @param limit - Maximum number of results to return (default: 50)
   * @param offset - Number of results to skip for pagination (default: 0)
   * @returns Observable of search results
   */
  searchServerMessages(serverId: string, query: string, limit: number = 50, offset: number = 0): Observable<Message[]> {
    const params = {
      q: query,
      limit: limit.toString(),
      offset: offset.toString()
    };
    
    return this.http.get<Message[]>(`${this.baseUrl}/api/search/${serverId}`, { params });
  }
}
