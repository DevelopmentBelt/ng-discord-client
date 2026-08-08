import { PresenceStatus } from './app-theme';
import { AvatarEffectId, ProfileCardId } from './profile-style';

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
}
