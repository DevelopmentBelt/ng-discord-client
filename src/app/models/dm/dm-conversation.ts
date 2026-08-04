import { User } from '../user/user';
import { Message } from '../message/message';

export interface DmConversation {
  id: string;
  participant: User;
  lastMessage?: Pick<Message, 'id' | 'rawText' | 'text' | 'postedTimestamp' | 'author'> | null;
  updatedAt?: string;
}
