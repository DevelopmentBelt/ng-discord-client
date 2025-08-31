import { ChangeDetectionStrategy, Component, OnInit, signal, WritableSignal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Server } from '../../models/server/server';
import { Member } from '../../models/member/member';
import { Channel } from '../../models/channel/channel';
import { AlertService } from '../../services/alert-service/alert-service';
import { ServerWebService } from '../../services/server-web-service/server-web.service';
import { ChannelManagementModalComponent } from '../channel-management-modal/channel-management-modal.component';

export interface ServerStats {
  memberCount: number;
  channelCount: number;
  roleCount: number;
  boostLevel: number;
  verificationLevel: string;
  createdAt: string;
}

@Component({
  selector: 'app-server-overview-modal',
  templateUrl: './server-overview-modal.component.html',
  styleUrls: ['./server-overview-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, ChannelManagementModalComponent]
})
export class ServerOverviewModalComponent implements OnInit {
  // Input Signals
  server = input<Server | null>(null);

  // Output Signals
  closeModal = output<void>();

  // Server statistics (mock data for now)
  serverStats: WritableSignal<ServerStats> = signal({
    memberCount: 0,
    channelCount: 0,
    roleCount: 0,
    boostLevel: 0,
    verificationLevel: 'None',
    createdAt: ''
  });

  // Active tab
  activeTab: WritableSignal<string> = signal('overview');

  // Member management
  serverMembers: WritableSignal<Member[]> = signal([]);
  selectedMember: WritableSignal<Member | null> = signal(null);
  isLoadingMembers: WritableSignal<boolean> = signal(false);
  memberSearchQuery: WritableSignal<string> = signal('');
  memberFilterRole: WritableSignal<string> = signal('all');
  memberFilterStatus: WritableSignal<string> = signal('all');

  // Channel management
  serverChannels: WritableSignal<Channel[]> = signal([]);
  selectedChannel: WritableSignal<Channel | null> = signal(null);
  isLoadingChannels: WritableSignal<boolean> = signal(false);
  isChannelModalOpen: WritableSignal<boolean> = signal(false);
  isEditingChannel: WritableSignal<boolean> = signal(false);

  // Available roles for filtering
  availableRoles: string[] = [];

  constructor(
    private alertService: AlertService,
    private serverWebService: ServerWebService
  ) {}

  ngOnInit(): void {
    if (this.server()) {
      this.loadServerStats();
      this.loadServerMembers();
      this.loadServerChannels();
    }
  }

  /**
   * Load server statistics
   */
  private loadServerStats(): void {
    // TODO: Replace with actual API call to get server statistics
    // For now, generate mock data
    const mockStats: ServerStats = {
      memberCount: Math.floor(Math.random() * 1000) + 50,
      channelCount: Math.floor(Math.random() * 20) + 5,
      roleCount: Math.floor(Math.random() * 10) + 3,
      boostLevel: Math.floor(Math.random() * 3),
      verificationLevel: ['None', 'Low', 'Medium', 'High', 'Very High'][Math.floor(Math.random() * 5)],
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString()
    };
    
    this.serverStats.set(mockStats);
  }

  /**
   * Load server members
   */
  private loadServerMembers(): void {
    if (!this.server()) return;
    
    this.isLoadingMembers.set(true);
    this.serverWebService.getServerMembers(this.server()!.serverId).subscribe({
      next: (members) => {
        this.serverMembers.set(members);
        this.updateAvailableRoles(members);
        this.isLoadingMembers.set(false);
        this.updateServerStatsAfterMemberChange(0); // Refresh stats
      },
      error: (error) => {
        console.error('Failed to load members:', error);
        this.loadMockMembers();
        this.isLoadingMembers.set(false);
      }
    });
  }

  /**
   * Load mock members for development
   */
  private loadMockMembers(): void {
    const mockMembers: Member[] = [
      {
        memberId: '1',
        memberName: 'John Doe',
        userId: 1,
        username: 'johndoe',
        userPic: 'https://via.placeholder.com/40/7289da/ffffff?text=J',
        status: 'online',
        roles: ['Admin', 'Moderator'],
        joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(),
        isOwner: true,
        isAdmin: true,
        canManageMembers: true,
        canManageChannels: true,
        canManageRoles: true
      },
      {
        memberId: '2',
        memberName: 'Jane Smith',
        userId: 2,
        username: 'janesmith',
        userPic: 'https://via.placeholder.com/40/43b581/ffffff?text=J',
        status: 'idle',
        roles: ['Moderator'],
        joinedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isOwner: false,
        isAdmin: false,
        canManageMembers: true,
        canManageChannels: false,
        canManageRoles: false
      },
      {
        memberId: '3',
        memberName: 'Bob Johnson',
        userId: 3,
        username: 'bobjohnson',
        userPic: 'https://via.placeholder.com/40/faa61a/ffffff?text=B',
        status: 'offline',
        roles: ['Member'],
        joinedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isOwner: false,
        isAdmin: false,
        canManageMembers: false,
        canManageChannels: false,
        canManageRoles: false
      }
    ];
    
    this.serverMembers.set(mockMembers);
    this.updateAvailableRoles(mockMembers);
    this.updateServerStatsAfterMemberChange(0); // Refresh stats
  }

  /**
   * Load server channels
   */
  private loadServerChannels(): void {
    if (!this.server()) return;
    
    this.isLoadingChannels.set(true);
    this.serverWebService.getServerChannels(this.server()!.serverId).subscribe({
      next: (channels) => {
        this.serverChannels.set(channels);
        this.isLoadingChannels.set(false);
        this.updateServerStatsAfterChannelChange(0); // Refresh stats
      },
      error: (error) => {
        console.error('Failed to load channels:', error);
        this.loadMockChannels();
        this.isLoadingChannels.set(false);
      }
    });
  }

  /**
   * Load mock channels for development
   */
  private loadMockChannels(): void {
    const mockChannels: Channel[] = [
      {
        channelId: 1,
        channelName: 'general',
        categoryId: 0,
        type: 'text',
        position: 0,
        topic: 'General discussion for the server',
        nsfw: false,
        slowmode: 0,
        isPrivate: false,
        permissions: ['read', 'send'],
        memberCount: 150,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastActivity: new Date()
      },
      {
        channelId: 2,
        channelName: 'announcements',
        categoryId: 0,
        type: 'text',
        position: 1,
        topic: 'Important server announcements',
        nsfw: false,
        slowmode: 0,
        isPrivate: false,
        permissions: ['read'],
        memberCount: 150,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        channelId: 3,
        channelName: 'General Voice',
        categoryId: 0,
        type: 'voice',
        position: 2,
        topic: 'Voice chat for general discussion',
        nsfw: false,
        userLimit: 10,
        bitrate: 64000,
        isPrivate: false,
        permissions: ['connect', 'speak'],
        memberCount: 25,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastActivity: new Date()
      }
    ];
    
    this.serverChannels.set(mockChannels);
    this.updateServerStatsAfterChannelChange(0); // Refresh stats
  }

  /**
   * Update available roles for filtering
   */
  private updateAvailableRoles(members: Member[]): void {
    const roles = new Set<string>();
    members.forEach(member => {
      member.roles.forEach(role => roles.add(role));
    });
    this.availableRoles = Array.from(roles);
  }

  /**
   * Switch between tabs
   */
  switchTab(tab: string): void {
    this.activeTab.set(tab);
  }

  /**
   * Get filtered members based on search and filters
   */
  getFilteredMembers(): Member[] {
    let members = this.serverMembers();
    const query = this.memberSearchQuery().toLowerCase();
    const roleFilter = this.memberFilterRole();
    const statusFilter = this.memberFilterStatus();

    if (query) {
      members = members.filter(member => 
        member.memberName.toLowerCase().includes(query) ||
        member.username.toLowerCase().includes(query)
      );
    }

    if (roleFilter !== 'all') {
      members = members.filter(member => 
        member.roles.includes(roleFilter)
      );
    }

    if (statusFilter !== 'all') {
      members = members.filter(member => 
        member.status === statusFilter
      );
    }

    return members;
  }

  /**
   * Get filtered channels
   */
  getFilteredChannels(): Channel[] {
    return this.serverChannels().sort((a, b) => a.position - b.position);
  }

  /**
   * Convert Channel to ServerChannel for compatibility
   */
  convertToServerChannel(channel: Channel | null): any {
    if (!channel) return null;
    
    return {
      id: channel.channelId.toString(),
      name: channel.channelName,
      type: channel.type,
      position: channel.position,
      parentId: channel.categoryId ? channel.categoryId.toString() : undefined,
      topic: channel.topic,
      nsfw: channel.nsfw,
      slowmode: channel.slowmode,
      userLimit: channel.userLimit,
      bitrate: channel.bitrate
    };
  }

  /**
   * Get filtered channels as ServerChannel format for the modal
   */
  getFilteredChannelsAsServerChannels(): any[] {
    return this.getFilteredChannels()
      .filter(c => c.type === 'category')
      .map(channel => this.convertToServerChannel(channel));
  }

  /**
   * Get status icon for display
   */
  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'online': 'M10 12a2 2 0 100-4 2 2 0 000 4z M10 2a8 8 0 100 16 8 8 0 000-16z',
      'idle': 'M10 12a2 2 0 100-4 2 2 0 000 4z M10 2a8 8 0 100 16 8 8 0 000-16z M4.93 4.93A4 4 0 0010 8a4 4 0 00-4 4 4 4 0 004 4 4 4 0 004-4 4 4 0 00-1.07-3.07z',
      'dnd': 'M10 12a2 2 0 100-4 2 2 0 000 4z M10 2a8 8 0 100 16 8 8 0 000-16z M4 10a6 6 0 0112 0v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z',
      'offline': 'M10 12a2 2 0 100-4 2 2 0 000 4z M10 2a8 8 0 100 16 8 8 0 000-16z'
    };
    return icons[status] || icons['offline'];
  }

  /**
   * Update server stats after member changes
   */
  private updateServerStatsAfterMemberChange(change: number): void {
    const currentStats = this.serverStats();
    this.serverStats.set({
      ...currentStats,
      memberCount: Math.max(0, currentStats.memberCount + change)
    });
  }

  /**
   * Update server stats after channel changes
   */
  private updateServerStatsAfterChannelChange(change: number): void {
    const currentStats = this.serverStats();
    this.serverStats.set({
      ...currentStats,
      channelCount: Math.max(0, currentStats.channelCount + change)
    });
  }

  /**
   * Get status color class
   */
  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'online': 'text-green-400',
      'idle': 'text-yellow-400',
      'dnd': 'text-red-400',
      'offline': 'text-discord-text-muted'
    };
    return colors[status] || 'text-discord-text-muted';
  }

  /**
   * Get channel type icon
   */
  getChannelTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'text': 'M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z',
      'voice': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      'category': 'M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z'
    };
    return icons[type] || 'M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z';
  }

  /**
   * Kick member
   */
  kickMember(member: Member): void {
    if (!this.server()) return;
    
    if (confirm(`Are you sure you want to kick "${member.memberName}" from the server?`)) {
      this.serverWebService.kickMember(this.server()!.serverId, member.memberId).subscribe({
        next: () => {
          this.alertService.success('Member Kicked', `${member.memberName} has been kicked from the server.`);
          this.loadServerMembers();
          this.updateServerStatsAfterMemberChange(-1);
        },
        error: (error) => {
          console.error('Failed to kick member:', error);
          this.alertService.error('Kick Failed', 'Failed to kick member from the server.');
        }
      });
    }
  }

  /**
   * Ban member
   */
  banMember(member: Member): void {
    if (!this.server()) return;
    
    const reason = prompt('Enter ban reason (optional):');
    if (reason !== null) { // User didn't cancel
      this.serverWebService.banMember(this.server()!.serverId, member.memberId, reason || undefined).subscribe({
        next: () => {
          this.alertService.success('Member Banned', `${member.memberName} has been banned from the server.`);
          this.loadServerMembers();
          this.updateServerStatsAfterMemberChange(-1);
        },
        error: (error) => {
          console.error('Failed to ban member:', error);
          this.alertService.error('Ban Failed', 'Failed to ban member from the server.');
        }
      });
    }
  }

  /**
   * Update member roles
   */
  updateMemberRoles(member: Member): void {
    if (!this.server()) return;
    
    const newRoles = prompt('Enter new roles (comma-separated):', member.roles.join(', '));
    if (newRoles !== null) {
      const roles = newRoles.split(',').map(role => role.trim()).filter(role => role);
      this.serverWebService.updateMemberRoles(this.server()!.serverId, member.memberId, roles).subscribe({
        next: () => {
          this.alertService.success('Roles Updated', `${member.memberName}'s roles have been updated.`);
          this.loadServerMembers();
        },
        error: (error) => {
          console.error('Failed to update roles:', error);
          this.alertService.error('Update Failed', 'Failed to update member roles.');
        }
      });
    }
  }

  /**
   * Open channel modal for editing
   */
  editChannel(channel: Channel): void {
    this.selectedChannel.set(channel);
    this.isEditingChannel.set(true);
    this.isChannelModalOpen.set(true);
  }

  /**
   * Open channel modal for creating
   */
  createChannel(): void {
    this.selectedChannel.set(null);
    this.isEditingChannel.set(false);
    this.isChannelModalOpen.set(true);
  }

  /**
   * Close channel modal
   */
  closeChannelModal(): void {
    this.isChannelModalOpen.set(false);
    this.selectedChannel.set(null);
  }

  /**
   * Save channel (create or update)
   */
  saveChannel(channelData: Partial<Channel>): void {
    if (!this.server()) return;
    
    if (this.isEditingChannel() && this.selectedChannel()) {
      // Update existing channel
      this.serverWebService.updateChannel(this.server()!.serverId, this.selectedChannel()!.channelId, channelData).subscribe({
        next: () => {
          this.alertService.success('Channel Updated', 'Channel has been updated successfully.');
          this.loadServerChannels();
          this.closeChannelModal();
        },
        error: (error) => {
          console.error('Failed to update channel:', error);
          this.alertService.error('Update Failed', 'Failed to update channel.');
        }
      });
    } else {
      // Create new channel
      this.serverWebService.createChannel(this.server()!.serverId, channelData).subscribe({
        next: () => {
          this.alertService.success('Channel Created', 'New channel has been created successfully.');
          this.loadServerChannels();
          this.closeChannelModal();
          this.updateServerStatsAfterChannelChange(1);
        },
        error: (error) => {
          console.error('Failed to create channel:', error);
          this.alertService.error('Creation Failed', 'Failed to create channel.');
        }
      });
    }
  }

  /**
   * Delete channel
   */
  deleteChannel(channel: Channel): void {
    if (!this.server()) return;
    
    if (confirm(`Are you sure you want to delete the channel "#${channel.channelName}"? This action cannot be undone.`)) {
      this.serverWebService.deleteChannel(this.server()!.serverId, channel.channelId).subscribe({
        next: () => {
          this.alertService.success('Channel Deleted', `Channel #${channel.channelName} has been deleted.`);
          this.loadServerChannels();
          this.updateServerStatsAfterChannelChange(-1);
        },
        error: (error) => {
          console.error('Failed to delete channel:', error);
          this.alertService.error('Deletion Failed', 'Failed to delete channel.');
        }
      });
    }
  }

  /**
   * Get boost level display text
   */
  getBoostLevelText(level: number): string {
    const levels = ['No Boost', 'Level 1', 'Level 2', 'Level 3'];
    return levels[level] || 'No Boost';
  }

  /**
   * Get boost level color
   */
  getBoostLevelColor(level: number): string {
    const colors = ['text-discord-text-muted', 'text-pink-400', 'text-purple-400', 'text-yellow-400'];
    return colors[level] || 'text-discord-text-muted';
  }

  /**
   * Get verification level color
   */
  getVerificationLevelColor(level: string): string {
    const colors: { [key: string]: string } = {
      'None': 'text-discord-text-muted',
      'Low': 'text-green-400',
      'Medium': 'text-yellow-400',
      'High': 'text-orange-400',
      'Very High': 'text-red-400'
    };
    return colors[level] || 'text-discord-text-muted';
  }

  /**
   * Close the modal
   */
  close(): void {
    this.closeModal.emit();
  }

  /**
   * Get server initials for avatar fallback
   */
  getServerInitials(server: Server): string {
    return server.serverName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  /**
   * Check if server has custom icon
   */
  hasCustomIcon(server: Server): boolean {
    return server.iconURL && server.iconURL.trim() !== '';
  }

  /**
   * Get member count display text
   */
  getMemberCountText(count: number): string {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }

  /**
   * Get channel count display text
   */
  getChannelCountText(count: number): string {
    return count.toString();
  }

  /**
   * Get role count display text
   */
  getRoleCountText(count: number): string {
    return count.toString();
  }

  /**
   * Handle keyboard events
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  /**
   * Copy server invite link
   */
  copyInviteLink(): void {
    // TODO: Generate actual invite link
    const inviteLink = `https://discord.gg/${Math.random().toString(36).substring(2, 8)}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      console.log('Invite link copied to clipboard:', inviteLink);
    }).catch(() => {
      console.error('Failed to copy invite link to clipboard.');
    });
  }

  /**
   * Leave server
   */
  leaveServer(): void {
    if (confirm(`Are you sure you want to leave "${this.server()?.serverName}"?`)) {
      // TODO: Implement actual server leave functionality
      console.log('Leaving server:', this.server()?.serverName);
      this.close();
    }
  }
}
