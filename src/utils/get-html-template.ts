import browser from "webextension-polyfill";

export async function getHtmlTemplate(template: string) {
  const htmlTemplateUrl = browser.runtime.getURL(`templates/${template}.html`);
  const response = await fetch(htmlTemplateUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch HTML template: ${htmlTemplateUrl}`);
  }
  const htmlTemplate = await response.text();
  return htmlTemplate;
}