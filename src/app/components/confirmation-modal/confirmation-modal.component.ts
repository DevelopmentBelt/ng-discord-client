import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmationData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  isDestructive?: boolean;
}

@Component({
  selector: 'app-confirmation-modal',
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class ConfirmationModalComponent {
  // Input Signals
  data = input.required<ConfirmationData>();
  isOpen = input.required<boolean>();
  
  // Output Signals
  confirmed = output<void>();
  cancelled = output<void>();

  /**
   * Handle confirmation
   */
  onConfirm(): void {
    this.confirmed.emit();
  }

  /**
   * Handle cancellation
   */
  onCancel(): void {
    this.cancelled.emit();
  }

  /**
   * Get confirm button class
   */
  getConfirmButtonClass(): string {
    const baseClass = 'px-4 py-2 font-medium rounded-md transition-colors duration-150';
    if (this.data()?.isDestructive) {
      return `${baseClass} bg-red-600 hover:bg-red-700 text-white`;
    }
    return `${baseClass} bg-discord-blue hover:bg-discord-blue-dark text-white`;
  }
}
