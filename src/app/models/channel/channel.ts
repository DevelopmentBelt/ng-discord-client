export interface Channel {
  channelId: number;
  channelName: string;
  categoryId: number;
  type: 'text' | 'voice' | 'category';
  position: number;
  topic?: string;
  nsfw: boolean;
  slowmode?: number;
  userLimit?: number;
  bitrate?: number;
  isPrivate: boolean;
  permissions: string[];
  memberCount: number;
  createdAt: Date;
  lastActivity?: Date;
}
