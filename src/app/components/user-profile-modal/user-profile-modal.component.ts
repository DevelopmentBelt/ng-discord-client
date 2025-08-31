import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Member } from '../../models/member/member';

@Component({
  selector: 'app-user-profile-modal',
  templateUrl: './user-profile-modal.component.html',
  styleUrls: ['./user-profile-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class UserProfileModalComponent {
  // Input Signals
  member = input<Member | null>(null);
  isOpen = input<boolean>(false);
  
  // Output Signals
  closeModal = output<void>();

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
   * Get status color
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
   * Get status text
   */
  getStatusText(status: string): string {
    const texts: { [key: string]: string } = {
      'online': 'Online',
      'idle': 'Idle',
      'dnd': 'Do Not Disturb',
      'offline': 'Offline'
    };
    return texts[status] || 'Offline';
  }

  /**
   * Get role color based on role name
   */
  getRoleColor(role: string): string {
    const colors: { [key: string]: string } = {
      'Owner': 'bg-yellow-600',
      'Admin': 'bg-red-600',
      'Moderator': 'bg-blue-600',
      'Member': 'bg-gray-600'
    };
    return colors[role] || 'bg-gray-600';
  }
}
