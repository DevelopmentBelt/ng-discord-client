import { ChangeDetectionStrategy, Component, OnInit, computed, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs';
import { AuthService } from '../../services/auth-service/auth.service';
import { UserWebService } from '../../services/user-web-service/user-web.service';
import {
  AVATAR_EFFECTS,
  AvatarEffectId,
  PROFILE_CARDS,
  ProfileCardId
} from '../../models/user/profile-style';

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

  username = signal('');
  userBio = signal('');
  userPic = signal('');
  email = signal('');
  profileCard = signal<ProfileCardId>('classic');
  avatarEffect = signal<AvatarEffectId>('none');
  saving = signal(false);
  error = signal('');
  success = signal('');

  readonly cardClass = computed(() => `profile-card--${this.profileCard()}`);
  readonly effectClass = computed(() => `avatar-effect--${this.avatarEffect()}`);

  constructor(
    private authService: AuthService,
    private userWebService: UserWebService
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.username.set(user?.username || '');
    this.userBio.set(user?.userBio || '');
    this.userPic.set(user?.userPic || '');
    this.email.set(user?.email || '');
    this.profileCard.set((user?.profileCard as ProfileCardId) || 'classic');
    this.avatarEffect.set((user?.avatarEffect as AvatarEffectId) || 'none');
  }

  selectCard(id: ProfileCardId): void {
    this.profileCard.set(id);
  }

  selectEffect(id: AvatarEffectId): void {
    this.avatarEffect.set(id);
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
      userBio: this.userBio().trim(),
      userPic: this.userPic().trim(),
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
    return (this.username() || 'U').charAt(0).toUpperCase();
  }
}
