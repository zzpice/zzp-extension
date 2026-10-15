"""Validate a Mozilla-signed XPI and prepare a hash-pinned Firefox update feed."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import zipfile


def version_parts(value):
    if not re.fullmatch(r"(?:0|[1-9][0-9]{0,4})\.(?:0|[1-9][0-9]{0,4})\.(?:0|[1-9][0-9]{0,4})", value):
        raise ValueError("Use a stable three-part numeric Firefox version")
    parts = tuple(map(int, value.split(".")))
    if any(part > 65535 for part in parts):
        raise ValueError("Firefox version component exceeds 65535")
    return parts


def prepare(xpi, manifest, config, previous=None):
    version_parts(manifest["version"])
    with zipfile.ZipFile(xpi) as archive:
        signed = json.loads(archive.read("manifest.json"))
        if signed != manifest:
            raise ValueError("Signed manifest differs from the tested build")
        signatures = set(archive.namelist())
        if not {"META-INF/mozilla.rsa", "META-INF/manifest.mf"}.issubset(signatures):
            raise ValueError("Mozilla signature is missing; never distribute an unsigned ZIP")
    gecko = signed["browser_specific_settings"]["gecko"]
    if gecko["id"] != config["id"] or gecko["update_url"] != config["updateUrl"]:
        raise ValueError("Extension identity or update URL changed")
    if signed["manifest_version"] != 3:
        raise ValueError("Firefox MV3 is required")
    if previous:
        old = previous["addons"][config["id"]]["updates"]
        if any(version_parts(item["version"]) >= version_parts(signed["version"]) for item in old):
            raise ValueError("Version must increase; do not reuse signed versions")
    filename = f"zzp-home-{signed['version']}.xpi"
    base = "https://github.com/" + config["repository"] + "/releases/"
    update = {
        "version": signed["version"],
        "update_link": base + "download/v" + signed["version"] + "/" + filename,
        "update_hash": "sha256:" + hashlib.sha256(Path(xpi).read_bytes()).hexdigest(),
        "update_info_url": base + "tag/v" + signed["version"],
        "applications": {"gecko": {"strict_min_version": gecko["strict_min_version"]}},
    }
    return filename, {"addons": {config["id"]: {"updates": [update]}}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("xpi", type=Path)
    parser.add_argument("--previous", type=Path)
    args = parser.parse_args()
    config = json.loads(Path("release-config.json").read_text())
    manifest = json.loads(Path(".output/firefox-mv3/manifest.json").read_text())
    previous = json.loads(args.previous.read_text()) if args.previous else None
    name, feed = prepare(args.xpi, manifest, config, previous)
    destination = Path("artifacts/release")
    destination.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(args.xpi, destination / name)
    (destination / "updates.json").write_text(json.dumps(feed, indent=2) + "\n")
    (destination / "SHA256SUMS").write_text(f"{hashlib.sha256(args.xpi.read_bytes()).hexdigest()}  {name}\n")
    print(f"Validated signed package: {name}; Firefox feed uses the exact signed SHA-256.")


if __name__ == "__main__":
    main()
