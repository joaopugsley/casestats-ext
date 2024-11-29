import browser from "webextension-polyfill";
import { getHtmlTemplate } from "../../../../utils/get-html-template";
import { fetchInventoryHistory } from "../inventory-history";
import { CaseResult } from "../../../../types/case-result.type";
import { getStoredData, resetStoredData } from "../storage";
import { InventoryHistoryResponse } from "../../../../types/inventory-history.type";
import { getItemDataFromDescriptions } from "../../../../utils/get-item-data-from-descriptions";

type Status = 'idle' | 'fetching' | 'rate_limited' | 'finished' | 'error';

const PARENT_DIV_SELECTOR = ".inventory_history_pagingrow";

const STATUS_CONFIG: Record<Status, { text: string, color: string }> = {
  idle: { text: "Idle", color: "#959595" },
  fetching: { text: "Fetching items...", color: "#ffff00" },
  rate_limited: { text: "Rate limited. Waiting before fetching new items...", color: "#ffff00" },
  finished: { text: "Finished", color: "#00ff00" },
  error: { text: "An error occurred. Please check the console for more details.", color: "#ff0000" }
};

let lastPulledTemplate: string;

export async function initializeStatsContainer() {
  const parent = document.querySelector(PARENT_DIV_SELECTOR);
  if (!parent) return;

  const template = await getHtmlTemplate("stats-container");
  const container = document.createElement("div");
  container.id = "cs2-case-stats-container";
  container.innerHTML = template;
  parent.appendChild(container);

  await loadStoredData();

  setupEventListeners(container);
  updateCurrentVersion(container);
  setButtonsState(true);
  updateStatus("idle");
}

function setupEventListeners(container: HTMLDivElement) {
  const fetchButton = container.querySelector("#fetch-button");
  if (!fetchButton) return;
  fetchButton.addEventListener("click", () => fetchInventoryHistory());
}

async function updateCurrentVersion(container: HTMLDivElement) {
  const version: string = await browser.runtime.sendMessage({ type: "GET_EXTENSION_VERSION" });
  if (version) {
    const versionElement = container.querySelector("#version");
    if (versionElement) {
      versionElement.textContent = `v${version}`;
    }
  }
}

async function loadStoredData() {
  const storedData = await getStoredData();
  if (!storedData || !storedData.results) return;

  const results = storedData.results;
  const lastUpdate = storedData.lastUpdate;

  const fetchButton = document.querySelector("#fetch-button");
  const resetButton = document.querySelector("#reset-button");
  if (!fetchButton || !resetButton) return;

  addLastPulledItems(results);
  updateStatsContainer(results);

  (fetchButton as HTMLButtonElement).textContent = `Load Case Stats (Last Updated: ${new Date(lastUpdate).toLocaleString()})`;

  (resetButton as HTMLButtonElement).style.display = "flex";
  resetButton.addEventListener("click", () => {
    (resetButton as HTMLButtonElement).style.display = "none";
    (fetchButton as HTMLButtonElement).textContent = "Load Case Stats (All Time)";
    (document.querySelector(".lpg-container") as HTMLDivElement).innerHTML = "";
    resetStoredData();
    updateStatus("idle");
    updateStatsContainer([]);
    resetLastPulledItems();
    setButtonsState(true);
  });
}

export function updateStatus(status: Status) {
  const statusElement = document.querySelector("#status-text");
  if (!statusElement) return;

  const config = STATUS_CONFIG[status];
  if (!config) return;

  statusElement.textContent = config.text;
  (statusElement as HTMLSpanElement).style.color = config.color;
}

export function setButtonsState(state: boolean) {
  const fetchButton = document.querySelector("#fetch-button");
  const resetButton = document.querySelector("#reset-button");
  if (!fetchButton || !resetButton) return;
  
  (fetchButton as HTMLButtonElement).disabled = !state;
  (resetButton as HTMLButtonElement).disabled = !state;
}

function parseStats(results: CaseResult[]) {
  const totalCases = results.length;
  const totalCashInvested = totalCases * 2.5; // key price ~
  const milSpecGrade = results.filter(result => result.receivedItemData.tags.some(tag => tag.color === "4b69ff")).length;
  const restrictedGrade = results.filter(result => result.receivedItemData.tags.some(tag => tag.color === "8847ff")).length;
  const classifiedGrade = results.filter(result => result.receivedItemData.tags.some(tag => tag.color === "d32ce6")).length;
  const covertGrade = results.filter(result => result.receivedItemData.tags.some(tag => tag.color === "eb4b4b") && !result.receivedItemData.name.includes("★")).length;
  const goldCount = results.filter(result => result.receivedItemData.tags.some(tag => tag.color === "eb4b4b") && result.receivedItemData.name.includes("★")).length;
  const statTrakCount = results.filter(result => result.receivedItemData.tags.some(tag => tag.category === "Quality" && tag.name === "StatTrak™")).length;

  const mostOpenedCase = results.reduce((acc, curr) => {
    const count = results.filter(item => item.caseName === curr.caseName).length;
    return count > (acc.count || 0) ? { caseName: curr.caseName, count } : acc;
  }, { caseName: '', count: 0 }).caseName || "...";

  const lastGoldIndex = results.findIndex(result => result.receivedItemData.name.includes("★"));
  const casesSinceLastGold = lastGoldIndex !== -1 ? lastGoldIndex : totalCases;

  return {
    totalCases,
    totalCashInvested,
    milSpecGrade,
    restrictedGrade,
    classifiedGrade,
    covertGrade,
    goldCount,
    statTrakCount,
    mostOpenedCase,
    casesSinceLastGold,
  }
}

