import { ChangeDetectionStrategy, Component, OnInit, signal, WritableSignal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Member } from '../../models/member/member';

export interface RoleEditingData {
  member: Member;
  currentRoles: string[];
  availableRoles: string[];
}

@Component({
  selector: 'app-role-editing-modal',
  templateUrl: './role-editing-modal.component.html',
  styleUrls: ['./role-editing-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class RoleEditingModalComponent implements OnInit {
  // Input Signals
  data = input.required<RoleEditingData>();
  isOpen = input.required<boolean>();
  
  // Output Signals
  saveRoles = output<string[]>();
  closeModal = output<void>();

  // Form data
  selectedRoles: WritableSignal<string[]> = signal([]);
  newRoleInput: WritableSignal<string> = signal('');

  constructor() {}

  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Initialize form with current data
   */
  initializeForm(): void {
    if (this.data()) {
      this.selectedRoles.set([...this.data()!.currentRoles]);
    }
  }

  /**
   * Toggle role selection
   */
  toggleRole(role: string): void {
    const currentRoles = this.selectedRoles();
    if (currentRoles.includes(role)) {
      this.selectedRoles.set(currentRoles.filter(r => r !== role));
    } else {
      this.selectedRoles.set([...currentRoles, role]);
    }
  }

  /**
   * Add custom role
   */
  addCustomRole(): void {
    const role = this.newRoleInput().trim();
    if (role && !this.selectedRoles().includes(role)) {
      this.selectedRoles.set([...this.selectedRoles(), role]);
      this.newRoleInput.set('');
    }
  }

  /**
   * Remove role
   */
  removeRole(role: string): void {
    this.selectedRoles.set(this.selectedRoles().filter(r => r !== role));
  }

  /**
   * Save roles
   */
  save(): void {
    this.saveRoles.emit(this.selectedRoles());
  }

  /**
   * Close modal
   */
  close(): void {
    this.closeModal.emit();
  }

  /**
   * Check if role is selected
   */
  isRoleSelected(role: string): boolean {
    return this.selectedRoles().includes(role);
  }

  /**
   * Handle keydown events
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }
}
