import { ChangeDetectionStrategy, Component, OnInit, signal, WritableSignal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Server } from '../../models/server/server';
import { AlertService } from '../../services/alert-service/alert-service';
import { RoleManagementModalComponent } from '../role-management-modal/role-management-modal.component';
import { ChannelManagementModalComponent } from '../channel-management-modal/channel-management-modal.component';
import { ConfirmationModalComponent, ConfirmationData } from '../confirmation-modal/confirmation-modal.component';

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
  id: string;
  name: string;
  type: 'text' | 'voice' | 'category';
  position: number;
  parentId?: string;
  topic?: string;
  nsfw: boolean;
  slowmode?: number;
  userLimit?: number;
  bitrate?: number;
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
  imports: [CommonModule, FormsModule, RoleManagementModalComponent, ChannelManagementModalComponent, ConfirmationModalComponent]
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

  // Settings states
  verificationLevel: WritableSignal<string> = signal('Low');
  explicitContentFilter: WritableSignal<string> = signal('Medium');

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

  constructor(private alertService: AlertService) {}

  ngOnInit(): void {
    if (this.server()) {
      this.initializeForm();
      this.loadMockData();
    }
  }

  /**
   * Initialize form with server data
   */
  initializeForm(): void {
    if (this.server()) {
      this.serverName.set(this.server()!.serverName);
      this.serverDescription.set(this.server()!.serverDescription || '');
    }
  }

  /**
   * Load mock data for development
   */
  loadMockData(): void {
    // Mock roles
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

    // Mock channels
    const mockChannels: ServerChannel[] = [
      {
        id: '1',
        name: 'general',
        type: 'text',
        topic: 'General discussion',
        parentId: '1',
        position: 0,
        nsfw: false
      },
      {
        id: '2',
        name: 'announcements',
        type: 'text',
        topic: 'Server announcements',
        parentId: '1',
        position: 1,
        nsfw: false
      }
    ];
    this.serverChannels.set(mockChannels);
  }

  /**
   * Switch between tabs
   */
  switchTab(tab: string): void {
    this.activeTab.set(tab);
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
      id: Math.random().toString(36).substring(2, 15),
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
    if (this.isEditingChannel()) {
      // Update existing channel
      const updatedChannels = this.serverChannels().map(channel => 
        channel.id === this.selectedChannel()?.id ? { ...channel, ...channelData } : channel
      );
      this.serverChannels.set(updatedChannels);
      this.alertService.success('Channel Updated', 'Channel has been updated successfully.');
    } else {
      // Create new channel
      const newChannel: ServerChannel = {
        id: Math.random().toString(36).substring(2, 15),
        name: channelData.name || 'new-channel',
        type: channelData.type || 'text',
        position: this.serverChannels().length,
        parentId: channelData.parentId,
        topic: channelData.topic,
        nsfw: channelData.nsfw || false,
        slowmode: channelData.slowmode,
        userLimit: channelData.userLimit,
        bitrate: channelData.bitrate
      };
      
      const updatedChannels = [...this.serverChannels(), newChannel];
      this.serverChannels.set(updatedChannels);
      this.alertService.success('Channel Created', 'New channel has been created successfully.');
    }
    
    this.closeChannelModal();
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
   * Get role color style
   */
  getRoleColorStyle(color: string): string {
    return `color: ${color}`;
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
   * Get top-level channels (non-category channels)
   */
  get getTopLevelChannels(): ServerChannel[] {
    return this.serverChannels().filter(c => !c.parentId);
  }

  /**
   * Get category channels
   */
  get getCategoryChannels(): ServerChannel[] {
    return this.serverChannels().filter(c => c.type === 'category');
  }

  /**
   * Close the modal
   */
  close(): void {
    this.closeModal.emit();
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
