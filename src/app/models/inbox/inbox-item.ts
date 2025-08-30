import { Moment } from 'moment';
import { User } from '../user/user';
import { Message } from '../message/message';
import { Server } from '../server/server';
import { Channel } from '../channel/channel';

export interface InboxItem {
  id: string;
  type: InboxItemType;
  title: string;
  content: string;
  timestamp: Moment;
  isRead: boolean;
  priority: InboxPriority;
  
  // Related data based on type
  sender?: User;
  message?: Message;
  server?: Server;
  channel?: Channel;
  mentionCount?: number;
  notificationCount?: number;
}

export enum InboxItemType {
  DIRECT_MESSAGE = 'direct_message',
  MENTION = 'mention',
  SERVER_INVITE = 'server_invite',
  FRIEND_REQUEST = 'friend_request',
  SYSTEM_NOTIFICATION = 'system_notification',
  SERVER_UPDATE = 'server_update'
}

export enum InboxPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface DirectMessageThread {
  id: string;
  participants: User[];
  lastMessage: Message;
  unreadCount: number;
  lastActivity: Moment;
}

export interface InboxFilters {
  showRead: boolean;
  showUnread: boolean;
  types: InboxItemType[];
  priority: InboxPriority[];
  dateRange?: {
    start: Moment;
    end: Moment;
  };
}
