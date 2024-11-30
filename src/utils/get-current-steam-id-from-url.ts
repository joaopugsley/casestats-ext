export function getCurrentSteamIdFromURL() {
  const url = window.location.href;
  const urlMatch = url.match(/\/id\/([^\/]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  return null;
}