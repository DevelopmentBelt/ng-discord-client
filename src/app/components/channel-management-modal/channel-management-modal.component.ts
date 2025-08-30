import { ChangeDetectionStrategy, Component, OnInit, signal, WritableSignal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServerChannel } from '../server-settings-modal/server-settings-modal.component';

@Component({
  selector: 'app-channel-management-modal',
  templateUrl: './channel-management-modal.component.html',
  styleUrls: ['./channel-management-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ChannelManagementModalComponent implements OnInit {
  // Input Signals
  channel = input<ServerChannel | null>(null);
  isEditing = input<boolean>(false);
  categories = input<ServerChannel[]>([]);
  
  // Output Signals
  closeModal = output<void>();
  saveChannel = output<Partial<ServerChannel>>();

  // Form data
  channelName: WritableSignal<string> = signal('');
  channelType: WritableSignal<'text' | 'voice' | 'category'> = signal('text');
  channelTopic: WritableSignal<string> = signal('');
  selectedCategory: WritableSignal<string> = signal('');
  isNsfw: WritableSignal<boolean> = signal(false);
  slowmode: WritableSignal<number> = signal(0);
  userLimit: WritableSignal<number> = signal(0);
  bitrate: WritableSignal<number> = signal(64000);

  // Available channel types
  channelTypes = [
    { value: 'text', label: 'Text Channel', description: 'Send messages, images, GIFs, stickers, opinions, and puns' },
    { value: 'voice', label: 'Voice Channel', description: 'Hang out together with voice, video, and screen share' },
    { value: 'category', label: 'Category', description: 'Organize your channels with categories' }
  ];

  // Slowmode options
  slowmodeOptions = [
    { value: 0, label: 'Off' },
    { value: 5, label: '5 seconds' },
    { value: 10, label: '10 seconds' },
    { value: 15, label: '15 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 300, label: '5 minutes' },
    { value: 900, label: '15 minutes' },
    { value: 1800, label: '30 minutes' },
    { value: 3600, label: '1 hour' },
    { value: 7200, label: '2 hours' },
    { value: 21600, label: '6 hours' }
  ];

  // Bitrate options for voice channels
  bitrateOptions = [
    { value: 64000, label: '64 kbps' },
    { value: 96000, label: '96 kbps' },
    { value: 128000, label: '128 kbps' },
    { value: 256000, label: '256 kbps' },
    { value: 384000, label: '384 kbps' }
  ];

  constructor() {}

  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Initialize form with existing channel data or defaults
   */
  private initializeForm(): void {
    if (this.channel() && this.isEditing()) {
      this.channelName.set(this.channel()!.name);
      this.channelType.set(this.channel()!.type);
      this.channelTopic.set(this.channel()!.topic || '');
      this.selectedCategory.set(this.channel()!.parentId || '');
      this.isNsfw.set(this.channel()!.nsfw);
      this.slowmode.set(this.channel()!.slowmode || 0);
      this.userLimit.set(this.channel()!.userLimit || 0);
      this.bitrate.set(this.channel()!.bitrate || 64000);
    } else {
      this.channelName.set('');
      this.channelType.set('text');
      this.channelTopic.set('');
      this.selectedCategory.set('');
      this.isNsfw.set(false);
      this.slowmode.set(0);
      this.userLimit.set(0);
      this.bitrate.set(64000);
    }
  }

  /**
   * Handle channel type change
   */
  onChannelTypeChange(): void {
    // Reset type-specific fields when changing channel type
    if (this.channelType() === 'text') {
      this.userLimit.set(0);
      this.bitrate.set(64000);
    } else if (this.channelType() === 'voice') {
      this.channelTopic.set('');
      this.slowmode.set(0);
    } else if (this.channelType() === 'category') {
      this.channelTopic.set('');
      this.slowmode.set(0);
      this.userLimit.set(0);
      this.bitrate.set(64000);
      this.selectedCategory.set('');
    }
  }

  /**
   * Validate channel name
   */
  validateChannelName(): boolean {
    const name = this.channelName().trim();
    if (name.length === 0) {
      alert('Channel name cannot be empty');
      return false;
    }
    if (name.length > 100) {
      alert('Channel name cannot exceed 100 characters');
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(name)) {
      alert('Channel name can only contain lowercase letters, numbers, and hyphens');
      return false;
    }
    return true;
  }

  /**
   * Save channel
   */
  save(): void {
    if (!this.validateChannelName()) {
      return;
    }

    const channelData: Partial<ServerChannel> = {
      name: this.channelName().trim(),
      type: this.channelType(),
      topic: this.channelTopic().trim() || undefined,
      parentId: this.selectedCategory() || undefined,
      nsfw: this.isNsfw(),
      slowmode: this.slowmode() || undefined,
      userLimit: this.userLimit() || undefined,
      bitrate: this.bitrate() || undefined
    };

    this.saveChannel.emit(channelData);
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

  /**
   * Get available categories for selection
   */
  getAvailableCategories(): ServerChannel[] {
    return this.categories().filter(cat => cat.id !== this.channel()?.id);
  }

  /**
   * Check if channel type supports topic
   */
  supportsTopic(): boolean {
    return this.channelType() === 'text';
  }

  /**
   * Check if channel type supports slowmode
   */
  supportsSlowmode(): boolean {
    return this.channelType() === 'text';
  }

  /**
   * Check if channel type supports user limit
   */
  supportsUserLimit(): boolean {
    return this.channelType() === 'voice';
  }

  /**
   * Check if channel type supports bitrate
   */
  supportsBitrate(): boolean {
    return this.channelType() === 'voice';
  }

  /**
   * Check if channel type supports category selection
   */
  supportsCategorySelection(): boolean {
    return this.channelType() !== 'category';
  }
}
