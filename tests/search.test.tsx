import { afterEach, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import SearchPage, {
  type SearchRuntime,
} from "../vendor/home/src/pages/SearchPage";
import { createNavigation } from "../vendor/home/src/features/navigation/navigation";
import { parseNavigation } from "../vendor/home/shared/navigation";
import { installImeGuard } from "../vendor/home/src/lib/ime";
import fixture from "../vendor/home/tests/fixtures/navigation.json";
afterEach(cleanup);
function setup() {
  HTMLElement.prototype.scrollIntoView = vi.fn();
  const source = createNavigation();
  source.data = parseNavigation(fixture);
  source.state = "已就绪";
  const runtime: SearchRuntime = {
    search: vi.fn().mockResolvedValue(undefined),
    defaultLabel: "Firefox 默认 · 测试引擎",
    iconUrl: () => null,
  };
  render(
    <MemoryRouter>
      <SearchPage source={source} runtime={runtime} />
    </MemoryRouter>,
  );
  return {
    runtime,
    source,
    input: screen.getByRole("combobox", { name: "搜索关键词" }),
  };
}
it("ordinary search uses Firefox default without changing Home engine configuration", async () => {
  const { input, runtime, source } = setup();
  const config = JSON.stringify(source.data!.settings.search);
  fireEvent.change(input, { target: { value: "中文 & Firefox" } });
  fireEvent.submit(screen.getByRole("search"));
  expect(runtime.search).toHaveBeenCalledWith("中文 & Firefox");
  expect(JSON.stringify(source.data!.settings.search)).toBe(config);
  expect(screen.getByLabelText("搜索引擎")).toHaveValue("browser-default");
});
it("Firefox failure keeps input and presents a retryable error", async () => {
  const { input, runtime } = setup();
  vi.mocked(runtime.search).mockRejectedValue(Error());
  fireEvent.change(input, { target: { value: "仍然保留" } });
  await act(async () => {
    fireEvent.submit(screen.getByRole("search"));
  });
  expect(screen.getByRole("alert")).toHaveTextContent("浏览器搜索未能启动");
  expect(input).toHaveValue("仍然保留");
});
it("local suggestions support arrow selection and pointer selection", () => {
  const { input, source } = setup();
  const title = source.data!.groups.flatMap((g) => g.sites)[0]!.title;
  fireEvent.change(input, { target: { value: title } });
  const options = screen
    .getAllByRole("option")
    .filter((node) => node.tagName === "A");
  expect(options.length).toBeGreaterThan(0);
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(options[0]).toHaveAttribute("aria-selected", "true");
  fireEvent.mouseEnter(options[0]!);
  expect(input).toHaveAttribute("aria-activedescendant", options[0]!.id);
  fireEvent.keyDown(input, { key: "Escape" });
  expect(input).not.toHaveAttribute("aria-activedescendant");
});
it("IME candidate selection cannot call the browser search API", () => {
  const stop = installImeGuard();
  try {
    const { input, runtime } = setup();
    fireEvent.change(input, { target: { value: "中文输入" } });
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Enter", isComposing: true, keyCode: 229 });
    fireEvent.submit(screen.getByRole("search"));
    expect(runtime.search).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
    fireEvent.submit(screen.getByRole("search"));
    expect(runtime.search).not.toHaveBeenCalled();
  } finally {
    stop();
  }
});
