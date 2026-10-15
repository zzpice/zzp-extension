import { defineBackground } from "wxt/utils/define-background";
import { browser } from "wxt/browser";
import {
  collect,
  openCapture,
  pendingCaptures,
  prefix,
  isHomeWorkbench,
} from "../src/captures";
export default defineBackground(() => {
  browser.action.onClicked.addListener((tab) => {
    void (async () => {
      try {
        if (!tab.url || !/^https?:\/\//i.test(tab.url))
          throw Error("只能收藏 HTTP(S) 网页。");
        await collect(tab.title || "", tab.url);
      } catch {
        await browser.tabs.create({
          url: browser.runtime.getURL("/newtab.html") + "#/?captureError=1",
        });
      }
    })();
  });
  browser.runtime.onMessage.addListener(async (message: unknown, sender) => {
    if (
      sender.id !== browser.runtime.id ||
      !message ||
      typeof message !== "object" ||
      !("type" in message)
    )
      return;
    const request = message as { type: string; id?: string };
    if (
      isHomeWorkbench(sender.url) &&
      sender.frameId === 0 &&
      sender.tab?.id !== undefined
    ) {
      const item = (await pendingCaptures()).find(
        (item) => item.tabId === sender.tab!.id,
      );
      if (!item) return;
      if (request.type === "claim") return item.capture;
      if (request.type === "complete" && request.id === item.capture.id) {
        await browser.storage.local.remove(prefix + item.capture.id);
        return { completed: true };
      }
      return;
    }
    if (!sender.url?.startsWith(browser.runtime.getURL("/"))) return;
    if (request.type === "retry" && request.id) await openCapture(request.id);
    if (request.type === "discard" && request.id)
      await browser.storage.local.remove(prefix + request.id);
  });
});
