import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
const assets = process.argv[2];
if (!assets) throw Error("Usage: node scripts/sync-assets.mjs /path/to/assets");
const catalog = JSON.parse(
  await readFile("vendor/home/public/icon-catalog.json", "utf8"),
);
const revision = catalog.revision;
execFileSync("git", ["-C", assets, "cat-file", "-e", revision + "^{commit}"]);
const readAsset = (path) =>
  execFileSync("git", ["-C", assets, "show", revision + ":" + path], {
    maxBuffer: 8 * 1024 * 1024,
  });
for (const icon of catalog.icons) {
  if (!/^icons\/[a-z0-9-]+\/[a-z0-9-]+\.png$/.test(icon.path))
    throw Error("Invalid icon path");
  const png = readAsset(icon.path);
  if (
    png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
    png.readUInt32BE(16) !== 512 ||
    png.readUInt32BE(20) !== 512 ||
    png[25] !== 6 ||
    createHash("sha256").update(png).digest("hex") !== icon.sha256
  )
    throw Error("Icon failed validation: " + icon.path);
  const destination = resolve("public", icon.path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, png);
}
await copyFile(
  "vendor/home/public/icon-catalog.json",
  "public/icon-catalog.json",
);
await mkdir("public/brand", { recursive: true });
await copyFile(
  "vendor/home/public/brand/icon-512.png",
  "public/brand/icon-512.png",
);
const source = JSON.parse(
  await readFile("vendor/home/data/navigation.json", "utf8"),
);
await writeFile(
  "public/navigation.json",
  JSON.stringify({ ...source, groups: [] }) + "\n",
);
await mkdir("public/attribution", { recursive: true });
await writeFile("public/attribution/SOURCES.md", readAsset("icons/SOURCES.md"));
await writeFile(
  "public/attribution/navigation-sources.json",
  readAsset("icons/navigation-sources.json"),
);
await mkdir("public/attribution/licenses", { recursive: true });
for (const name of [
  "oasisic-mit.txt",
  "dashboard-icons-apache-2.0.txt",
  "global-bank-logos-mit.txt",
  "simple-icons-cc0.txt",
  "icongo-mit.txt",
  "selfhst-cc-by-4.0.txt",
  "s-ui-frontend-gpl-3.0.txt",
  "tailwindcss-mit.txt",
]) {
  await copyFile(
    "vendor/home/public/attribution/licenses/" + name,
    "public/attribution/licenses/" + name,
  );
}
console.log(
  `Copied ${catalog.icons.length} original 512×512 RGBA PNGs from ${revision}`,
);
