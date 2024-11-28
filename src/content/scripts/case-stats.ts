import { CaseResult } from "../../types/case-result.type";
import { Cursor } from "../../types/cursor.type";
import { InventoryHistoryResponse, ItemDescription } from "../../types/inventory-history.type";
import { getHtmlTemplate } from "../../utils/getHtmlTemplate";
import { getItemDataFromDescriptions } from "../../utils/getItemDataFromDescriptions";
import browser from "webextension-polyfill";

let lastPulledTemplate: string;

export function initializeCaseStats() {
  createStatsContainer();
}

async function createStatsContainer() {
  const parentDiv = document.querySelector(".inventory_history_pagingrow");
  if (!parentDiv) return;

  const statsContainerTemplate = await getHtmlTemplate("stats-container");

  const statsContainer = document.createElement("div");
  statsContainer.id = "cs2-case-stats-container";
  statsContainer.innerHTML = statsContainerTemplate;
  parentDiv.appendChild(statsContainer);

  const fetchButton = statsContainer.querySelector("button");

  if (!fetchButton) return;

  fetchButton.addEventListener("click", () => {
    fetchCaseHistory();
  });

  updateCurrentStatus("idle");

  const version: string = await browser.runtime.sendMessage({ type: "GET_EXTENSION_VERSION" });
  if (version) {
    const versionElement = statsContainer.querySelector("#version");
    if (versionElement) {
      versionElement.textContent = `v${version}`;
    }
  }
}

async function updateCurrentStatus(status: 'idle' | 'fetching' | 'rate_limited' | 'finished' | 'error') {
  const statusElement = document.querySelector("#cs2-case-stats-container #status-text");
  if (!statusElement) return;

  const statusText: Record<typeof status, string> = {
    idle: "Waiting...",
    fetching: "Fetching items...",
    rate_limited: "Rate limited. Waiting before fetching new items...",
    finished: "Finished",
    error: "An error occurred. Please check the console for more details.",
  }

  const statusColor: Record<string, string> = {
    rate_limited: "#ffff00",
    error: "#ff0000",
    finished: "#00ff00",
  }

  statusElement.textContent = statusText[status];
  (statusElement as HTMLSpanElement).style.color = statusColor[status] || "#959595";
}

function updateStatsBar(statElement: Element, totalCases: number, value: number) {
  if (!statElement) return;

  const statTitle = statElement.querySelector(".stat-name");
  if (!statTitle || !statTitle.textContent) return;

  const barInner = statElement.querySelector(".bar-inner");
  if (!barInner) return;

  const barLabel = statElement.querySelector(".bar-label");
  if (!barLabel) return;

  statTitle.textContent = statTitle.textContent.replace(/(\d+)/, value.toString());

  (barInner as HTMLDivElement).style.width = `${value / totalCases * 100}%`;
  barLabel.textContent = `${(value / totalCases * 100).toFixed(2)}%`;
}

