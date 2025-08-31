import { ChangeDetectionStrategy, Component, input, output, WritableSignal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ConfirmationData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  isDestructive?: boolean;
  showReasonInput?: boolean;
  reasonPlaceholder?: string;
  reasonRequired?: boolean;
}

@Component({
  selector: 'app-confirmation-modal',
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ConfirmationModalComponent {
  // Input Signals
  data = input.required<ConfirmationData>();
  isOpen = input.required<boolean>();
  
  // Output Signals
  confirmed = output<{ confirmed: boolean; reason?: string }>();
  cancelled = output<void>();

  // Form data
  reasonInput: WritableSignal<string> = signal('');

  /**
   * Handle confirmation
   */
  onConfirm(): void {
    const reason = this.data()?.showReasonInput ? this.reasonInput() : undefined;
    this.confirmed.emit({ confirmed: true, reason });
  }

  /**
   * Check if confirm button should be disabled
   */
  isConfirmDisabled(): boolean {
    if (this.data()?.showReasonInput && this.data()?.reasonRequired) {
      return this.reasonInput().trim().length === 0;
    }
    return false;
  }

  /**
   * Reset reason input when modal opens
   */
  ngOnChanges(): void {
    if (this.data()?.showReasonInput) {
      this.reasonInput.set('');
    }
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
