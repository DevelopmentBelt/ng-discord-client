import { ChangeDetectionStrategy, Component, OnInit, signal, WritableSignal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServerRole, Permission } from '../server-settings-modal/server-settings-modal.component';

@Component({
  selector: 'app-role-management-modal',
  templateUrl: './role-management-modal.component.html',
  styleUrls: ['./role-management-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class RoleManagementModalComponent implements OnInit {
  // Input Signals
  role = input<ServerRole | null>(null);
  isEditing = input<boolean>(false);
  availablePermissions = input<Permission[]>([]);
  
  // Output Signals
  closeModal = output<void>();
  saveRole = output<Partial<ServerRole>>();

  // Form data
  roleName: WritableSignal<string> = signal('');
  roleColor: WritableSignal<string> = signal('#99aab5');
  selectedPermissions: WritableSignal<string[]> = signal([]);
  hoistRole: WritableSignal<boolean> = signal(false);
  mentionableRole: WritableSignal<boolean> = signal(false);

  // Permission categories
  permissionCategories: string[] = [];

  constructor() {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadPermissionCategories();
  }

  /**
   * Initialize form with existing role data or defaults
   */
  private initializeForm(): void {
    if (this.role() && this.isEditing()) {
      this.roleName.set(this.role()!.name);
      this.roleColor.set(this.role()!.color);
      this.selectedPermissions.set([...this.role()!.permissions]);
      this.hoistRole.set(this.role()!.hoist);
      this.mentionableRole.set(this.role()!.mentionable);
    } else {
      this.roleName.set('');
      this.roleColor.set('#99aab5');
      this.selectedPermissions.set([]);
      this.hoistRole.set(false);
      this.mentionableRole.set(false);
    }
  }

  /**
   * Load unique permission categories
   */
  private loadPermissionCategories(): void {
    this.permissionCategories = [...new Set(this.availablePermissions().map(p => p.category))];
  }

  /**
   * Get permissions by category
   */
  getPermissionsByCategory(category: string): Permission[] {
    return this.availablePermissions().filter(p => p.category === category);
  }

  /**
   * Toggle permission selection
   */
  togglePermission(permissionId: string): void {
    const currentPermissions = this.selectedPermissions();
    if (currentPermissions.includes(permissionId)) {
      this.selectedPermissions.set(currentPermissions.filter(p => p !== permissionId));
    } else {
      this.selectedPermissions.set([...currentPermissions, permissionId]);
    }
  }

  /**
   * Check if permission is selected
   */
  isPermissionSelected(permissionId: string): boolean {
    return this.selectedPermissions().includes(permissionId);
  }

  /**
   * Handle color change
   */
  onColorChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.roleColor.set(target.value);
  }

  /**
   * Save role
   */
  save(): void {
    if (this.roleName().trim() === '') {
      alert('Role name cannot be empty');
      return;
    }

    const roleData: Partial<ServerRole> = {
      name: this.roleName().trim(),
      color: this.roleColor(),
      permissions: this.selectedPermissions(),
      hoist: this.hoistRole(),
      mentionable: this.mentionableRole()
    };

    this.saveRole.emit(roleData);
  }

  /**
   * Close modal
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
