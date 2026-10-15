import { browser } from "wxt/browser";
// WXT's default browser types describe Chromium's search.query API. These are
// the native Firefox search APIs; no polyfill or fallback engine is installed.
export const firefoxSearch = browser.search as unknown as {
  get(): Promise<Array<{ name: string; isDefault: boolean }>>;
  search(options: { query: string; disposition: "CURRENT_TAB" }): Promise<void>;
};
export const extensionUrl = (path: string) =>
  new URL(path, browser.runtime.getURL("/newtab.html")).href;
