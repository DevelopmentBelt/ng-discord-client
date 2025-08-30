import { ChangeDetectionStrategy, Component, OnInit, signal, WritableSignal, input, output } from '@angular/core';
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

  constructor(private alertService: AlertService) {}

  ngOnInit(): void {
    if (this.server()) {
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
