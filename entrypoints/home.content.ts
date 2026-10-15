import { defineContentScript } from "wxt/utils/define-content-script";
import { browser } from "wxt/browser";
import {
  captureSchema,
  EXTENSION_EVENTS,
} from "../vendor/home/shared/extension";
export default defineContentScript({
  matches: ["https://zzp.moe/admin/"],
  runAt: "document_idle",
  main(ctx) {
    void (async () => {
      const parsed = captureSchema.safeParse(
        await browser.runtime.sendMessage({ type: "claim" }),
      );
      if (!parsed.success || !ctx.isValid) return;
      const capture = parsed.data;
      let completed = false;
      let attempts = 0;
      const notice = document.createElement("p");
      notice.setAttribute("role", "status");
      notice.style.cssText =
        "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;max-width:90vw;padding:12px 20px;border:1px solid var(--color-line,#888);border-radius:16px;background:var(--color-panel,#fff);color:var(--color-ink,#222);font:14px system-ui;box-shadow:0 4px 24px #0002";
      notice.textContent =
        "正在交接收藏；请先完成登录或处理工作台中的未完成输入。";
      document.body.append(notice);
      const receive = (event: Event) => {
        const detail: unknown = (event as CustomEvent).detail;
        if (typeof detail !== "string" || detail.length > 1000) return;
        try {
          const value = JSON.parse(detail);
          if (
            event.type === EXTENSION_EVENTS.ready &&
            value.version === 1 &&
            value.ready === true &&
            !completed
          )
            document.dispatchEvent(
              new CustomEvent(EXTENSION_EVENTS.capture, {
                detail: JSON.stringify(capture),
              }),
            );
          if (
            event.type === EXTENSION_EVENTS.receipt &&
            value.version === 1 &&
            value.id === capture.id &&
            value.saved === true &&
            !completed
          ) {
            completed = true;
            void browser.runtime
              .sendMessage({ type: "complete", id: capture.id })
              .then(() => {
                notice.remove();
                cleanup();
              });
          }
        } catch {
          /* Ignore unrelated page events. */
        }
      };
      const ping = () => {
        if (completed) return;
        document.dispatchEvent(new CustomEvent(EXTENSION_EVENTS.ping));
        if (++attempts === 15)
          notice.textContent =
            "待收藏已保留。请完成登录、处理未完成输入；若 Home 尚未更新，请稍后从扩展新标签页重试。";
      };
      const cleanup = () => {
        clearInterval(timer);
        document.removeEventListener(EXTENSION_EVENTS.ready, receive);
        document.removeEventListener(EXTENSION_EVENTS.receipt, receive);
        notice.remove();
      };
      document.addEventListener(EXTENSION_EVENTS.ready, receive);
      document.addEventListener(EXTENSION_EVENTS.receipt, receive);
      const timer = setInterval(ping, 2000);
      ctx.onInvalidated(cleanup);
      ping();
    })().catch(() => {
      /* The capture stays in extension storage for retry. */
    });
  },
});
