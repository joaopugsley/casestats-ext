import { CaseResult } from "../../../types/case-result.type";
import { Cursor } from "../../../types/cursor.type";
import { InventoryHistoryResponse } from "../../../types/inventory-history.type";
import { delay } from "../../../utils/delay";
import { getStoredData, storeData, storeResults } from "./storage";
import { addLastPulledItems, parseHistoryPage, setButtonsState, updateStatsContainer, updateStatus } from "./ui/stats-container";

const RETRY_DELAY = 15000;
const FETCH_HEADERS: HeadersInit = {
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.9',
  'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'sec-ch-ua-mobile': "?0",
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': "empty",
  'sec-fetch-mode': "cors",
  'sec-fetch-site': "same-origin",
  'x-requested-with': "XMLHttpRequest",
}

export async function fetchInventoryHistory() {
  const storedData = await getStoredData();
  let results: CaseResult[] = storedData?.results || [];

  setButtonsState(false);

  if (storedData) {
    // first fetch any new items since last update
    await fetchUntilLastUpdate(results);
    // then fetch any new items since last update
    await fetchFromLastUpdate(results, storedData.cursor);
  } else {
    // if no stored data, fetch all items
    await fetchFromLastUpdate(results, {
      time: new Date().getTime() / 1000,
      time_frac: 0,
      s: "0"
    });
  }

  updateStatus("finished");
  setButtonsState(true);
}

async function fetchUntilLastUpdate(results: CaseResult[]) {
  let currentCursor: Cursor = {
    time: new Date().getTime() / 1000,
    time_frac: 0,
    s: "0"
  }

  const lastPulledElement = document.querySelector(".last-pulled-items > .lpi-container")?.lastElementChild;
  const lastResult = results[0].historyId;

  while (true) {
    console.log("Fetching until last update...");

    const page = await fetchPage(currentCursor);
    if (!page?.success) {
      console.log("Failed to fetch next page");
      updateStatus("error");
      break;
    }

    const pageResults = parseHistoryPage(page);

    const positionToAdd = results.indexOf(results.find(result => result.historyId === lastResult) || results[results.length - 1]);

    // check if we found any items that exists in our stored data
    const foundDuplicate = pageResults.some(result => results.some(existingResult => existingResult.historyId === result.historyId));

    // check if we are missing some item on this page
    const isItemMissing = pageResults.some(result => !results.some(existingResult => existingResult.historyId === result.historyId));

    // add missing items
    if (foundDuplicate && isItemMissing) {
      const missingItems = pageResults.filter(result => !results.some(existingResult => existingResult.historyId === result.historyId));
      results.splice(positionToAdd, 0, ...missingItems);
      currentCursor = page.cursor;
      updateStatsContainer(results);
      addLastPulledItems(missingItems, true, lastPulledElement);
      await storeResults(results);
      break;
    }

    if (foundDuplicate || !page.cursor) {
      break;
    }

    // add new items to the beginning, since they're more recent
    results.splice(positionToAdd, 0, ...pageResults);
    currentCursor = page.cursor;

    updateStatsContainer(results);
    addLastPulledItems(pageResults, true, lastPulledElement);
    await storeResults(results);

    await delay(500);
  }
}

async function fetchFromLastUpdate(results: CaseResult[], startCursor: Cursor) {
  let currentCursor: Cursor = startCursor;

  while (true) {
    console.log("Fetching from last update...");

    const page = await fetchPage(currentCursor);
    if (!page?.success) {
      console.log("Failed to fetch next page");
      updateStatus("error");
      break;
    }

    const pageResults = parseHistoryPage(page);

    // check if we found any items that exists in our stored data
    const foundDuplicate = pageResults.some(result => results.some(existingResult => existingResult.historyId === result.historyId));

    if (foundDuplicate || !page.cursor) {
      break;
    }

    // add older items to the end of the array
    results.push(...pageResults);
    currentCursor = page.cursor;

    updateStatsContainer(results);
    addLastPulledItems(pageResults, false);
    await storeData(results, currentCursor);

    await delay(500);
  }
}

export async function fetchPage(cursor: Cursor) {
  const baseUrl = window.location.href.includes("/?")
    ? window.location.href.split("/?")[0]
    : window.location.href;

  updateStatus("fetching");

  try {
    const response = await fetch(`${baseUrl}/?ajax=1&cursor%5Btime%5D=${cursor.time}&cursor%5Btime_frac%5D=${cursor.time_frac}&cursor%5Bs%5D=${cursor.s}&count=2000&l=english&app%5B%5D=730`, {
      headers: FETCH_HEADERS,
      mode: 'cors',
      credentials: 'include'
    });

    // rate limited (429) -> wait before retry
    if (response.status === 429) {
      console.log("Rate limited. Waiting before retrying...");
      updateStatus("rate_limited");
      await delay(RETRY_DELAY);
      return fetchPage(cursor);
    }

    // error -> return
    if (!response.ok) {
      console.log("Failed to fetch history page:", response);
      updateStatus("error");
      return;
    }

    const historyPage = await response.json();
    return historyPage as InventoryHistoryResponse;
  } catch(error) {
    console.log("Failed to fetch history page:", error);
    updateStatus("error");
    return;
  }
}