import { defineConfig } from "wxt";
import release from "./release-config.json";
import icons from "./vendor/home/data/zzp-home-icons.json";
// WXT forwards this option to its unimport plugin; keep all Home imports explicit.
const imports = { autoImport: false, dirs: [] };
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifestVersion: 3,
  imports,
  vite: () => ({
    resolve: { dedupe: ["react", "react-dom", "react-router"] },
    define: {
      "import.meta.env.VITE_HOME_ORIGIN": JSON.stringify("https://zzp.moe"),
      "import.meta.env.VITE_HOME_ORIGINAL_ICONS": JSON.stringify("1"),
    },
  }),
  manifest: {
    name: "Zzp Home",
    description: "Zzp Home 新标签页与收藏草稿，沿用 Home 原有搜索。",
    homepage_url: "https://github.com/zzpice/zzp-extension",
    permissions: ["activeTab", "storage"],
    host_permissions: ["https://zzp.moe/*"],
    action: { default_title: "收藏到 Zzp Home" },
    icons: { 48: "brand/icon-48.png", 96: "brand/icon-96.png" },
    commands: {
      _execute_action: {
        suggested_key: { default: "Alt+Shift+S" },
        description: "收藏到 Zzp Home",
      },
    },
    incognito: "not_allowed",
    browser_specific_settings: {
      gecko: {
        id: release.id,
        update_url: release.updateUrl,
        strict_min_version: "142.0",
        data_collection_permissions: {
          required: ["searchTerms", "websiteContent", "browsingActivity"],
        },
      },
    },
    content_security_policy: {
      extension_pages: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://raw.githubusercontent.com/zzpice/assets/${icons.revision}/icons/; connect-src https://zzp.moe; object-src 'none'; base-uri 'none'; form-action 'none'`,
    },
  },
});
