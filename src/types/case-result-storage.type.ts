import { CaseResult } from "./case-result.type";
import { Cursor } from "./cursor.type";

export interface CaseResultData {
  results: CaseResult[];
  lastUpdate: number;
  cursor: Cursor;
}