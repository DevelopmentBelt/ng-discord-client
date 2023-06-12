import {Moment} from "moment";

export interface Message {
  text: string;
  rawText: string;
  mentions: Mention[];
  postedTimestamp: Moment;
  edited: boolean;
  editTimestamp: Moment;
  author: Author;
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
