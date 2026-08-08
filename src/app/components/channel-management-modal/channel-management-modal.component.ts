import { ChangeDetectionStrategy, Component, OnInit, effect, input, output, signal, WritableSignal } from '@angular/core';
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
  channel = input<ServerChannel | null>(null);
  isEditing = input<boolean>(false);
  categories = input<ServerChannel[]>([]);
  defaultCategoryId = input<string | number | null>(null);

  closeModal = output<void>();
  saveChannel = output<Partial<ServerChannel>>();

  channelName: WritableSignal<string> = signal('');
  channelType: WritableSignal<'text' | 'voice' | 'category'> = signal('text');
  channelTopic: WritableSignal<string> = signal('');
  selectedCategory: WritableSignal<string> = signal('');
  isNsfw: WritableSignal<boolean> = signal(false);
  isPhantom: WritableSignal<boolean> = signal(false);
  ephemeralTtlSeconds: WritableSignal<number> = signal(0);
  slowmode: WritableSignal<number> = signal(0);

  ephemeralOptions = [
    { value: 0, label: 'Keep forever' },
    { value: 60, label: '1 minute' },
    { value: 300, label: '5 minutes' },
    { value: 3600, label: '1 hour' },
    { value: 86400, label: '24 hours' },
    { value: 604800, label: '7 days' }
  ];
  userLimit: WritableSignal<number> = signal(0);
  bitrate: WritableSignal<number> = signal(64000);

  channelTypes = [
    { value: 'text' as const, label: 'Text Channel', description: 'Send messages, images, GIFs, stickers, opinions, and puns' },
    { value: 'voice' as const, label: 'Voice Channel', description: 'Hang out together with voice, video, and screen share' },
    { value: 'category' as const, label: 'Category', description: 'Organize your channels with categories' }
  ];

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

  bitrateOptions = [
    { value: 64000, label: '64 kbps' },
    { value: 96000, label: '96 kbps' },
    { value: 128000, label: '128 kbps' },
    { value: 256000, label: '256 kbps' },
    { value: 384000, label: '384 kbps' }
  ];

  constructor() {
    effect(() => {
      // Re-init when inputs change while the modal is open
      this.channel();
      this.isEditing();
      this.defaultCategoryId();
      this.initializeForm();
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    if (this.channel() && this.isEditing()) {
      const channel = this.channel()!;
      this.channelName.set(channel.name);
      this.channelType.set(channel.type || 'text');
      this.channelTopic.set(channel.topic || '');
      this.selectedCategory.set(String(channel.parentId || channel.categoryId || ''));
      this.isNsfw.set(!!channel.nsfw);
      this.isPhantom.set(!!channel.isPhantom);
      this.ephemeralTtlSeconds.set(channel.ephemeralTtlSeconds || 0);
      this.slowmode.set(channel.slowmode || 0);
      this.userLimit.set(channel.userLimit || 0);
      this.bitrate.set(channel.bitrate || 64000);
      return;
    }

    this.channelName.set('');
    this.channelType.set('text');
    this.channelTopic.set('');
    const defaultCategory = this.defaultCategoryId();
    this.selectedCategory.set(defaultCategory != null && defaultCategory !== '' ? String(defaultCategory) : '');
    this.isNsfw.set(false);
    // Privacy-first: new text channels default to Phantom
    this.isPhantom.set(true);
    this.ephemeralTtlSeconds.set(0);
    this.slowmode.set(0);
    this.userLimit.set(0);
    this.bitrate.set(64000);
  }

  onChannelNameInput(value: string): void {
    const normalized = (value || '').toLowerCase().replace(/\s+/g, '-');
    this.channelName.set(normalized);
  }

  onChannelTypeChange(type: 'text' | 'voice' | 'category'): void {
    this.channelType.set(type);
    if (type === 'text') {
      this.userLimit.set(0);
      this.bitrate.set(64000);
    } else if (type === 'voice') {
      this.channelTopic.set('');
      this.slowmode.set(0);
      this.isPhantom.set(false);
    } else if (type === 'category') {
      this.channelTopic.set('');
      this.slowmode.set(0);
      this.userLimit.set(0);
      this.bitrate.set(64000);
      this.selectedCategory.set('');
      this.isPhantom.set(false);
    }
  }

  validateChannelName(): boolean {
    return this.getValidationError() === '';
  }

  getValidationError(): string {
    const name = this.channelName().trim();
    if (name.length === 0) {
      return 'Channel name cannot be empty';
    }
    if (name.length > 100) {
      return 'Channel name cannot exceed 100 characters';
    }
    if (!/^[a-z0-9-_]+$/.test(name)) {
      return 'Channel name can only contain lowercase letters, numbers, hyphens, and underscores';
    }
    if (this.supportsCategorySelection() && !this.selectedCategory()) {
      return 'Select a category for this channel';
    }
    return '';
  }

  save(): void {
    if (!this.validateChannelName()) {
      return;
    }

    const channelData: Partial<ServerChannel> = {
      name: this.channelName().trim(),
      type: this.channelType(),
      topic: this.channelTopic().trim() || undefined,
      parentId: this.selectedCategory() || undefined,
      categoryId: this.selectedCategory() ? Number(this.selectedCategory()) : undefined,
      nsfw: this.isNsfw(),
      isPhantom: this.channelType() === 'text' ? this.isPhantom() : false,
      ephemeralTtlSeconds: this.channelType() === 'text' ? this.ephemeralTtlSeconds() : 0,
      slowmode: this.slowmode() || undefined,
      userLimit: this.userLimit() || undefined,
      bitrate: this.bitrate() || undefined
    };

    this.saveChannel.emit(channelData);
  }

  close(): void {
    this.closeModal.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  getAvailableCategories(): ServerChannel[] {
    return this.categories().filter((cat) => String(cat.id) !== String(this.channel()?.id));
  }

  supportsTopic(): boolean {
    return this.channelType() === 'text';
  }

  supportsSlowmode(): boolean {
    return this.channelType() === 'text';
  }

  supportsPhantom(): boolean {
    return this.channelType() === 'text';
  }

  supportsUserLimit(): boolean {
    return this.channelType() === 'voice';
  }

  supportsBitrate(): boolean {
    return this.channelType() === 'voice';
  }

  supportsCategorySelection(): boolean {
    return this.channelType() !== 'category';
  }
}
