import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  signal,
  WritableSignal,
  input,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs';
import { Server } from '../../models/server/server';
import { Member } from '../../models/member/member';
import { Channel } from '../../models/channel/channel';
import { Category } from '../../models/channel/category';
import { AlertService } from '../../services/alert-service/alert-service';
import { RoleManagementModalComponent } from '../role-management-modal/role-management-modal.component';
import { ChannelManagementModalComponent } from '../channel-management-modal/channel-management-modal.component';
import { ConfirmationModalComponent, ConfirmationData } from '../confirmation-modal/confirmation-modal.component';
import { UserProfileModalComponent } from '../user-profile-modal/user-profile-modal.component';
import { ServerWebService } from '../../services/server-web-service/server-web.service';

export interface ServerRole {
  id: string;
  name: string;
  color: string;
  permissions: string[];
  memberCount: number;
  position: number;
  hoist: boolean;
  mentionable: boolean;
  managed: boolean;
}

export interface ServerChannel {
  id: number;
  name: string;
  type: 'text' | 'voice' | 'category';
  position: number;
  parentId?: string;
  categoryId?: number | string;
  topic?: string;
  nsfw: boolean;
  slowmode?: number;
  userLimit?: number;
  bitrate?: number;
  isPhantom?: boolean;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

@Component({
  selector: 'app-server-settings-modal',
  templateUrl: './server-settings-modal.component.html',
  styleUrls: ['./server-settings-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, RoleManagementModalComponent, ChannelManagementModalComponent, ConfirmationModalComponent, UserProfileModalComponent]
})
export class ServerSettingsModalComponent implements OnInit {
  // Input Signals
  server = input<Server | null>(null);
  
  // Output Signals
  closeModal = output<void>();

  // Active tab
  activeTab: WritableSignal<string> = signal('overview');

  // Form data
  serverName: WritableSignal<string> = signal('');
  serverDescription: WritableSignal<string> = signal('');
  isEditing: WritableSignal<boolean> = signal(false);

  // Role management
  serverRoles: WritableSignal<ServerRole[]> = signal([]);
  selectedRole: WritableSignal<ServerRole | null> = signal(null);
  isRoleModalOpen: WritableSignal<boolean> = signal(false);
  isEditingRole: WritableSignal<boolean> = signal(false);
  
  // Channel management
  serverChannels: WritableSignal<ServerChannel[]> = signal([]);
  selectedChannel: WritableSignal<ServerChannel | null> = signal(null);
  isChannelModalOpen: WritableSignal<boolean> = signal(false);
  isEditingChannel: WritableSignal<boolean> = signal(false);

  // User management
  serverMembers: WritableSignal<Member[]> = signal([]);
  selectedMember: WritableSignal<Member | null> = signal(null);
  isUserProfileModalOpen: WritableSignal<boolean> = signal(false);
  memberSearchQuery: WritableSignal<string> = signal('');
  memberFilterRole: WritableSignal<string> = signal('all');
  memberFilterStatus: WritableSignal<string> = signal('all');
  availableRoles: WritableSignal<string[]> = signal([]);
  isLoadingMembers: WritableSignal<boolean> = signal(false);

  // Settings states
  verificationLevel: WritableSignal<string> = signal('Low');
  explicitContentFilter: WritableSignal<string> = signal('Medium');
  isPublicCommunity: WritableSignal<boolean> = signal(false);
  serverInvites = signal<Array<{
    code: string;
    maxUses: number;
    uses: number;
    expiresAt: string | null;
    createdAt?: string;
  }>>([]);
  latestInviteCode = signal<string | null>(null);
  inviteBusy = signal(false);

  // Modal states for new UI components
  isConfirmationModalOpen: WritableSignal<boolean> = signal(false);
  confirmationData: WritableSignal<ConfirmationData | null> = signal(null);
  pendingAction: WritableSignal<{ type: string; data: any } | null> = signal(null);

  // Available permissions
  availablePermissions: Permission[] = [
    { id: 'admin', name: 'Administrator', description: 'Gives all permissions', category: 'General' },
    { id: 'manage_server', name: 'Manage Server', description: 'Manage server settings', category: 'General' },
    { id: 'manage_roles', name: 'Manage Roles', description: 'Create, edit, and delete roles', category: 'General' },
    { id: 'manage_channels', name: 'Manage Channels', description: 'Create, edit, and delete channels', category: 'General' },
    { id: 'kick_members', name: 'Kick Members', description: 'Kick members from the server', category: 'Members' },
    { id: 'ban_members', name: 'Ban Members', description: 'Ban members from the server', category: 'Members' },
    { id: 'manage_messages', name: 'Manage Messages', description: 'Delete and pin messages', category: 'Messages' },
    { id: 'send_messages', name: 'Send Messages', description: 'Send messages in text channels', category: 'Messages' },
    { id: 'read_messages', name: 'Read Messages', description: 'Read messages in text channels', category: 'Messages' },
    { id: 'connect', name: 'Connect', description: 'Join voice channels', category: 'Voice' },
    { id: 'speak', name: 'Speak', description: 'Speak in voice channels', category: 'Voice' },
    { id: 'use_voice_activity', name: 'Use Voice Activity', description: 'Use voice activity detection', category: 'Voice' }
  ];

  readonly topLevelChannels = computed(() =>
    this.serverChannels().filter((c) => c.type === 'category' || !c.parentId)
  );

  readonly categoryOptions = computed(() =>
    this.serverChannels().filter((c) => c.type === 'category')
  );

  readonly filteredMembers = computed(() => {
    let members = this.serverMembers();

    if (this.memberSearchQuery()) {
      const query = this.memberSearchQuery().toLowerCase();
      members = members.filter(
        (member) =>
          member.memberName.toLowerCase().includes(query) ||
          member.username.toLowerCase().includes(query)
      );
    }

    if (this.memberFilterRole() !== 'all') {
      members = members.filter((member) => member.roles.includes(this.memberFilterRole()));
    }

    if (this.memberFilterStatus() !== 'all') {
      members = members.filter((member) => member.status === this.memberFilterStatus());
    }

    return members;
  });

  constructor(
    private alertService: AlertService,
    private serverWebService: ServerWebService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.server()) {
      this.initializeForm();
      this.loadMockRoles();
      this.loadServerChannels();
      this.loadServerMembers();
      this.loadInvites();
    }
  }

  /**
   * Initialize form with server data
   */
  initializeForm(): void {
    if (this.server()) {
      this.serverName.set(this.server()!.serverName);
      this.serverDescription.set(this.server()!.serverDescription || '');
      this.isPublicCommunity.set(!!this.server()!.isPublic);
    }
  }

  switchTab(tab: string): void {
    this.activeTab.set(tab);
    if (tab === 'privacy') {
      this.loadInvites();
    }
  }

  togglePublicDiscovery(enabled: boolean): void {
    const server = this.server();
    if (!server?.serverId) {
      return;
    }
    const next = !!enabled;
    this.serverWebService.updateServerPrivacy(String(server.serverId), next).pipe(take(1)).subscribe({
      next: (resp) => {
        this.isPublicCommunity.set(!!resp.isPublic);
        this.alertService.success(
          resp.isPublic ? 'Community is public' : 'Community is private',
          resp.message || ''
        );
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.alertService.error(
          'Could not update privacy',
          err?.error?.error || err?.error?.message || 'Only the owner can change this.'
        );
        this.cdr.markForCheck();
      }
    });
  }

  loadInvites(): void {
    const server = this.server();
    if (!server?.serverId || server.serverId === 'home') {
      this.serverInvites.set([]);
      return;
    }
    this.serverWebService.listServerInvites(String(server.serverId)).pipe(take(1)).subscribe({
      next: (resp) => {
        this.serverInvites.set(resp?.invites || []);
        this.cdr.markForCheck();
      },
      error: () => {
        this.serverInvites.set([]);
        this.cdr.markForCheck();
      }
    });
  }

  createInvite(): void {
    const server = this.server();
    if (!server?.serverId || this.inviteBusy()) {
      return;
    }
    this.inviteBusy.set(true);
    this.serverWebService.createServerInvite(String(server.serverId), { maxUses: 0, expiresInHours: 168 }).pipe(take(1)).subscribe({
      next: (resp) => {
        this.inviteBusy.set(false);
        this.latestInviteCode.set(resp?.invite?.code || null);
        this.loadInvites();
        this.alertService.success('Invite created', `Code: ${resp?.invite?.code}`);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.inviteBusy.set(false);
        this.alertService.error(
          'Could not create invite',
          err?.error?.error || err?.error?.message || 'Only the owner can create invites.'
        );
        this.cdr.markForCheck();
      }
    });
  }

  copyInviteCode(code: string): void {
    if (!code || !navigator?.clipboard) {
      return;
    }
    void navigator.clipboard.writeText(code);
    this.alertService.success('Copied', 'Invite code copied to clipboard.');
  }

  /**
   * Load mock roles until role APIs are available
   */
  loadMockRoles(): void {
    const mockRoles: ServerRole[] = [
      {
        id: '1',
        name: 'Admin',
        color: '#ff0000',
        permissions: ['admin'],
        hoist: true,
        mentionable: true,
        managed: false,
        memberCount: 2,
        position: 0
      },
      {
        id: '2',
        name: 'Moderator',
        color: '#00ff00',
        permissions: ['kick_members', 'ban_members', 'manage_messages'],
        hoist: true,
        mentionable: false,
        managed: false,
        memberCount: 5,
        position: 1
      }
    ];
    this.serverRoles.set(mockRoles);
  }

  /**
   * Load real categories/channels for this server
   */
  loadServerChannels(): void {
    const server = this.server();
    if (!server?.serverId || server.serverId === 'home') {
      this.serverChannels.set([]);
      return;
    }

    this.serverWebService.getServerChannels(String(server.serverId)).pipe(take(1)).subscribe({
      next: (categories) => {
        this.serverChannels.set(this.flattenCategories(categories || []));
        this.cdr.markForCheck();
      },
      error: () => {
        this.serverChannels.set([]);
        this.alertService.error('Could not load channels', 'Failed to fetch server channels.');
        this.cdr.markForCheck();
      }
    });
  }

  private flattenCategories(categories: Category[]): ServerChannel[] {
    const flattened: ServerChannel[] = [];
    categories.forEach((category, categoryIndex) => {
      flattened.push({
        id: category.categoryId,
        name: category.categoryName,
        type: 'category',
        position: categoryIndex,
        nsfw: false
      });

      (category.channels || []).forEach((channel, channelIndex) => {
        flattened.push(this.toServerChannel(channel, channelIndex));
      });
    });
    return flattened;
  }

  private toServerChannel(channel: Channel, position = 0): ServerChannel {
    return {
      id: channel.channelId,
      name: channel.channelName,
      type: channel.type || 'text',
      position: channel.position ?? position,
      parentId: String(channel.categoryId),
      categoryId: channel.categoryId,
      topic: channel.topic,
      nsfw: !!channel.nsfw,
      isPhantom: !!channel.isPhantom,
      slowmode: channel.slowmode,
      userLimit: channel.userLimit,
      bitrate: channel.bitrate
    };
  }

  /**
   * Load real server members
   */
  loadServerMembers(): void {
    const server = this.server();
    if (!server?.serverId || server.serverId === 'home') {
      this.serverMembers.set([]);
      this.availableRoles.set([]);
      this.isLoadingMembers.set(false);
      return;
    }

    this.isLoadingMembers.set(true);
    this.serverWebService.getServerMembers(String(server.serverId)).pipe(take(1)).subscribe({
      next: (members) => {
        const list = (Array.isArray(members) ? members : []).map((member) => this.normalizeMember(member));
        this.serverMembers.set(list);
        const allRoles = list.flatMap((member) => member.roles || []);
        this.availableRoles.set([...new Set(allRoles)]);
        this.isLoadingMembers.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.serverMembers.set([]);
        this.availableRoles.set([]);
        this.isLoadingMembers.set(false);
        this.alertService.error(
          'Could not load members',
          err?.error?.error || 'Failed to fetch server members.'
        );
        this.cdr.markForCheck();
      }
    });
  }

  private normalizeMember(member: Member): Member {
    const status = String(member.status || 'offline').toLowerCase();
    const normalizedStatus: Member['status'] =
      status === 'online' || status === 'idle' || status === 'dnd' || status === 'offline'
        ? status
        : 'offline';

    return {
      ...member,
      memberId: String(member.memberId),
      memberName: member.memberName || member.username || 'Unknown',
      username: member.username || member.memberName || 'unknown',
      userPic: member.userPic || '',
      status: normalizedStatus,
      roles: member.roles?.length ? member.roles : ['Member'],
      joinedAt: member.joinedAt ? new Date(member.joinedAt) : new Date(),
      isOwner: !!member.isOwner,
      isAdmin: !!member.isAdmin,
      canManageMembers: !!member.canManageMembers,
      canManageChannels: !!member.canManageChannels,
      canManageRoles: !!member.canManageRoles
    };
  }

  /**
   * Toggle edit mode
   */
  toggleEdit(): void {
    this.isEditing.set(!this.isEditing());
  }

  /**
   * Save server changes
   */
  saveChanges(): void {
    if (this.serverName().trim() === '') {
      this.alertService.warning('Invalid Name', 'Server name cannot be empty.');
      return;
    }

    // TODO: Implement actual API call to update server
    this.alertService.success('Changes Saved', 'Server information has been updated successfully.');
    this.isEditing.set(false);
  }

  /**
   * Cancel editing
   */
  cancelEdit(): void {
    this.serverName.set(this.server()?.serverName || '');
    this.serverDescription.set(this.server()?.serverDescription || '');
    this.isEditing.set(false);
  }

  /**
   * Delete server
   */
  deleteServer(): void {
    if (confirm(`Are you sure you want to delete "${this.server()?.serverName}"? This action cannot be undone.`)) {
      // TODO: Implement actual server deletion
      this.alertService.info('Server Deleted', `Server "${this.server()?.serverName}" has been deleted.`);
      this.closeModal.emit();
    }
  }

  // Role Management Methods
  /**
   * Open role creation modal
   */
  createRole(): void {
    this.selectedRole.set(null);
    this.isEditingRole.set(false);
    this.isRoleModalOpen.set(true);
  }

  /**
   * Edit existing role
   */
  editRole(role: ServerRole): void {
    this.selectedRole.set(role);
    this.isEditingRole.set(true);
    this.isRoleModalOpen.set(true);
  }

  /**
   * Delete role with confirmation modal
   */
  deleteRole(role: ServerRole): void {
    this.confirmationData.set({
      title: 'Delete Role',
      message: `Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`,
      confirmText: 'Delete Role',
      cancelText: 'Cancel',
      isDestructive: true,
      showReasonInput: true,
      reasonPlaceholder: 'Enter reason for deleting this role...',
      reasonRequired: true
    });
    this.pendingAction.set({ type: 'deleteRole', data: role });
    this.isConfirmationModalOpen.set(true);
  }

  /**
   * Duplicate role
   */
  duplicateRole(role: ServerRole): void {
    const newRole: ServerRole = {
      ...role,
      id: Math.random().toString(36).substring(2, 15),
      name: `${role.name} Copy`,
      memberCount: 0
    };
    
    const updatedRoles = [...this.serverRoles(), newRole];
    this.serverRoles.set(updatedRoles);
    this.alertService.success('Role Duplicated', `Role "${role.name}" has been duplicated successfully.`);
  }

  /**
   * Save role changes
   */
  saveRole(roleData: Partial<ServerRole>): void {
    if (this.isEditingRole()) {
      // Update existing role
      const updatedRoles = this.serverRoles().map(role => 
        role.id === this.selectedRole()?.id ? { ...role, ...roleData } : role
      );
      this.serverRoles.set(updatedRoles);
      this.alertService.success('Role Updated', 'Role has been updated successfully.');
    } else {
      // Create new role
      const newRole: ServerRole = {
        id: Math.random().toString(36).substring(2, 15),
        name: roleData.name || 'New Role',
        color: roleData.color || '#99aab5',
        permissions: roleData.permissions || [],
        memberCount: 0,
        position: this.serverRoles().length,
        hoist: roleData.hoist || false,
        mentionable: roleData.mentionable || false,
        managed: false
      };
      
      const updatedRoles = [...this.serverRoles(), newRole];
      this.serverRoles.set(updatedRoles);
      this.alertService.success('Role Created', 'New role has been created successfully.');
    }
    
    this.closeRoleModal();
  }

  /**
   * Close role modal
   */
  closeRoleModal(): void {
    this.isRoleModalOpen.set(false);
    this.selectedRole.set(null);
    this.isEditingRole.set(false);
  }

  /**
   * Move role up in hierarchy
   */
  moveRoleUp(role: ServerRole): void {
    const roles = [...this.serverRoles()];
    const currentIndex = roles.findIndex(r => r.id === role.id);
    
    if (currentIndex > 0) {
      [roles[currentIndex], roles[currentIndex - 1]] = [roles[currentIndex - 1], roles[currentIndex]];
      
      // Update positions
      roles.forEach((r, index) => {
        r.position = index + 1;
      });
      
      this.serverRoles.set(roles);
      
      // Call backend API to update role positions
      const roleOrder = roles.map(r => ({ roleId: r.id, position: r.position }));
      this.serverWebService.reorderRoles(this.server()!.serverId, roleOrder).subscribe({
        next: () => console.log('Role moved up successfully'),
        error: (error: any) => console.error('Failed to move role up:', error)
      });
    }
  }

  /**
   * Move role down in hierarchy
   */
  moveRoleDown(role: ServerRole): void {
    const roles = [...this.serverRoles()];
    const currentIndex = roles.findIndex(r => r.id === role.id);
    
    if (currentIndex < roles.length - 1) {
      [roles[currentIndex], roles[currentIndex + 1]] = [roles[currentIndex + 1], roles[currentIndex]];
      
      // Update positions
      roles.forEach((r, index) => {
        r.position = index + 1;
      });
      
      this.serverRoles.set(roles);
      
      // Call backend API to update role positions
      const roleOrder = roles.map(r => ({ roleId: r.id, position: r.position }));
      this.serverWebService.reorderRoles(this.server()!.serverId, roleOrder).subscribe({
        next: () => console.log('Role moved down successfully'),
        error: (error: any) => console.error('Failed to move role down:', error)
      });
    }
  }

  /**
   * Check if role can move up
   */
  canMoveUp(role: ServerRole): boolean {
    const roles = this.serverRoles();
    const currentIndex = roles.findIndex(r => r.id === role.id);
    return currentIndex > 0;
  }

  /**
   * Check if role can move down
   */
  canMoveDown(role: ServerRole): boolean {
    const roles = this.serverRoles();
    const currentIndex = roles.findIndex(r => r.id === role.id);
    return currentIndex < roles.length - 1;
  }

  // Channel Management Methods
  /**
   * Open channel creation modal
   */
  createChannel(): void {
    this.selectedChannel.set(null);
    this.isEditingChannel.set(false);
    this.isChannelModalOpen.set(true);
  }

  /**
   * Edit existing channel
   */
  editChannel(channel: ServerChannel): void {
    this.selectedChannel.set(channel);
    this.isEditingChannel.set(true);
    this.isChannelModalOpen.set(true);
  }

  /**
   * Delete channel with confirmation modal
   */
  deleteChannel(channel: ServerChannel): void {
    this.confirmationData.set({
      title: 'Delete Channel',
      message: `Are you sure you want to delete the channel "${channel.name}"? This action cannot be undone.`,
      confirmText: 'Delete Channel',
      cancelText: 'Cancel',
      isDestructive: true,
      showReasonInput: true,
      reasonPlaceholder: 'Enter reason for deleting this channel...',
      reasonRequired: true
    });
    this.pendingAction.set({ type: 'deleteChannel', data: channel });
    this.isConfirmationModalOpen.set(true);
  }

  /**
   * Duplicate channel
   */
  duplicateChannel(channel: ServerChannel): void {
    const newChannel: ServerChannel = {
      ...channel,
      id: Math.floor(Math.random() * 10000) + 1000, // Generate numeric ID
      name: `${channel.name}-copy`,
      position: this.serverChannels().length
    };
    
    const updatedChannels = [...this.serverChannels(), newChannel];
    this.serverChannels.set(updatedChannels);
    this.alertService.success('Channel Duplicated', `Channel "${channel.name}" has been duplicated successfully.`);
  }

  /**
   * Save channel changes
   */
  saveChannel(channelData: Partial<ServerChannel>): void {
    const server = this.server();
    if (!server?.serverId || server.serverId === 'home') {
      return;
    }

    const selected = this.selectedChannel();
    if (this.isEditingChannel() && selected?.type === 'category') {
      this.alertService.warning('Not supported', 'Category renaming is not available yet.');
      this.closeChannelModal();
      return;
    }

    const payload: Partial<Channel> = {
      channelName: channelData.name,
      categoryId: Number(channelData.categoryId || channelData.parentId || 0),
      type: channelData.type || 'text',
      topic: channelData.topic,
      nsfw: !!channelData.nsfw,
      isPhantom: !!channelData.isPhantom,
      slowmode: channelData.slowmode,
      userLimit: channelData.userLimit,
      bitrate: channelData.bitrate
    };

    if (!payload.categoryId && payload.type !== 'category') {
      this.alertService.error('Missing category', 'Choose a category for this channel.');
      return;
    }

    const request$ = this.isEditingChannel() && selected
      ? this.serverWebService.updateChannel(String(server.serverId), selected.id, payload)
      : this.serverWebService.createChannel(String(server.serverId), payload);

    request$.pipe(take(1)).subscribe({
      next: () => {
        this.alertService.success(
          this.isEditingChannel() ? 'Channel Updated' : 'Channel Created',
          this.isEditingChannel()
            ? 'Channel has been updated successfully.'
            : 'New channel has been created successfully.'
        );
        this.closeChannelModal();
        this.loadServerChannels();
      },
      error: (err) => {
        this.alertService.error(
          this.isEditingChannel() ? 'Could not update channel' : 'Could not create channel',
          err?.error?.message || 'Only the server owner can manage channels.'
        );
      }
    });
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
   * Move channel up in hierarchy
   */
  moveChannelUp(channel: ServerChannel): void {
    const channels = [...this.serverChannels()];
    const currentIndex = channels.findIndex(c => c.id === channel.id);
    
    if (currentIndex > 0) {
      [channels[currentIndex], channels[currentIndex - 1]] = [channels[currentIndex - 1], channels[currentIndex]];
      
      // Update positions
      channels.forEach((c, index) => {
        c.position = index + 1;
      });
      
      this.serverChannels.set(channels);
      
      // Call backend API to update channel positions
      const channelOrder = channels.map(c => ({ channelId: c.id, position: c.position }));
      this.serverWebService.reorderChannels(this.server()!.serverId, channelOrder).subscribe({
        next: () => console.log('Channel moved up successfully'),
        error: (error: any) => console.error('Failed to move channel up:', error)
      });
    }
  }

  /**
   * Move channel down in hierarchy
   */
  moveChannelDown(channel: ServerChannel): void {
    const channels = [...this.serverChannels()];
    const currentIndex = channels.findIndex(c => c.id === channel.id);
    
    if (currentIndex < channels.length - 1) {
      [channels[currentIndex], channels[currentIndex + 1]] = [channels[currentIndex + 1], channels[currentIndex]];
      
      // Update positions
      channels.forEach((c, index) => {
        c.position = index + 1;
      });
      
      this.serverChannels.set(channels);
      
      // Call backend API to update channel positions
      const channelOrder = channels.map(c => ({ channelId: c.id, position: c.position }));
      this.serverWebService.reorderChannels(this.server()!.serverId, channelOrder).subscribe({
        next: () => console.log('Channel moved down successfully'),
        error: (error: any) => console.error('Failed to move channel down:', error)
      });
    }
  }

  /**
   * Check if channel can move up
   */
  canMoveChannelUp(channel: ServerChannel): boolean {
    const channels = this.serverChannels();
    const currentIndex = channels.findIndex(c => c.id === channel.id);
    return currentIndex > 0;
  }

  /**
   * Check if channel can move down
   */
  canMoveChannelDown(channel: ServerChannel): boolean {
    const channels = this.serverChannels();
    const currentIndex = channels.findIndex(c => c.id === channel.id);
    return currentIndex < channels.length - 1;
  }

  /**
   * Get role color style
   */
  getRoleColorStyle(color: string): string {
    return `color: ${color}`;
  }

  /**
   * Get status color for member status indicator
   */
  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'online': 'bg-green-500',
      'idle': 'bg-yellow-500',
      'dnd': 'bg-red-500',
      'offline': 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
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
   * Channels belonging to a category
   */
  getChannelsInCategory(categoryId: number | string): ServerChannel[] {
    const parent = String(categoryId);
    return this.serverChannels().filter(
      (c) => c.type !== 'category' && String(c.parentId || c.categoryId || '') === parent
    );
  }

  /**
   * Close the modal
   */
  close(): void {
    this.closeModal.emit();
  }

  /**
   * Open user profile modal
   */
  openUserProfile(member: Member): void {
    this.selectedMember.set(member);
    this.isUserProfileModalOpen.set(true);
  }

  /**
   * Close user profile modal
   */
  closeUserProfileModal(): void {
    this.isUserProfileModalOpen.set(false);
    this.selectedMember.set(null);
  }

  /**
   * Handle escape key
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  /**
   * Handle confirmation modal result
   */
  onConfirmationResult(result: { confirmed: boolean; reason?: string }): void {
    if (result.confirmed && this.pendingAction()) {
      const action = this.pendingAction()!;
      
      switch (action.type) {
        case 'deleteRole':
          this.executeDeleteRole(action.data, result.reason);
          break;
        case 'deleteChannel':
          this.executeDeleteChannel(action.data, result.reason);
          break;
      }
    }
    
    this.isConfirmationModalOpen.set(false);
    this.confirmationData.set(null);
    this.pendingAction.set(null);
  }

  /**
   * Execute delete role action
   */
  private executeDeleteRole(role: ServerRole, reason?: string): void {
    const updatedRoles = this.serverRoles().filter(r => r.id !== role.id);
    this.serverRoles.set(updatedRoles);
    console.log('Role deleted successfully', reason ? `with reason: ${reason}` : '');
  }

  /**
   * Execute delete channel action
   */
  private executeDeleteChannel(channel: ServerChannel, reason?: string): void {
    const updatedChannels = this.serverChannels().filter(c => c.id !== channel.id);
    this.serverChannels.set(updatedChannels);
    console.log('Channel deleted successfully', reason ? `with reason: ${reason}` : '');
  }
}
