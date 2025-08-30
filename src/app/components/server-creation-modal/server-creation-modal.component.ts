import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../services/alert-service/alert-service';

export interface NewServerData {
  serverName: string;
  serverDescription: string;
  serverIcon: File | null;
  isPublic: boolean;
  verificationLevel: string;
}

@Component({
  selector: 'app-server-creation-modal',
  templateUrl: './server-creation-modal.component.html',
  styleUrls: ['./server-creation-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ServerCreationModalComponent implements OnInit {
  @Output() closeModal = new EventEmitter<void>();
  @Output() serverCreated = new EventEmitter<NewServerData>();

  // Form data
  serverName: WritableSignal<string> = signal('');
  serverDescription: WritableSignal<string> = signal('');
  serverIcon: WritableSignal<File | null> = signal(null);
  isPublic: WritableSignal<boolean> = signal(false);
  verificationLevel: WritableSignal<string> = signal('Low');

  // UI states
  isCreating: WritableSignal<boolean> = signal(false);
  selectedIconPreview: WritableSignal<string | null> = signal(null);

  // Validation states
  errors: WritableSignal<string[]> = signal([]);

  constructor(private alertService: AlertService) {}

  ngOnInit(): void {
    // Set default values
    this.verificationLevel.set('Low');
  }

  /**
   * Handle file selection for server icon
   */
  onIconSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.alertService.error('Invalid File Type', 'Please select an image file (PNG, JPG, GIF, etc.)');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.alertService.error('File Too Large', 'Server icon must be less than 5MB');
        return;
      }

      this.serverIcon.set(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedIconPreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Remove selected icon
   */
  removeIcon(): void {
    this.serverIcon.set(null);
    this.selectedIconPreview.set(null);
  }

  /**
   * Validate form data
   */
  private validateForm(): boolean {
    const newErrors: string[] = [];

    if (!this.serverName().trim()) {
      newErrors.push('Server name is required');
    } else if (this.serverName().trim().length < 2) {
      newErrors.push('Server name must be at least 2 characters long');
    } else if (this.serverName().trim().length > 100) {
      newErrors.push('Server name must be less than 100 characters');
    }

    if (this.serverDescription().trim().length > 500) {
      newErrors.push('Server description must be less than 500 characters');
    }

    this.errors.set(newErrors);
    return newErrors.length === 0;
  }

  /**
   * Create the server
   */
  async createServer(): Promise<void> {
    if (!this.validateForm()) {
      return;
    }

    this.isCreating.set(true);

    try {
      // TODO: Replace with actual API call to create server
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const serverData: NewServerData = {
        serverName: this.serverName().trim(),
        serverDescription: this.serverDescription().trim(),
        serverIcon: this.serverIcon(),
        isPublic: this.isPublic(),
        verificationLevel: this.verificationLevel()
      };

      // Emit the created server data
      this.serverCreated.emit(serverData);
      
      this.alertService.success(
        'Server Created!', 
        `Server "${serverData.serverName}" has been created successfully.`
      );

      this.closeModal.emit();
    } catch (error) {
      this.alertService.error(
        'Creation Failed', 
        'Failed to create server. Please try again.'
      );
      console.error('Server creation error:', error);
    } finally {
      this.isCreating.set(false);
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

  /**
   * Get verification level description
   */
  getVerificationLevelDescription(level: string): string {
    const descriptions: { [key: string]: string } = {
      'None': 'Unrestricted access - anyone can join',
      'Low': 'Must have verified email on their Discord account',
      'Medium': 'Must be registered on Discord for longer than 5 minutes',
      'High': 'Must be a member of the server for longer than 10 minutes',
      'Very High': 'Must have a verified phone number on their Discord account'
    };
    return descriptions[level] || '';
  }

  /**
   * Get character count for description
   */
  getDescriptionCharCount(): number {
    return this.serverDescription().length;
  }

  /**
   * Get character count color class
   */
  getDescriptionCharCountColor(): string {
    const count = this.getDescriptionCharCount();
    if (count > 450) return 'text-red-400';
    if (count > 400) return 'text-yellow-400';
    return 'text-discord-text-muted';
  }
}
