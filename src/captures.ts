import { browser } from "wxt/browser";
import {
  captureSchema,
  bookmarkKey,
  type Capture,
} from "../vendor/home/shared/extension";
export type PendingCapture = {
  capture: Capture;
  createdAt: string;
  tabId?: number;
};
export const prefix = "capture:";
export const HOME = "https://zzp.moe";
export async function pendingCaptures(): Promise<PendingCapture[]> {
  const values = await browser.storage.local.get(null);
  return Object.entries(values)
    .flatMap(([key, value]) => {
      if (!key.startsWith(prefix) || !value || typeof value !== "object")
        return [];
      const record = value as Record<string, unknown>;
      const parsed = captureSchema.safeParse(record.capture);
      return parsed.success &&
        key === prefix + parsed.data.id &&
        typeof record.createdAt === "string"
        ? [
            {
              capture: parsed.data,
              createdAt: record.createdAt,
              tabId:
                typeof record.tabId === "number" ? record.tabId : undefined,
            },
          ]
        : [];
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export async function openCapture(id: string) {
  const key = prefix + id;
  const value = (await browser.storage.local.get(key))[key] as
    PendingCapture | undefined;
  if (!value || !captureSchema.safeParse(value.capture).success)
    throw Error("待收藏不存在。");
  // Persist the destination before navigation, including an intervening Access login.
  const tab = await browser.tabs.create({ url: "about:blank" });
  if (tab.id === undefined) throw Error("无法打开 Home。");
  await browser.storage.local.set({ [key]: { ...value, tabId: tab.id } });
  await browser.tabs.update(tab.id, { url: HOME + "/admin/" });
}
export async function collect(title: string, url: string) {
  const capture = captureSchema.parse({
    version: 1,
    id: crypto.randomUUID(),
    title: (title || new URL(url).hostname).slice(0, 120),
    url,
  });
  const pending = await pendingCaptures();
  const existing = pending.find(
    (item) => bookmarkKey(item.capture.url) === bookmarkKey(url),
  );
  if (existing) return openCapture(existing.capture.id);
  if (pending.length >= 50) throw Error("待收藏已满，请先处理现有内容。");
  await browser.storage.local.set({
    [prefix + capture.id]: { capture, createdAt: new Date().toISOString() },
  });
  await openCapture(capture.id);
}
export function isHomeWorkbench(url: string | undefined) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.origin === HOME && parsed.pathname === "/admin/";
  } catch {
    return false;
  }
}