async function updateStatsContainer(results: CaseResult[]) {
  const totalCases = results.length;

  const milSpecGrade = results.filter(result => result.receivedItemData.tags.some(tag => tag.color === "4b69ff")).length;
  const restrictedGrade = results.filter(result => result.receivedItemData.tags.some(tag => tag.color === "8847ff")).length;
  const classifiedGrade = results.filter(result => result.receivedItemData.tags.some(tag => tag.color === "d32ce6")).length;

  const covertGrade = results.filter(result => result.receivedItemData.tags.some(tag => tag.color === "eb4b4b") && !result.receivedItemData.name.includes("★")).length;
  const goldCount = results.filter(result => result.receivedItemData.tags.some(tag => tag.color === "eb4b4b") && result.receivedItemData.name.includes("★")).length;
  const statTrakCount = results.filter(result => result.receivedItemData.tags.some(tag => tag.category === "Quality" && tag.name === "StatTrak™")).length;

  const mostOpenedCase = results.reduce((acc, curr) => {
    const count = results.filter(item => item.caseName === curr.caseName).length;
    return count > (acc.count || 0) ? { caseName: curr.caseName, count } : acc;
  }, { caseName: '', count: 0 }).caseName;

  const lastGoldIndex = results.findIndex(result => result.receivedItemData.name.includes("★"));
  const casesSinceLastGold = lastGoldIndex !== -1 ? lastGoldIndex : totalCases;

  const totalCashInvested = totalCases * 2.5; // key price ~

  // update stats container
  const rarityStatsContainer = document.querySelector(".rarity-stats");
  const generalStatsContainer = document.querySelector(".general-stats");
  if (!rarityStatsContainer || !generalStatsContainer) return;

  const goldElement = rarityStatsContainer.querySelector(".gold");
  const covertElement = rarityStatsContainer.querySelector(".covert-grade");
  const classifiedElement = rarityStatsContainer.querySelector(".classified-grade");
  const restrictedElement = rarityStatsContainer.querySelector(".restricted-grade");
  const milSpecElement = rarityStatsContainer.querySelector(".milspec-grade");
  const statTrakElement = rarityStatsContainer.querySelector(".stattrak");

  if (!milSpecElement || !restrictedElement || !classifiedElement || !covertElement || !goldElement || !statTrakElement) return;

  updateStatsBar(goldElement, totalCases, goldCount);
  updateStatsBar(covertElement, totalCases, covertGrade);
  updateStatsBar(classifiedElement, totalCases, classifiedGrade);
  updateStatsBar(restrictedElement, totalCases, restrictedGrade);
  updateStatsBar(milSpecElement, totalCases, milSpecGrade);
  updateStatsBar(statTrakElement, totalCases, statTrakCount);

  const totalOpenedCasesContainer = generalStatsContainer.querySelector("#total-cases");
  if (totalOpenedCasesContainer) {
    totalOpenedCasesContainer.textContent = String(totalCases);
  }

  const mostOpenedCaseContainer = generalStatsContainer.querySelector("#most-opened-case");
  if (mostOpenedCaseContainer) {
    mostOpenedCaseContainer.textContent = mostOpenedCase;
  }

  const casesSinceLastGoldContainer = generalStatsContainer.querySelector("#cases-since-last-gold");
  if (casesSinceLastGoldContainer) {
    casesSinceLastGoldContainer.textContent = String(casesSinceLastGold);
  }

  const totalCashInvestedContainer = generalStatsContainer.querySelector("#total-cash-invested");
  if (totalCashInvestedContainer) {
    totalCashInvestedContainer.textContent = `$${totalCashInvested}~`;
  }
}

async function addLastPulledItem(result: CaseResult) {
  const lastPulledContainer = document.querySelector(".last-pulled-items > .lpi-container");
  if (!lastPulledContainer) return;

  if (!lastPulledTemplate) {
    lastPulledTemplate = await getHtmlTemplate("pulled-item");
  }

  const tempContainer = document.createElement("div");
  tempContainer.innerHTML = lastPulledTemplate;
  const pulledItem = tempContainer.firstElementChild as HTMLDivElement;
  if (!pulledItem) return;

  const itemImage = pulledItem.querySelector(".item-image");
  const itemName = pulledItem.querySelector(".item-name");

  if (!itemImage || !itemName) return;

  itemImage.setAttribute("src", `https://community.cloudflare.steamstatic.com/economy/image/${result.receivedItemData.icon_url}`);
  itemName.textContent = result.receivedItemData.name;
  (itemName as HTMLParagraphElement).style.color = `#${result.receivedItemData.name_color}`;

  lastPulledContainer.insertBefore(pulledItem, lastPulledContainer.firstChild);

  if (result.receivedItemData.name.includes("★")) {
    const goldContainer = document.querySelector(".last-pulled-golds > .lpg-container");
    if (!goldContainer) return;
    goldContainer.insertBefore(pulledItem, goldContainer.firstChild);
  }
}

function hideFetchButton() {
  const fetchButton = document.querySelector("#fetch-button");
  if (!fetchButton) return;
  fetchButton.remove();
}

