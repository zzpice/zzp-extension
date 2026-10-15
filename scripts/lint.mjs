import { spawnSync } from "node:child_process";
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
for (const field of ["errors", "warnings", "notices"])
  assert.equal(report[field].length, 0, JSON.stringify(report[field]));
console.log("Mozilla lint: 0 errors, 0 warnings, 0 notices.");
