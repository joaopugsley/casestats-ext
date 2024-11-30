import { ItemDescription } from "./inventory-history.type";

export interface CaseResult {
  caseName: string;
  historyId: string;
  receivedItemData: ItemDescription;
}