function updateStatsBar(statElement: Element, totalCases: number, value: number) {
  if (!statElement) return;

  const statTitle = statElement.querySelector(".stat-name");
  const barInner = statElement.querySelector(".bar-inner");
  const barLabel = statElement.querySelector(".bar-label");
  if (!statTitle || !statTitle.textContent || !barInner || !barLabel) return;

  statTitle.textContent = statTitle.textContent.replace(/(\d+)/, value.toString());

  if (totalCases === 0 || value === 0) {
    (barInner as HTMLDivElement).style.width = "0%";
    barLabel.textContent = "";
    return;
  }

  (barInner as HTMLDivElement).style.width = `${value / totalCases * 100}%`;
  barLabel.textContent = `${(value / totalCases * 100).toFixed(2)}%`;
}

export function updateStatsContainer(results: CaseResult[]) {
  const { totalCases, totalCashInvested, milSpecGrade, restrictedGrade, classifiedGrade, covertGrade, goldCount, statTrakCount, mostOpenedCase, casesSinceLastGold } = parseStats(results);

  const goldElement = document.querySelector(".gold-items");
  const covertElement = document.querySelector(".covert-items");
  const classifiedElement = document.querySelector(".classified-items");
  const restrictedElement = document.querySelector(".restricted-items");
  const milSpecElement = document.querySelector(".milspec-items");
  const statTrakElement = document.querySelector(".stattrak-items");

  if (!goldElement || !covertElement || !classifiedElement || !restrictedElement || !milSpecElement || !statTrakElement) return;

  updateStatsBar(goldElement, totalCases, goldCount);
  updateStatsBar(covertElement, totalCases, covertGrade);
  updateStatsBar(classifiedElement, totalCases, classifiedGrade);
  updateStatsBar(restrictedElement, totalCases, restrictedGrade);
  updateStatsBar(milSpecElement, totalCases, milSpecGrade);
  updateStatsBar(statTrakElement, totalCases, statTrakCount);

  const totalOpenedCasesContainer = document.querySelector("#total-cases");
  const mostOpenedCaseContainer = document.querySelector("#most-opened-case");
  const casesSinceLastGoldContainer = document.querySelector("#cases-since-last-gold");
  const totalCashInvestedContainer = document.querySelector("#total-cash-invested");

  if (!totalOpenedCasesContainer || !mostOpenedCaseContainer || !casesSinceLastGoldContainer || !totalCashInvestedContainer) return;

  totalOpenedCasesContainer.textContent = String(totalCases);
  mostOpenedCaseContainer.textContent = mostOpenedCase;
  casesSinceLastGoldContainer.textContent = String(casesSinceLastGold);
  totalCashInvestedContainer.textContent = `$${totalCashInvested}~`;
}

export async function addLastPulledItems(results: CaseResult[], prepend: boolean = false, afterElement?: Element | null) {
  const lastPulledContainer = document.querySelector(".last-pulled-items > .lpi-container");
  if (!lastPulledContainer) return;

  if (!lastPulledTemplate) {
    lastPulledTemplate = await getHtmlTemplate("pulled-item");
  }

  for (const result of results) {
    const tempContainer = document.createElement("div");
    tempContainer.innerHTML = lastPulledTemplate;
    const pulledItem = tempContainer.firstElementChild as HTMLDivElement;
    if (!pulledItem) continue;

    const itemImage = pulledItem.querySelector(".item-image");
    const itemName = pulledItem.querySelector(".item-name");

    if (!itemImage || !itemName) continue;

    itemImage.setAttribute("src", `https://community.cloudflare.steamstatic.com/economy/image/${result.receivedItemData.icon_url}`);
    itemName.textContent = result.receivedItemData.name;
    (itemName as HTMLParagraphElement).style.color = `#${result.receivedItemData.name_color}`;

    if (!prepend) {
      lastPulledContainer.insertBefore(pulledItem, lastPulledContainer.firstChild);
    } else {
      if (afterElement) {
        afterElement.insertAdjacentElement("afterend", pulledItem);
      }
    }

    if (result.receivedItemData.name.includes("★")) {
      console.log(result);
      const goldContainer = document.querySelector(".last-pulled-golds > .lpg-container");
      if (!goldContainer) continue;
      goldContainer.insertBefore(pulledItem, goldContainer.firstChild);
    }
  }
}

function resetLastPulledItems() {
  const lastPulledContainer = document.querySelector(".last-pulled-items > .lpi-container");
  if (!lastPulledContainer) return;
  lastPulledContainer.innerHTML = "";
}

export function parseHistoryPage(page: InventoryHistoryResponse) {
  const results: CaseResult[] = [];
  const dom = new DOMParser().parseFromString(page.html, "text/html");
  const children = dom.querySelectorAll(".tradehistory_event_description");

  for (const child of children) {
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
      console.log("Failed to find items containers:", child);
      continue;
    }

    const givenItemsContainer = givenItemsGroupContainer
      .querySelector(".history_item");

    const givenItemsContainerCase = givenItemsContainer
      ?.querySelector(".history_item_name");

    const receivedItemsContainer = receivedItemsGroupContainer
      .querySelector(".history_item")
      ?.querySelector(".history_item_name");

    if (!givenItemsContainer || !givenItemsContainerCase || !receivedItemsContainer) {
      console.log("Failed to find items containers:", child);
      continue;
    }

    const itemName = receivedItemsContainer.textContent?.trim();
    if (!itemName || itemName.includes("Sticker") || itemName.includes("Souvenir")) {
      continue;
    }

    const receivedItemData = getItemDataFromDescriptions(page.descriptions, itemName);

    if (!receivedItemData) {
      console.log("Failed to find item data:", child);
      continue;
    }

    results.push({
      caseName: givenItemsContainerCase.textContent!.trim(),
      historyId: givenItemsContainer.id,
      receivedItemData,
    });
  }

  return results;
}