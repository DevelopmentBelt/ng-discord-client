import { PresenceStatus } from './app-theme';
import { AvatarEffectId, ProfileCardId } from './profile-style';

export type DmPolicy = 'everyone' | 'mutual_server' | 'allowlist' | 'nobody';

export interface User {
  id: number;
  username: string;
  userPic: string;
  email: string;
  userBio: string;
  displayName?: string;
  pronouns?: string;
  customStatus?: string;
  bannerUrl?: string;
  presenceStatus?: PresenceStatus;
  profileCard?: ProfileCardId;
  avatarEffect?: AvatarEffectId;
  /** ECDH P-256 SPKI (base64) — public half of E2EE identity */
  publicKey?: string;
  /** Who may start DMs with this user (privacy-first default: allowlist) */
  dmPolicy?: DmPolicy;
}
