import browser from "webextension-polyfill";
import { CaseResultData } from "../../../types/case-result-storage.type";
import { CaseResult } from "../../../types/case-result.type";
import { Cursor } from "../../../types/cursor.type";

export async function getStoredData() {
  const data = await browser.storage.local.get("caseResultData");
  if (!data.caseResultData) return;
  return data.caseResultData as CaseResultData;
}

export async function storeResults(results: CaseResult[]) {
  const data = await getStoredData();
  if (!data) return;
  data.results = results;
  await browser.storage.local.set({ caseResultData: data });
}

export async function storeData(results: CaseResult[], cursor: Cursor) {
  const data: CaseResultData = {
    results,
    lastUpdate: new Date().getTime(),
    cursor
  }
  await browser.storage.local.set({ caseResultData: data });
}

export async function resetStoredData() {
  await browser.storage.local.remove("caseResultData");
}