import { defineConfig } from "wxt";
import release from "./release-config.json";
export default defineConfig({
  manifestVersion: 3,
  manifest: {
    name: "Zzp Home",
    description: "Firefox 新标签页打开 Zzp Home，支持签名自动更新。",
    homepage_url: "https://github.com/zzpice/zzp-extension",
    icons: { 48: "brand/icon-48.png", 96: "brand/icon-96.png" },
    incognito: "not_allowed",
    browser_specific_settings: {
      gecko: {
        id: release.id,
        update_url: release.updateUrl,
        strict_min_version: "142.0",
        data_collection_permissions: { required: ["none"] },
      },
    },
    content_security_policy: {
      extension_pages:
        "default-src 'none'; script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
    },
  },
});
