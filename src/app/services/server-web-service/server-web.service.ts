import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Server } from '../../models/server/server';
import { ServerConnectivityService } from '../server-connectivity.service';
import { Member } from '../../models/member/member';
import { Channel } from '../../models/channel/channel';

export interface PublicServer extends Server {
  isJoined: boolean;
  tags: string[];
  memberCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class ServerWebService {
  constructor(private serverService: ServerConnectivityService) {}

  /**
   * Get public servers for discovery
   */
  getPublicServers(): Observable<PublicServer[]> {
    return this.serverService.sendGetRequest('servers/public/', {});
  }

  /**
   * Get servers for the current user
   */
  getUserServers(): Observable<Server[]> {
    return this.serverService.sendGetRequest('servers/', {});
  }

  /**
   * Create a new server
   */
  createServer(serverData: {
    serverName: string;
    serverDescription: string;
    serverIcon?: File;
  }): Observable<Server> {
    const formData = new FormData();
    formData.append('serverName', serverData.serverName);
    formData.append('serverDescription', serverData.serverDescription);
    
    if (serverData.serverIcon) {
      formData.append('serverIcon', serverData.serverIcon);
    }

    return this.serverService.sendPostReq('servers/', formData, {});
  }

  /**
   * Join a server
   */
  joinServer(serverId: string): Observable<any> {
    return this.serverService.sendPostReq(`servers/${serverId}/join`, {}, {});
  }

  /**
   * Leave a server
   */
  leaveServer(serverId: string): Observable<any> {
    return this.serverService.sendDeleteRequest(`servers/${serverId}/leave`, {});
  }

  /**
   * Archive/delete a server (owner only)
   */
  archiveServer(serverId: string): Observable<any> {
    return this.serverService.sendDeleteRequest(`servers/${serverId}`, {});
  }

  /**
   * Update server information
   */
  updateServer(serverId: string, updates: Partial<Server>): Observable<Server> {
    return this.serverService.sendPatchReq(`servers/${serverId}`, updates, {});
  }

  // Member Management Methods
  /**
   * Get server members
   */
  getServerMembers(serverId: string): Observable<Member[]> {
    return this.serverService.sendGetRequest(`servers/${serverId}/members`, {});
  }

  /**
   * Kick a member from the server
   */
  kickMember(serverId: string, memberId: string, reason?: string): Observable<any> {
    const data = reason ? { reason } : {};
    return this.serverService.sendPostReq(`servers/${serverId}/members/${memberId}/kick`, data, {});
  }

  /**
   * Ban a member from the server
   */
  banMember(serverId: string, memberId: string, reason?: string): Observable<any> {
    const data = reason ? { reason } : {};
    return this.serverService.sendPostReq(`servers/${serverId}/members/${memberId}/ban`, data, {});
  }

  /**
   * Unban a member from the server
   */
  unbanMember(serverId: string, memberId: string): Observable<any> {
    return this.serverService.sendDeleteRequest(`servers/${serverId}/bans/${memberId}`, {});
  }

  /**
   * Update member roles
   */
  updateMemberRoles(serverId: string, memberId: string, roles: string[]): Observable<any> {
    return this.serverService.sendPatchReq(`servers/${serverId}/members/${memberId}/roles`, { roles }, {});
  }

  // Channel Management Methods
  /**
   * Get server channels
   */
  getServerChannels(serverId: string): Observable<Channel[]> {
    return this.serverService.sendGetRequest(`servers/${serverId}/channels`, {});
  }

  /**
   * Create a new channel
   */
  createChannel(serverId: string, channelData: Partial<Channel>): Observable<Channel> {
    return this.serverService.sendPostReq(`servers/${serverId}/channels`, channelData, {});
  }

  /**
   * Update a channel
   */
  updateChannel(serverId: string, channelId: number, updates: Partial<Channel>): Observable<Channel> {
    return this.serverService.sendPatchReq(`servers/${serverId}/channels/${channelId}`, updates, {});
  }

  /**
   * Delete a channel
   */
  deleteChannel(serverId: string, channelId: number, reason?: string): Observable<any> {
    const data = reason ? { reason } : {};
    return this.serverService.sendPostReq(`servers/${serverId}/channels/${channelId}/delete`, data, {});
  }

  /**
   * Reorder channels
   */
  reorderChannels(serverId: string, channelOrder: { channelId: number; position: number }[]): Observable<any> {
    return this.serverService.sendPatchReq(`servers/${serverId}/channels/reorder`, { channelOrder }, {});
  }
}
