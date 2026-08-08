import { ChangeDetectionStrategy, Component, OnInit, computed, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs';
import { AuthService } from '../../services/auth-service/auth.service';
import { UserWebService } from '../../services/user-web-service/user-web.service';
import { ThemePreferencesService } from '../../services/theme-preferences/theme-preferences.service';
import {
  AVATAR_EFFECTS,
  AvatarEffectId,
  PROFILE_CARDS,
  ProfileCardId
} from '../../models/user/profile-style';
import {
  AccentId,
  PRESENCE_OPTIONS,
  PresenceStatus,
  ThemeColorKey
} from '../../models/user/app-theme';

type SettingsTab = 'profile' | 'appearance';

@Component({
  selector: 'app-user-settings-modal',
  templateUrl: './user-settings-modal.component.html',
  styleUrls: ['./user-settings-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class UserSettingsModalComponent implements OnInit {
  closeModal = output<void>();

  readonly cards = PROFILE_CARDS;
  readonly effects = AVATAR_EFFECTS;
  readonly presenceOptions = PRESENCE_OPTIONS;
  readonly accentOptions = this.themePreferences.accentOptions;
  readonly themePresets = this.themePreferences.themePresets;
  readonly colorFields = this.themePreferences.colorFields;

  activeTab = signal<SettingsTab>('profile');

  username = signal('');
  displayName = signal('');
  pronouns = signal('');
  customStatus = signal('');
  userBio = signal('');
  userPic = signal('');
  bannerUrl = signal('');
  email = signal('');
  presenceStatus = signal<PresenceStatus>('online');
  profileCard = signal<ProfileCardId>('classic');
  avatarEffect = signal<AvatarEffectId>('none');
  saving = signal(false);
  error = signal('');
  success = signal('');

  readonly cardClass = computed(() => `profile-card--${this.profileCard()}`);
  readonly effectClass = computed(() => `avatar-effect--${this.avatarEffect()}`);
  readonly previewName = computed(() => this.displayName().trim() || this.username().trim() || 'Username');
  readonly accentId = this.themePreferences.accentId;
  readonly customAccent = this.themePreferences.customAccent;
  readonly themePresetId = this.themePreferences.themePresetId;
  readonly themeColors = this.themePreferences.colors;
  readonly compactMode = this.themePreferences.compactMode;
  readonly reduceMotion = this.themePreferences.reduceMotion;
  readonly liveAccentHex = computed(() => this.themePreferences.resolveAccentHex());
  readonly surfaceFields = computed(() => this.colorFields.filter((f) => f.group === 'surfaces'));
  readonly accentFields = computed(() => this.colorFields.filter((f) => f.group === 'accent'));
  readonly textFields = computed(() => this.colorFields.filter((f) => f.group === 'text'));
  readonly chromeFields = computed(() => this.colorFields.filter((f) => f.group === 'chrome'));

  constructor(
    private authService: AuthService,
    private userWebService: UserWebService,
    private themePreferences: ThemePreferencesService
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.username.set(user?.username || '');
    this.displayName.set(user?.displayName || '');
    this.pronouns.set(user?.pronouns || '');
    this.customStatus.set(user?.customStatus || '');
    this.userBio.set(user?.userBio || '');
    this.userPic.set(user?.userPic || '');
    this.bannerUrl.set(user?.bannerUrl || '');
    this.email.set(user?.email || '');
    this.presenceStatus.set((user?.presenceStatus as PresenceStatus) || 'online');
    this.profileCard.set((user?.profileCard as ProfileCardId) || 'classic');
    this.avatarEffect.set((user?.avatarEffect as AvatarEffectId) || 'none');
  }

  setTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
    this.error.set('');
    this.success.set('');
  }

  selectCard(id: ProfileCardId): void {
    this.profileCard.set(id);
  }

  selectEffect(id: AvatarEffectId): void {
    this.avatarEffect.set(id);
  }

  selectPresence(id: PresenceStatus): void {
    this.presenceStatus.set(id);
  }

  selectThemePreset(id: string): void {
    this.themePreferences.setThemePreset(id);
  }

  selectAccent(id: AccentId): void {
    this.themePreferences.setAccent(id);
  }

  onCustomAccentInput(value: string): void {
    this.themePreferences.setCustomAccent(value);
  }

  onThemeColorInput(key: ThemeColorKey, value: string): void {
    this.themePreferences.setColor(key, value);
  }

  onCompactToggle(checked: boolean): void {
    this.themePreferences.setCompactMode(checked);
  }

  onReduceMotionToggle(checked: boolean): void {
    this.themePreferences.setReduceMotion(checked);
  }

  resetAppearance(): void {
    this.themePreferences.reset();
  }

  colorHex(key: ThemeColorKey): string {
    return this.themeColors()[key];
  }

  save(): void {
    const username = this.username().trim();
    if (username.length < 3 || username.length > 32) {
      this.error.set('Username must be 3-32 characters');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.userWebService.updateProfile({
      username,
      displayName: this.displayName().trim(),
      pronouns: this.pronouns().trim(),
      customStatus: this.customStatus().trim(),
      userBio: this.userBio().trim(),
      userPic: this.userPic().trim(),
      bannerUrl: this.bannerUrl().trim(),
      presenceStatus: this.presenceStatus(),
      profileCard: this.profileCard(),
      avatarEffect: this.avatarEffect()
    }).pipe(take(1)).subscribe({
      next: (resp) => {
        this.saving.set(false);
        if (resp?.status === 'success' && resp.user) {
          this.authService.setUser(resp.user);
          this.success.set('Profile updated');
          return;
        }
        this.error.set(resp?.message || 'Failed to update profile');
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Failed to update profile');
      }
    });
  }

  close(): void {
    this.closeModal.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  avatarInitial(): string {
    return (this.previewName() || 'U').charAt(0).toUpperCase();
  }

  presenceDotClass(status: PresenceStatus = this.presenceStatus()): string {
    switch (status) {
      case 'online':
        return 'presence-dot--online';
      case 'idle':
        return 'presence-dot--idle';
      case 'dnd':
        return 'presence-dot--dnd';
      default:
        return 'presence-dot--invisible';
    }
  }

  bannerStyle(): Record<string, string> {
    const url = this.bannerUrl().trim().replace(/["'\\]/g, '');
    if (url) {
      return {
        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.45)), url("${url}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }
    return {};
  }
}
