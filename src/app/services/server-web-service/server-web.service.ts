import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ServerConnectivityService } from '../server-connectivity.service';
import { Server } from '../../models/server/server';

export interface PublicServer extends Server {
  memberCount: number;
  isJoined: boolean;
  tags: string[];
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
}
