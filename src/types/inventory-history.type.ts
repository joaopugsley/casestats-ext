import { Cursor } from "./cursor.type";
import { App } from "./steam-app.type";

export interface InventoryHistoryResponse {
  success: boolean;
  html: string;
  num: number;
  descriptions: {
    [appId: string]: {
      [classIdInstanceId: string]: ItemDescription;
    };
  };
  apps: App[];
  cursor: Cursor;
}

export interface ItemDescription {
  icon_url: string;
  icon_drag_url: string;
  name: string;
  market_hash_name: string;
  market_name: string;
  name_color: string;
  background_color: string;
  type: string;
  tradable: number;
  marketable: number;
  commodity?: number;
  owner_only?: number;
  market_tradable_restriction: string;
  market_marketable_restriction: string;
  market_buy_country_restriction?: string;
  cache_expiration?: string;
  descriptions: ItemDescriptionDetail[];
  tags: ItemTag[];
  classid: string;
  instanceid: string;
}

interface ItemDescriptionDetail {
  type: string;
  value: string;
  color?: string;
  name?: string;
}

interface ItemTag {
  internal_name: string;
  name: string;
  category: string;
  category_name: string;
  color?: string;
}