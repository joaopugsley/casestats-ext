import { getCurrentSteamIdFromURL } from "./get-current-steam-id-from-url";

export function getSteamIdFromUserInfo() {
  const userInfoEl = document.querySelector("[data-userinfo]");
  if (!userInfoEl) return getCurrentSteamIdFromURL();

  const rawData = userInfoEl.getAttribute("data-userinfo");
  const decodedData = rawData!.replace(/&quot;/g, '"');

  const userInfo = JSON.parse(decodedData);

  return userInfo.steamid || null;
}