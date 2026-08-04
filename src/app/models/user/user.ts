import { AvatarEffectId, ProfileCardId } from './profile-style';

export interface User {
  id: number;
  username: string;
  userPic: string;
  email: string;
  userBio: string;
  profileCard?: ProfileCardId;
  avatarEffect?: AvatarEffectId;
}