async function fetchCaseHistory() {
  const results: CaseResult[] = [];
  const initialCursor: Cursor = {
    time: new Date().getTime() / 1000,
    time_frac: 0,
    s: "0"
  };

  hideFetchButton();

  let currentCursor: Cursor = initialCursor;

  while (true) {
    const result = await fetchNextPage(currentCursor);

    if (!result) {
      console.error("Failed to fetch next page");
      break;
    }

    const { results: pageResults, cursor: nextCursor } = result;

    const foundDuplicate = pageResults.some(newResult => 
      results.some(existingResult =>
        existingResult.caseName === newResult.caseName &&
        existingResult.receivedItemData === newResult.receivedItemData
      )
    );

    // break if found duplicate (already fetched entire history)
    if (foundDuplicate || !nextCursor) {
      break;
    }

    currentCursor = nextCursor;

    for (const result of pageResults) {
      results.push(result);
      await addLastPulledItem(result);
    }

    updateStatsContainer(results);

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  updateCurrentStatus("finished");
}

async function fetchNextPage(cursor: Cursor) {
  const historyPage = await fetchHistoryPage(cursor.time, cursor.time_frac, cursor.s);

  if (!historyPage || !historyPage.success) {
    updateCurrentStatus("error");
    console.error("Failed to fetch history page:", historyPage);
    return;
  }

  const dom = new DOMParser().parseFromString(historyPage.html, "text/html");
  const children = dom.querySelectorAll(".tradehistory_event_description");

  const pageResults: CaseResult[] = [];

  for (const child of children) {
    // check if it's a container opened event
    if (!child.textContent || !child.textContent.includes("Unlocked a container") || !child.parentElement) {
      continue;
    }

    const plusMinusContainers = child.parentElement.querySelectorAll(".tradehistory_items_plusminus");

    const givenItemsGroupContainer = Array.from(plusMinusContainers)
      .find((container) => container.textContent?.includes("-"))
      ?.parentElement
      ?.querySelector(".tradehistory_items_group");
    
    const receivedItemsGroupContainer = Array.from(plusMinusContainers)
      .find((container) => container.textContent?.includes("+"))
      ?.parentElement
      ?.querySelector(".tradehistory_items_group");

    if (!givenItemsGroupContainer || !receivedItemsGroupContainer) {
      console.error("Failed to find items containers:", child);
      continue;
    }

    const givenItemsContainer = givenItemsGroupContainer
      .querySelector(".history_item")
      ?.querySelector(".history_item_name");

    const receivedItemsContainer = receivedItemsGroupContainer
      .querySelector(".history_item")
      ?.querySelector(".history_item_name");

    if (!givenItemsContainer || !receivedItemsContainer) {
      console.error("Failed to find items containers:", child);
      continue;
    }

    const itemName = receivedItemsContainer.textContent?.trim();
    if (!itemName || itemName.includes("Sticker") || itemName.includes("Souvenir")) {
      continue;
    }

    const receivedItemData = getItemDataFromDescriptions(historyPage.descriptions, itemName);

    if (!receivedItemData) {
      console.error("Failed to find item data:", child);
      continue;
    }

    pageResults.push({
      caseName: givenItemsContainer.textContent!.trim(),
      receivedItemData,
    });
  }

  return {
    results: pageResults,
    cursor: historyPage.cursor,
  }
}

async function fetchHistoryPage(time: number, timeFrac: number, timeCursor: string) {
  const baseUrl = window.location.href.includes("/?")
    ? window.location.href.split("/?")[0]
    : window.location.href;

  updateCurrentStatus("fetching");

  const response = await fetch(`${baseUrl}/?ajax=1&cursor%5Btime%5D=${time}&cursor%5Btime_frac%5D=${timeFrac}&cursor%5Bs%5D=${timeCursor}&count=2000&l=english&app%5B%5D=730`, {
    headers: {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile': "?0",
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': "empty",
      'sec-fetch-mode': "cors",
      'sec-fetch-site': "same-origin",
      'x-requested-with': "XMLHttpRequest",
    },
    mode: 'cors',
    credentials: 'include'
  });

  // rate limited (429) -> wait 15 seconds before retry
  if (response.status === 429) {
    console.log("Rate limited. Waiting before retrying...");
    updateCurrentStatus("rate_limited");
    await new Promise(resolve => setTimeout(resolve, 15000));
    return fetchHistoryPage(time, timeFrac, timeCursor);
  }

  if (!response.ok) {
    console.error("Failed to fetch history page:", response);
    updateCurrentStatus("error");
    return;
  }

  const historyPage = await response.json();
  return historyPage as InventoryHistoryResponse;
}