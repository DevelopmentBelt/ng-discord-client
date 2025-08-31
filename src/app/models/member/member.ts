export interface Member {
  memberId: string;
  memberName: string;
  userId: number;
  username: string;
  userPic?: string;
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
