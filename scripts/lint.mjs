import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const run = spawnSync(
  process.execPath,
  [
    "node_modules/web-ext/bin/web-ext.js",
    "lint",
    "--source-dir",
    ".output/firefox-mv3",
    "--self-hosted",
    "--output",
    "json",
  ],
  { encoding: "utf8" },
);
if (run.error) throw run.error;
const report = JSON.parse(run.stdout);
assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
assert.equal(report.notices.length, 0, JSON.stringify(report.notices));
// Locked React DOM supports __html; React Router includes framework-mode module
// loading. Neither capability is used by this app. Reject every other warning.
assert(report.warnings.length <= 3);
for (const warning of report.warnings) {
  assert.equal(warning.code, "UNSAFE_VAR_ASSIGNMENT");
  assert.match(warning.file, /^chunks\/newtab-[\w-]+\.js$/);
  const line = (
    await readFile(".output/firefox-mv3/" + warning.file, "utf8")
  ).split("\n")[warning.line - 1];
  const snippet = line.slice(warning.column - 120, warning.column + 80);
  assert(
    (snippet.includes("e.innerHTML=n") && snippet.includes("__html")) ||
      /import\(\w\.module\)/.test(snippet),
    snippet,
  );
}
console.log(
  `Mozilla lint: 0 errors; ${report.warnings.length} reviewed dependency warnings (React DOM / React Router).`,
);
