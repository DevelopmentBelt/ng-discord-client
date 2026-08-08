export interface Member {
  memberId: string;
  memberName: string;
  aliasName?: string | null;
  userId: number;
  username: string;
  userPic?: string;
  aliasPic?: string | null;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  roles: string[];
  joinedAt: Date;
  lastSeen?: Date;
  isOwner: boolean;
  isAdmin: boolean;
  canManageMembers: boolean;
  canManageChannels: boolean;
  canManageRoles: boolean;
}
