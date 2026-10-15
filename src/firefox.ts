import { browser } from "wxt/browser";
export const extensionUrl = (path: string) =>
  new URL(path, browser.runtime.getURL("/newtab.html")).href;
