import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = ".output/firefox-mv3";
const manifest = JSON.parse(await readFile(root + "/manifest.json", "utf8"));
assert.equal(manifest.manifest_version, 3);
const release = JSON.parse(await readFile("release-config.json", "utf8"));
assert.equal(manifest.browser_specific_settings.gecko.id, release.id);
assert.equal(
  manifest.browser_specific_settings.gecko.update_url,
  release.updateUrl,
);
assert.deepEqual([...manifest.permissions].sort(), ["activeTab", "storage"]);
assert.deepEqual(manifest.host_permissions, ["https://zzp.moe/*"]);
assert.equal(manifest.chrome_url_overrides.newtab, "newtab.html");
assert.deepEqual(manifest.content_scripts[0].matches, [
  "https://zzp.moe/admin/",
]);
assert(!manifest.background.service_worker, "Firefox uses an event page");
assert(
  !manifest.web_accessible_resources?.length,
  "No remotely callable extension resources",
);
for (const file of ["icons", "icon-catalog.json", "zzp-home-icons.png"])
  assert(
    !(await readdir(root)).includes(file),
    "Do not bundle the assets icon library or catalog",
  );
const originalSearchHash =
  "984863ff71e146b9035cf0e65fa13b06871c43914cb91f69af2d702cc5e1ce21";
assert.equal(
  createHash("sha256")
    .update(await readFile("vendor/home/src/pages/SearchPage.tsx"))
    .digest("hex"),
  originalSearchHash,
  "Keep the original Home search component unchanged",
);
assert.deepEqual(
  JSON.parse(await readFile(root + "/navigation.json", "utf8")).groups,
  [],
);
const privateIds = (await import("../vendor/home/shared/privacy.ts"))
  .PRIVATE_IDS;
const home = JSON.parse(
  await readFile("vendor/home/data/navigation.json", "utf8"),
);
const privateUrls = home.groups
  .flatMap((g) => g.sites)
  .filter((s) => privateIds.includes(s.id))
  .flatMap((s) => [s.url, ...s.alternateUrls]);
async function scan(dir) {
  for (const file of await readdir(dir, { withFileTypes: true })) {
    const path = dir + "/" + file.name;
    if (file.isDirectory()) await scan(path);
    else {
      assert(!path.endsWith(".map"), "Source map in install package");
      if (!/\.(js|json|html|css)$/.test(path)) continue;
      const text = await readFile(path, "utf8");
      for (const value of privateUrls)
        assert(!text.includes(value), "Private URL in package");
      assert(
        !/gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(
          text,
        ),
        "Credential in package",
      );
      assert(
        !path.endsWith(".js") ||
          !/suggestqueries|google\.com\/complete|bing\.com\/osjson|favicon\.(?:ico|png)/i.test(
            text,
          ),
        "Unapproved suggestions or favicon endpoint",
      );
    }
  }
}
await scan(root);
console.log(
  `Package audit passed: minimal permissions, no private URLs or secrets, original Home search, on-demand original icons.`,
);
