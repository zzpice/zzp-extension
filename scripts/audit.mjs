import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
const root = ".output/firefox-mv3";
const manifest = JSON.parse(await readFile(root + "/manifest.json", "utf8"));
const release = JSON.parse(await readFile("release-config.json", "utf8"));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.chrome_url_overrides.newtab, "newtab.html");
assert.equal(manifest.browser_specific_settings.gecko.id, release.id);
assert.equal(
  manifest.browser_specific_settings.gecko.update_url,
  release.updateUrl,
);
assert.deepEqual(
  manifest.browser_specific_settings.gecko.data_collection_permissions.required,
  ["none"],
);
for (const field of [
  "permissions",
  "host_permissions",
  "optional_permissions",
  "optional_host_permissions",
])
  assert(!manifest[field]?.length, "No API or host permissions: " + field);
for (const field of [
  "background",
  "content_scripts",
  "action",
  "browser_action",
  "commands",
  "options_ui",
  "web_accessible_resources",
])
  assert(!manifest[field], "Removed feature in manifest: " + field);
const files = [];
async function scan(dir) {
  for (const file of await readdir(dir, { withFileTypes: true })) {
    const path = dir + "/" + file.name;
    if (file.isDirectory()) await scan(path);
    else {
      files.push(path.slice(root.length + 1));
      assert(!path.endsWith(".map"));
      if (!/\.(js|json|html)$/.test(path)) continue;
      const text = await readFile(path, "utf8");
      assert(
        !/browser\.storage|browser\.tabs|browser\.search|zzp-home-extension|capture:|\/(?:api|admin)\//.test(
          text,
        ),
        "Removed runtime code in " + path,
      );
    }
  }
}
await scan(root);
assert(
  files.every((file) =>
    /^(?:manifest\.json|newtab\.html|chunks\/newtab-[\w-]+\.js|brand\/icon-(?:48|96)\.png)$/.test(
      file,
    ),
  ),
  files,
);
console.log(
  "Package audit passed: new tab and native signed updates only; no API permissions, background, content scripts, or copied Home resources.",
);
