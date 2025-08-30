import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Server } from '../../models/server/server';
import { AlertService } from '../../services/alert-service/alert-service';

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
  imports: [CommonModule]
})
export class ServerOverviewModalComponent implements OnInit {
  @Input() server: Server | null = null;
  @Output() closeModal = new EventEmitter<void>();

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

  constructor(private alertService: AlertService) {}

  ngOnInit(): void {
    if (this.server) {
      this.loadServerStats();
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
   * Switch between tabs
   */
  switchTab(tab: string): void {
    this.activeTab.set(tab);
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
   * Copy server invite link
   */
  copyInviteLink(): void {
    // TODO: Generate actual invite link
    const inviteLink = `https://discord.gg/${Math.random().toString(36).substring(2, 8)}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      this.alertService.success('Invite Link Copied', 'Server invite link has been copied to clipboard!');
    }).catch(() => {
      this.alertService.error('Copy Failed', 'Failed to copy invite link to clipboard.');
    });
  }

  /**
   * Leave server
   */
  leaveServer(): void {
    if (confirm(`Are you sure you want to leave "${this.server?.serverName}"?`)) {
      // TODO: Implement actual server leave functionality
      this.alertService.info('Server Left', `You have left ${this.server?.serverName}`);
      this.closeModal.emit();
    }
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
