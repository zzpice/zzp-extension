import { firefoxSearch, extensionUrl } from "./firefox";
import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router";
import {
  ArrowUpRight,
  Bookmark,
  Folder,
  Search,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import { browser } from "wxt/browser";
import SearchPage, {
  type SearchRuntime,
} from "../vendor/home/src/pages/SearchPage";
import { createNavigation } from "../vendor/home/src/features/navigation/navigation";
import { preferences } from "../vendor/home/src/features/settings/preferences";
import { useDomain } from "../vendor/home/src/hooks/useDomain";
import { installImeGuard, isImeKey } from "../vendor/home/src/lib/ime";
import { SlidingSelection } from "../vendor/home/src/components/SlidingSelection";
import { PreferenceCheckbox } from "../vendor/home/src/features/settings/PreferenceCheckbox";
import { Modal } from "../vendor/home/src/components/Modal";
import { pendingCaptures, HOME, type PendingCapture } from "./captures";
import catalog from "../public/icon-catalog.json";
const icons = new Set(catalog.icons.map((icon) => icon.path));
const navigation = createNavigation({
  apiUrl: HOME + "/api/v1/public/navigation",
  seedUrl: extensionUrl("/navigation.json"),
});
function OnlineHome() {
  const location = useLocation();
  useEffect(() => {
    window.location.replace(HOME + location.pathname + location.search);
  }, [location]);
  return (
    <main id="main">
      <p role="status">正在打开 Home…</p>
      <a href={HOME + location.pathname + location.search}>继续前往 Home</a>
    </main>
  );
}
export function NewTab() {
  const nav = useDomain(navigation);
  const prefs = useDomain(preferences);
  const [settings, setSettings] = useState(false);
  const [pending, setPending] = useState<PendingCapture[]>([]);
  const [message, setMessage] = useState("");
  const [defaultLabel, setDefaultLabel] = useState("Firefox 默认搜索");
  const location = useLocation();
  useEffect(() => {
    void navigation.load();
    const refresh = () => {
      void pendingCaptures()
        .then(setPending)
        .catch(() => setMessage("无法读取待收藏，请稍后重试。"));
    };
    refresh();
    browser.storage.onChanged.addListener(refresh);
    const apply = () => preferences.apply();
    apply();
    const stop = preferences.subscribe(apply);
    const media = matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    const stopIme = installImeGuard();
    const shortcut = (event: KeyboardEvent) => {
      if (
        !isImeKey(event) &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k" &&
        !document.querySelector('[role="dialog"]')
      ) {
        event.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    addEventListener("keydown", shortcut);
    document.documentElement.dataset.ready = "true";
    return () => {
      stop();
      stopIme();
      media.removeEventListener("change", apply);
      browser.storage.onChanged.removeListener(refresh);
      removeEventListener("keydown", shortcut);
    };
  }, []);
  useEffect(() => {
    const read = () => {
      void firefoxSearch
        .get()
        .then((engines) => {
          const engine = engines.find((engine) => engine.isDefault);
          setDefaultLabel(
            engine ? `Firefox 默认 · ${engine.name}` : "Firefox 默认搜索",
          );
        })
        .catch(() => {});
    };
    read();
    document.addEventListener("visibilitychange", read);
    return () => document.removeEventListener("visibilitychange", read);
  }, []);
  const runtime: SearchRuntime = {
    defaultLabel,
    search: async (query) => {
      await firefoxSearch.search({ query, disposition: "CURRENT_TAB" });
    },
    iconUrl: (path) => (icons.has(path) ? extensionUrl("/" + path) : null),
  };
  const pages = [
    { url: "/", label: "搜索", Icon: Search },
    { url: HOME + "/nav/", label: "导航", Icon: Bookmark },
    { url: HOME + "/projects/", label: "项目", Icon: Folder },
    { url: HOME + "/admin/", label: "工作台", Icon: LayoutDashboard },
  ];
  const links = pages.map(({ url, label, Icon }) =>
    url === "/" ? (
      <Link key={label} to="/" className="page-link active" aria-current="page">
        <Icon aria-hidden="true" />
        <span>{label}</span>
      </Link>
    ) : (
      <a key={label} href={url} className="page-link">
        <Icon aria-hidden="true" />
        <span>{label}</span>
      </a>
    ),
  );
  const action = async (type: "retry" | "discard", id: string) => {
    setMessage("");
    try {
      await browser.runtime.sendMessage({ type, id });
    } catch {
      setMessage("操作未完成，待收藏保留，请重试。");
    }
  };
  return (
    <>
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <div className="app-layout search-layout">
        <aside className="app-sidebar">
          <Link to="/" className="brand" aria-label="Zzp Home 首页">
            <span className="brand-monogram" aria-hidden="true">
              z.
            </span>
            <span className="brand-word">Zzp</span>
          </Link>
          <SlidingSelection as="nav" className="primary-nav" aria-label="页面">
            {links}
          </SlidingSelection>
          <div className="sidebar-bottom">
            <button
              className="icon-button sidebar-settings"
              aria-label="设置"
              onClick={() => setSettings(true)}
            >
              <Settings aria-hidden="true" />
            </button>
            <span className="connection-status" role="status" title={nav.state}>
              {nav.state.includes("离线")
                ? "离线缓存"
                : nav.state.includes("暂不可用")
                  ? "使用缓存"
                  : "已就绪"}
            </span>
          </div>
        </aside>
        <div className="app-content">
          <header className="mobile-header">
            <Link to="/" className="brand">
              <span className="brand-monogram">z.</span>
              <span>Zzp</span>
            </Link>
            <button
              className="icon-button"
              aria-label="设置"
              onClick={() => setSettings(true)}
            >
              <Settings aria-hidden="true" />
            </button>
          </header>
          {location.search.includes("captureError=1") && (
            <p className="extension-notice" role="status">
              未能打开收藏。请在普通 HTTP(S)
              网页点击收藏按钮；已捕获的内容保留在设置中的「待收藏」。
            </p>
          )}
          <Routes>
            <Route
              path="/"
              element={<SearchPage source={navigation} runtime={runtime} />}
            />
            <Route path="*" element={<OnlineHome />} />
          </Routes>
        </div>
      </div>
      <SlidingSelection as="nav" className="bottom-nav" aria-label="主要导航">
        {links}
      </SlidingSelection>
      {settings && (
        <Modal open title="新标签页设置" onClose={() => setSettings(false)}>
          <div className="admin-form">
            <div className="settings-row">
              <span>配色</span>
              <SlidingSelection
                className="segmented-control"
                role="group"
                aria-label="配色"
              >
                {(
                  [
                    ["light", "浅色"],
                    ["dark", "深色"],
                    ["system", "跟随系统"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={prefs.value.theme === value}
                    onClick={() => {
                      prefs.value.theme = value;
                    }}
                  >
                    {label}
                  </button>
                ))}
              </SlidingSelection>
            </div>
            <PreferenceCheckbox
              label="显示成人分类"
              checked={prefs.value.adult}
              onChange={(checked) => {
                prefs.value.adult = checked;
              }}
            />
            <p className="muted">
              搜索引擎与收藏分类在 Home
              工作台维护。新标签页仅缓存公开收藏；私人内容保留在 Home 工作台。
            </p>
            <a className="text-button" href={HOME + "/admin/"}>
              打开工作台 <ArrowUpRight aria-hidden="true" />
            </a>
            <h3>待收藏 · {pending.length}</h3>
            <p className="muted">
              已进入 Home 草稿的项目会自动移出此列表。关闭登录页后可在此继续。
            </p>
            {pending.map((item) => (
              <article className="pending-capture" key={item.capture.id}>
                <strong>{item.capture.title}</strong>
                <small>{item.capture.url}</small>
                <div className="button-row">
                  <button
                    className="button primary"
                    onClick={() => void action("retry", item.capture.id)}
                  >
                    继续收藏
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "丢弃这条待收藏？Home 中已有的草稿不受影响。",
                        )
                      )
                        void action("discard", item.capture.id);
                    }}
                  >
                    丢弃
                  </button>
                </div>
              </article>
            ))}
            {!pending.length && <p className="muted">没有待处理项目。</p>}
            {message && <p role="status">{message}</p>}
            <p className="muted">
              版本 {browser.runtime.getManifest().version} · 扩展代码随 Firefox
              安装包更新。搜索词只在执行搜索时发送给所选引擎。
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
