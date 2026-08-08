import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Server } from '../../models/server/server';
import { ServerConnectivityService } from '../server-connectivity.service';
import { Member } from '../../models/member/member';
import { Channel } from '../../models/channel/channel';
import { Category } from '../../models/channel/category';

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
   * Create a new server (private by default unless isPublic is true)
   */
  createServer(serverData: {
    serverName: string;
    serverDescription: string;
    serverIcon?: File;
    isPublic?: boolean;
  }): Observable<Server & { inviteCode?: string | null; isPublic?: boolean }> {
    const formData = new FormData();
    formData.append('serverName', serverData.serverName);
    formData.append('serverDescription', serverData.serverDescription);
    formData.append('isPublic', serverData.isPublic ? 'true' : 'false');
    
    if (serverData.serverIcon) {
      formData.append('serverIcon', serverData.serverIcon);
    }

    return this.serverService.sendPostReq('servers/', formData, {});
  }

  /**
   * Join a public server, or a private one with an invite code
   */
  joinServer(serverId: string, inviteCode?: string): Observable<any> {
    const body = inviteCode ? { inviteCode } : {};
    return this.serverService.sendPostReq(`servers/${serverId}/join`, body, {});
  }

  joinServerWithInvite(inviteCode: string): Observable<{
    success: boolean;
    message?: string;
    server: Server;
  }> {
    return this.serverService.sendPostReq('servers/join-invite', { inviteCode }, {});
  }

  updateServerPrivacy(serverId: string, isPublic: boolean): Observable<{
    status: string;
    serverId: number;
    isPublic: boolean;
    message?: string;
  }> {
    return this.serverService.sendPatchReq(`servers/${serverId}/privacy`, { isPublic }, {});
  }

  createServerInvite(serverId: string, options?: { maxUses?: number; expiresInHours?: number }): Observable<{
    status: string;
    invite: { code: string; serverId: number; maxUses: number; uses: number; expiresAt: string | null };
  }> {
    return this.serverService.sendPostReq(`servers/${serverId}/invites`, options || {}, {});
  }

  listServerInvites(serverId: string): Observable<{
    status: string;
    invites: Array<{ code: string; maxUses: number; uses: number; expiresAt: string | null; createdAt: string }>;
  }> {
    return this.serverService.sendGetRequest(`servers/${serverId}/invites`, {});
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
   * Get categories (with nested channels) for a server
   */
  getServerChannels(serverId: string): Observable<Category[]> {
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

  enablePhantomChannel(serverId: string, channelId: number): Observable<{
    status: string;
    message?: string;
    channelId: number;
    isPhantom: boolean;
  }> {
    return this.serverService.sendPostReq(`servers/${serverId}/channels/${channelId}/phantom/enable`, {}, {});
  }

  disablePhantomChannel(serverId: string, channelId: number): Observable<{
    status: string;
    message?: string;
    channelId: number;
    isPhantom: boolean;
  }> {
    return this.serverService.sendPostReq(`servers/${serverId}/channels/${channelId}/phantom/disable`, {}, {});
  }

  getPhantomChannelKey(serverId: string, channelId: number): Observable<{
    status: string;
    channelId: number;
    phantomKey: string;
  }> {
    return this.serverService.sendGetRequest(
      `servers/${serverId}/channels/${channelId}/phantom/key`,
      {}
    );
  }

  /**
   * Delete a channel
   */
  deleteChannel(serverId: string, channelId: number, reason?: string): Observable<any> {
    const data = reason ? { reason } : {};
    return this.serverService.sendPostReq(`servers/${serverId}/channels/${channelId}/delete`, data, {});
  }

  /**
   * Reorder roles in the server
   */
  reorderRoles(serverId: string, roleOrder: { roleId: string; position: number }[]): Observable<any> {
    return this.serverService.sendPatchReq(`servers/${serverId}/roles/reorder`, { roleOrder }, {});
  }

  /**
   * Reorder channels in the server
   */
  reorderChannels(serverId: string, channelOrder: { channelId: number; position: number }[]): Observable<any> {
    return this.serverService.sendPatchReq(`servers/${serverId}/channels/reorder`, { channelOrder }, {});
  }
}
