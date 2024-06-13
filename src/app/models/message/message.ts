import {Moment} from "moment";

export interface Message {
  id: string;
  text: string;
  rawText: string;
  mentions: Mention[];
  attachments: Attachment[];
  postedTimestamp: Moment;
  edited: boolean;
  editTimestamp: Moment;
  author: Author;
  hidden?: boolean;
}

export interface Attachment {
  attachmentId: number;
  attachmentData: string;
  messageId: number;
}

export interface Author {
  userId: number;
  username: string;
  profilePic: string;
}

export interface Mention {
  username: string;
  userId: number;
}
