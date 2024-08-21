import {Category} from "../channel/category";

export interface Server {
  iconURL: string;
  serverName: string;
  serverId: string;
  ownerId: string;
  serverDescription: string;
  categories?: Category[];
}
