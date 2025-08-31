import { ChangeDetectionStrategy, Component, OnInit, signal, WritableSignal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Member } from '../../models/member/member';
import { ServerRole } from '../server-settings-modal/server-settings-modal.component';

export interface RoleEditingData {
  member: Member;
  currentRoles: string[];
  availableRoles: string[];
  allRoles?: ServerRole[]; // Add this to support reordering
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

  /**
   * Move role up in hierarchy
   */
  moveRoleUp(role: ServerRole): void {
    const roles = this.data()?.allRoles || [];
    const currentIndex = roles.findIndex(r => r.id === role.id);
    
    if (currentIndex > 0) {
      const newRoles = [...roles];
      [newRoles[currentIndex], newRoles[currentIndex - 1]] = [newRoles[currentIndex - 1], newRoles[currentIndex]];
      
      // Update positions
      newRoles.forEach((r, index) => {
        r.position = index + 1;
      });
      
      // Emit updated roles
      this.saveRoles.emit(newRoles.map(r => r.name));
    }
  }

  /**
   * Move role down in hierarchy
   */
  moveRoleDown(role: ServerRole): void {
    const roles = this.data()?.allRoles || [];
    const currentIndex = roles.findIndex(r => r.id === role.id);
    
    if (currentIndex < roles.length - 1) {
      const newRoles = [...roles];
      [newRoles[currentIndex], newRoles[currentIndex + 1]] = [newRoles[currentIndex + 1], newRoles[currentIndex]];
      
      // Update positions
      newRoles.forEach((r, index) => {
        r.position = index + 1;
      });
      
      // Emit updated roles
      this.saveRoles.emit(newRoles.map(r => r.name));
    }
  }

  /**
   * Check if role can move up
   */
  canMoveUp(role: ServerRole): boolean {
    const roles = this.data()?.allRoles || [];
    const currentIndex = roles.findIndex(r => r.id === role.id);
    return currentIndex > 0;
  }

  /**
   * Check if role can move down
   */
  canMoveDown(role: ServerRole): boolean {
    const roles = this.data()?.allRoles || [];
    const currentIndex = roles.findIndex(r => r.id === role.id);
    return currentIndex < roles.length - 1;
  }

  /**
   * Move role up in hierarchy by index
   */
  moveRoleUpByIndex(index: number): void {
    if (index > 0) {
      const roles = [...this.selectedRoles()];
      [roles[index], roles[index - 1]] = [roles[index - 1], roles[index]];
      this.selectedRoles.set(roles);
    }
  }

  /**
   * Move role down in hierarchy by index
   */
  moveRoleDownByIndex(index: number): void {
    if (index < this.selectedRoles().length - 1) {
      const roles = [...this.selectedRoles()];
      [roles[index], roles[index + 1]] = [roles[index + 1], roles[index]];
      this.selectedRoles.set(roles);
    }
  }
}
