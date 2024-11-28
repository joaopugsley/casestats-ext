import { InventoryHistoryResponse } from "../types/inventory-history.type";

export function getItemDataFromDescriptions(descriptions: InventoryHistoryResponse['descriptions'], itemName: string) {
  return Object.values(descriptions["730"]).find((item) => item.name === itemName);
}