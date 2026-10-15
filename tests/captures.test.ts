import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  values: {} as Record<string, unknown>,
  create: vi.fn(),
  update: vi.fn(),
}));
vi.mock("wxt/browser", () => ({
  browser: {
    storage: {
      local: {
        get: async (key: string | null) =>
          key ? { [key]: mock.values[key] } : { ...mock.values },
        set: async (value: object) => {
          Object.assign(mock.values, value);
        },
      },
    },
    tabs: { create: mock.create, update: mock.update },
  },
}));
import { collect, pendingCaptures, isHomeWorkbench } from "../src/captures";
beforeEach(() => {
  mock.values = {};
  mock.create.mockReset().mockResolvedValue({ id: 7 });
  mock.update.mockReset().mockResolvedValue({});
});
it("captures are durable before opening Home and contain no URL payload in the login URL", async () => {
  await collect("中文页面", "https://example.org/page#x");
  const items = await pendingCaptures();
  expect(items).toHaveLength(1);
  expect(items[0]!.tabId).toBe(7);
  expect(mock.update).toHaveBeenCalledWith(7, {
    url: "https://zzp.moe/admin/",
  });
  await collect("重复页面", "https://example.org/page#another");
  expect(await pendingCaptures()).toHaveLength(1);
});
it("failed Home navigation retains the captured page", async () => {
  mock.update.mockRejectedValue(Error("offline"));
  await expect(collect("页面", "https://example.org")).rejects.toThrow();
  expect(await pendingCaptures()).toHaveLength(1);
});
it("unsupported URLs and credential URLs are never stored", async () => {
  for (const url of [
    "about:config",
    "javascript:alert(1)",
    "https://user:password@example.org",
  ])
    await expect(collect("页面", url)).rejects.toThrow();
  expect(await pendingCaptures()).toHaveLength(0);
});
it("only the exact HTTPS Home workbench can claim captures", () => {
  expect(isHomeWorkbench("https://zzp.moe/admin/")).toBe(true);
  for (const url of [
    "https://zzp.moe/",
    "http://zzp.moe/admin/",
    "https://zzp.moe.attacker.org/admin/",
    "https://example.org/admin/",
  ])
    expect(isHomeWorkbench(url)).toBe(false);
});
