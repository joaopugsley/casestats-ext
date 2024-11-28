import browser from "webextension-polyfill";

browser.runtime.onMessage.addListener((message: any) => {
  if (message.type === "GET_EXTENSION_VERSION") {
    return Promise.resolve(browser.runtime.getManifest().version);
  }
});

browser.action.onClicked.addListener(() => {
  const url = "https://steamcommunity.com/id/me/inventoryhistory/";
  browser.tabs.create({ url });
});