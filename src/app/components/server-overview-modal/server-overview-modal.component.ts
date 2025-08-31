import { ChangeDetectionStrategy, Component, OnInit, signal, WritableSignal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChannelManagementModalComponent } from '../channel-management-modal/channel-management-modal.component';
import { ConfirmationModalComponent, ConfirmationData } from '../confirmation-modal/confirmation-modal.component';
import { RoleEditingModalComponent, RoleEditingData } from '../role-editing-modal/role-editing-modal.component';
import { Server } from '../../models/server/server';
import { Member } from '../../models/member/member';
import { Channel } from '../../models/channel/channel';
import { AlertService } from '../../services/alert-service/alert.service';
import { ServerWebService } from '../../services/server-web-service/server-web.service';

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
  imports: [CommonModule, FormsModule, ChannelManagementModalComponent, ConfirmationModalComponent, RoleEditingModalComponent]
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

  // Modal states for new UI components
  isConfirmationModalOpen: WritableSignal<boolean> = signal(false);
  isRoleEditingModalOpen: WritableSignal<boolean> = signal(false);
  confirmationData: WritableSignal<ConfirmationData | null> = signal(null);
  roleEditingData: WritableSignal<RoleEditingData | null> = signal(null);
  pendingAction: WritableSignal<{ type: string; data: any } | null> = signal(null);

  constructor(
    private alertService: AlertService,
    private serverWebService: ServerWebService
  ) {}

  ngOnInit(): void {
    if (this.server()) {
      this.loadServerData();
    }
  }

  /**
   * Load server data
   */
  loadServerData(): void {
    this.loadServerMembers();
    this.loadServerChannels();
    this.updateServerStats();
  }

  /**
   * Load server members
   */
  loadServerMembers(): void {
    if (!this.server()) return;
    
    this.isLoadingMembers.set(true);
    // TODO: Implement actual member loading from backend
    // For now, using mock data
    const mockMembers: Member[] = [
      {
        memberId: '1',
        memberName: 'Badger',
        userId: 1,
        username: 'badger',
        userPic: 'https://avatars.githubusercontent.com/u/8027457',
        status: 'online',
        roles: ['Admin', 'Owner'],
        joinedAt: new Date('2024-01-01'),
        isOwner: true,
        isAdmin: true,
        canManageRoles: true,
        canManageMembers: true,
        canManageChannels: true
      },
      {
        memberId: '2',
        memberName: 'John Doe',
        userId: 2,
        username: 'johndoe',
        userPic: '',
        status: 'idle',
        roles: ['Moderator'],
        joinedAt: new Date('2024-01-15'),
        isOwner: false,
        isAdmin: false,
        canManageRoles: true,
        canManageMembers: true,
        canManageChannels: false
      }
    ];
    
    this.serverMembers.set(mockMembers);
    this.isLoadingMembers.set(false);
    
    // Extract available roles
    const allRoles = mockMembers.flatMap(member => member.roles);
    this.availableRoles = [...new Set(allRoles)];
  }

  /**
   * Load server channels
   */
  loadServerChannels(): void {
    if (!this.server()) return;
    
    this.isLoadingChannels.set(true);
    // TODO: Implement actual channel loading from backend
    // For now, using mock data
    const mockChannels: Channel[] = [
      {
        channelId: 1,
        channelName: 'general',
        type: 'text',
        topic: 'General discussion',
        categoryId: 1,
        position: 0,
        nsfw: false,
        isPrivate: false,
        permissions: ['read', 'send'],
        memberCount: 150,
        createdAt: new Date('2024-01-01')
      },
      {
        channelId: 2,
        channelName: 'announcements',
        type: 'text',
        topic: 'Server announcements',
        categoryId: 1,
        position: 1,
        nsfw: false,
        isPrivate: false,
        permissions: ['read'],
        memberCount: 150,
        createdAt: new Date('2024-01-01')
      }
    ];
    
    this.serverChannels.set(mockChannels);
    this.isLoadingChannels.set(false);
  }

  /**
   * Update server statistics
   */
  updateServerStats(): void {
    const stats: ServerStats = {
      memberCount: this.serverMembers().length,
      channelCount: this.serverChannels().length,
      roleCount: this.availableRoles.length,
      boostLevel: 0,
      verificationLevel: 'None',
      createdAt: '2024-01-01'
    };
    this.serverStats.set(stats);
  }

  /**
   * Update server stats after channel changes
   */
  updateServerStatsAfterChannelChange(delta: number): void {
    const currentStats = this.serverStats();
    this.serverStats.set({
      ...currentStats,
      channelCount: currentStats.channelCount + delta
    });
  }

  /**
   * Get filtered members
   */
  get filteredMembers(): Member[] {
    let members = this.serverMembers();
    const query = this.memberSearchQuery().toLowerCase();
    const roleFilter = this.memberFilterRole();
    const statusFilter = this.memberFilterStatus();

    if (query) {
      members = members.filter(member => 
        member.memberName.toLowerCase().includes(query)
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
  get filteredChannels(): Channel[] {
    return this.serverChannels();
  }

  /**
   * Get filtered channels as server channels for compatibility
   */
  getFilteredChannelsAsServerChannels(): any[] {
    return this.filteredChannels.map(channel => ({
      id: channel.channelId,
      name: channel.channelName,
      type: channel.type,
      topic: channel.topic,
      categoryId: channel.categoryId,
      position: channel.position
    }));
  }

  /**
   * Convert channel to server channel format
   */
  convertToServerChannel(channel: Channel | null): any {
    if (!channel) return null;
    return {
      id: channel.channelId,
      name: channel.channelName,
      type: channel.type,
      topic: channel.topic,
      categoryId: channel.categoryId,
      position: channel.position
    };
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
   * Kick member with confirmation modal
   */
  kickMember(member: Member): void {
    this.confirmationData.set({
      title: 'Kick Member',
      message: `Are you sure you want to kick "${member.memberName}" from the server? This action cannot be undone.`,
      confirmText: 'Kick Member',
      cancelText: 'Cancel',
      isDestructive: true
    });
    this.pendingAction.set({ type: 'kick', data: member });
    this.isConfirmationModalOpen.set(true);
  }

  /**
   * Ban member with confirmation modal
   */
  banMember(member: Member): void {
    this.confirmationData.set({
      title: 'Ban Member',
      message: `Are you sure you want to ban "${member.memberName}" from the server? This action cannot be undone.`,
      confirmText: 'Ban Member',
      cancelText: 'Cancel',
      isDestructive: true
    });
    this.pendingAction.set({ type: 'ban', data: member });
    this.isConfirmationModalOpen.set(true);
  }

  /**
   * Update member roles with role editing modal
   */
  updateMemberRoles(member: Member): void {
    this.roleEditingData.set({
      member: member,
      currentRoles: member.roles,
      availableRoles: this.availableRoles
    });
    this.isRoleEditingModalOpen.set(true);
  }

  /**
   * Handle confirmation modal result
   */
  onConfirmationResult(confirmed: boolean): void {
    if (confirmed && this.pendingAction()) {
      const action = this.pendingAction()!;
      
      switch (action.type) {
        case 'kick':
          this.executeKickMember(action.data);
          break;
        case 'ban':
          this.executeBanMember(action.data);
          break;
        case 'deleteChannel':
          this.executeDeleteChannel(action.data);
          break;
      }
    }
    
    this.isConfirmationModalOpen.set(false);
    this.confirmationData.set(null);
    this.pendingAction.set(null);
  }

  /**
   * Execute kick member action
   */
  private executeKickMember(member: Member): void {
    if (!this.server()) return;
    
    this.serverWebService.kickMember(this.server()!.serverId, member.memberId).subscribe({
      next: () => {
        console.log('Member kicked successfully');
        this.loadServerMembers();
        this.updateServerStats();
      },
      error: (error) => {
        console.error('Failed to kick member:', error);
      }
    });
  }

  /**
   * Execute ban member action
   */
  private executeBanMember(member: Member): void {
    if (!this.server()) return;
    
    this.serverWebService.banMember(this.server()!.serverId, member.memberId).subscribe({
      next: () => {
        console.log('Member banned successfully');
        this.loadServerMembers();
        this.updateServerStats();
      },
      error: (error) => {
        console.error('Failed to ban member:', error);
      }
    });
  }

  /**
   * Execute delete channel action
   */
  private executeDeleteChannel(channel: Channel): void {
    if (!this.server()) return;
    
    this.serverWebService.deleteChannel(this.server()!.serverId, channel.channelId).subscribe({
      next: () => {
        console.log('Channel deleted successfully');
        this.loadServerChannels();
        this.updateServerStatsAfterChannelChange(-1);
      },
      error: (error) => {
        console.error('Failed to delete channel:', error);
      }
    });
  }

  /**
   * Handle role editing modal result
   */
  onRoleEditingResult(roles: string[]): void {
    if (this.roleEditingData()?.member) {
      const member = this.roleEditingData()!.member;
      this.serverWebService.updateMemberRoles(this.server()!.serverId, member.memberId, roles).subscribe({
        next: () => {
          console.log('Roles updated successfully');
          this.loadServerMembers();
        },
        error: (error) => {
          console.error('Failed to update roles:', error);
        }
      });
    }
    
    this.isRoleEditingModalOpen.set(false);
    this.roleEditingData.set(null);
  }

  /**
   * Close role editing modal
   */
  closeRoleEditingModal(): void {
    this.isRoleEditingModalOpen.set(false);
    this.roleEditingData.set(null);
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
   * Close channel modal
   */
  closeChannelModal(): void {
    this.isChannelModalOpen.set(false);
    this.selectedChannel.set(null);
    this.isEditingChannel.set(false);
  }

  /**
   * Save channel
   */
  saveChannel(channelData: Partial<Channel>): void {
    if (!this.server()) return;
    
    if (this.isEditingChannel()) {
      // Update existing channel
      this.serverWebService.updateChannel(this.server()!.serverId, this.selectedChannel()!.channelId, channelData).subscribe({
        next: () => {
          console.log('Channel updated successfully');
          this.loadServerChannels();
          this.closeChannelModal();
        },
        error: (error) => {
          console.error('Failed to update channel:', error);
        }
      });
    } else {
      // Create new channel
      this.serverWebService.createChannel(this.server()!.serverId, channelData).subscribe({
        next: () => {
          console.log('Channel created successfully');
          this.loadServerChannels();
          this.updateServerStatsAfterChannelChange(1);
          this.closeChannelModal();
        },
        error: (error) => {
          console.error('Failed to create channel:', error);
        }
      });
    }
  }

  /**
   * Delete channel with confirmation modal
   */
  deleteChannel(channel: Channel): void {
    this.confirmationData.set({
      title: 'Delete Channel',
      message: `Are you sure you want to delete the channel "#${channel.channelName}"? This action cannot be undone.`,
      confirmText: 'Delete Channel',
      cancelText: 'Cancel',
      isDestructive: true
    });
    this.pendingAction.set({ type: 'deleteChannel', data: channel });
    this.isConfirmationModalOpen.set(true);
  }

  /**
   * Get boost level display text
   */
  getBoostLevelText(level: number): string {
    const levels = ['No Boost', 'Level 1', 'Level 2', 'Level 3'];
    return levels[level] || 'Unknown';
  }

  /**
   * Get boost level color
   */
  getBoostLevelColor(level: number): string {
    const colors = ['text-discord-text-muted', 'text-pink-400', 'text-purple-400', 'text-yellow-400'];
    return colors[level] || 'text-discord-text-muted';
  }

  /**
   * Get verification level display text
   */
  getVerificationLevelText(level: string): string {
    const levels: { [key: string]: string } = {
      'None': 'None',
      'Low': 'Low',
      'Medium': 'Medium',
      'High': 'High',
      'Very High': 'Very High'
    };
    return levels[level] || level;
  }

  /**
   * Close modal
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
