import browser from "webextension-polyfill";
import { CaseResultData } from "../../../types/case-result-storage.type";
import { CaseResult } from "../../../types/case-result.type";
import { Cursor } from "../../../types/cursor.type";
import { getSteamIdFromUserInfo } from "../../../utils/get-steam-id-from-user-info";

function buildUserDataKey() {
  return `caseResultData-${getSteamIdFromUserInfo()}`;
}

export async function getStoredData() {
  const userDataKey = buildUserDataKey();
  const data = await browser.storage.local.get(userDataKey);
  if (!data[userDataKey]) return;
  return data[userDataKey] as CaseResultData;
}

export async function storeResults(results: CaseResult[]) {
  const userDataKey = buildUserDataKey();
  const data = await getStoredData();
  if (!data) return;
  data.results = results;
  await browser.storage.local.set({ [userDataKey]: data });
}

export async function storeData(results: CaseResult[], cursor: Cursor) {
  const userDataKey = buildUserDataKey();
  const data: CaseResultData = {
    results,
    lastUpdate: new Date().getTime(),
    cursor
  }
  await browser.storage.local.set({ [userDataKey]: data });
}

export async function resetStoredData() {
  const userDataKey = buildUserDataKey();
  await browser.storage.local.remove(userDataKey);
}