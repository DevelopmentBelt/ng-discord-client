import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Server } from '../../models/server/server';
import { AlertService } from '../../services/alert-service/alert-service';

export interface ServerRole {
  id: string;
  name: string;
  color: string;
  permissions: string[];
  memberCount: number;
}

export interface ServerChannel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'category';
  position: number;
}

@Component({
  selector: 'app-server-settings-modal',
  templateUrl: './server-settings-modal.component.html',
  styleUrls: ['./server-settings-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ServerSettingsModalComponent implements OnInit {
  @Input() server: Server | null = null;
  @Output() closeModal = new EventEmitter<void>();

  // Active tab
  activeTab: WritableSignal<string> = signal('overview');

  // Form data
  serverName: WritableSignal<string> = signal('');
  serverDescription: WritableSignal<string> = signal('');
  isEditing: WritableSignal<boolean> = signal(false);

  // Mock data for roles and channels
  serverRoles: WritableSignal<ServerRole[]> = signal([]);
  serverChannels: WritableSignal<ServerChannel[]> = signal([]);

  // Settings states
  verificationLevel: WritableSignal<string> = signal('Low');
  explicitContentFilter: WritableSignal<string> = signal('Medium');

  constructor(private alertService: AlertService) {}

  ngOnInit(): void {
    if (this.server) {
      this.serverName.set(this.server.serverName);
      this.serverDescription.set(this.server.serverDescription || '');
      this.loadServerData();
    }
  }

  /**
   * Load server data (roles, channels, etc.)
   */
  private loadServerData(): void {
    // TODO: Replace with actual API calls
    const mockRoles: ServerRole[] = [
      { id: '1', name: 'Owner', color: '#ff6b6b', permissions: ['Administrator'], memberCount: 1 },
      { id: '2', name: 'Admin', color: '#4ecdc4', permissions: ['Manage Server', 'Manage Roles'], memberCount: 3 },
      { id: '3', name: 'Moderator', color: '#45b7d1', permissions: ['Manage Messages', 'Kick Members'], memberCount: 5 },
      { id: '4', name: 'Member', color: '#96ceb4', permissions: ['Send Messages', 'Read Messages'], memberCount: 150 }
    ];

    const mockChannels: ServerChannel[] = [
      { id: '1', name: 'Information', type: 'category', position: 0 },
      { id: '2', name: 'general', type: 'text', position: 1 },
      { id: '3', name: 'announcements', type: 'text', position: 2 },
      { id: '4', name: 'Voice Channels', type: 'category', position: 3 },
      { id: '5', name: 'General Voice', type: 'voice', position: 4 }
    ];

    this.serverRoles.set(mockRoles);
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
    this.serverName.set(this.server?.serverName || '');
    this.serverDescription.set(this.server?.serverDescription || '');
    this.isEditing.set(false);
  }

  /**
   * Delete server
   */
  deleteServer(): void {
    if (confirm(`Are you sure you want to delete "${this.server?.serverName}"? This action cannot be undone.`)) {
      // TODO: Implement actual server deletion
      this.alertService.info('Server Deleted', `Server "${this.server?.serverName}" has been deleted.`);
      this.closeModal.emit();
    }
  }

  /**
   * Create new role
   */
  createRole(): void {
    // TODO: Implement role creation modal
    this.alertService.info('Create Role', 'Role creation feature coming soon!');
  }

  /**
   * Create new channel
   */
  createChannel(): void {
    // TODO: Implement channel creation modal
    this.alertService.info('Create Channel', 'Channel creation feature coming soon!');
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
}
