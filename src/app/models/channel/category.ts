import {Channel} from "./channel";

export interface Category {
  categoryId: number;
  serverId: number;
  categoryName: string;
  categoryIcon: string;
  channels?: Channel[];
}
