import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location("release", Path(__file__).parents[1] / "scripts/prepare_release.py")
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.xpi = Path(self.temp.name) / "signed.xpi"
        self.config = {"id": "test@example.org", "updateUrl": "https://example.org/updates.json", "repository": "example/addon"}
        self.manifest = {"version": "1.2.3", "manifest_version": 3, "browser_specific_settings": {"gecko": {"id": self.config["id"], "update_url": self.config["updateUrl"], "strict_min_version": "142.0"}}}

    def package(self, signed=True):
        with zipfile.ZipFile(self.xpi, "w") as archive:
            archive.writestr("manifest.json", json.dumps(self.manifest))
            if signed:
                # Structural test fixtures only, never used as install artifacts.
                archive.writestr("META-INF/mozilla.rsa", "fixture")
                archive.writestr("META-INF/manifest.mf", "fixture")

    def test_exact_hash_identity_and_https_download(self):
        self.package()
        name, feed = release.prepare(self.xpi, self.manifest, self.config)
        update = feed["addons"][self.config["id"]]["updates"][0]
        self.assertEqual(name, "zzp-home-1.2.3.xpi")
        self.assertEqual(update["update_hash"], "sha256:" + hashlib.sha256(self.xpi.read_bytes()).hexdigest())
        self.assertEqual(update["update_link"], "https://github.com/example/addon/releases/download/v1.2.3/zzp-home-1.2.3.xpi")

    def test_unsigned_and_changed_manifest_rejected(self):
        self.package(False)
        with self.assertRaises(ValueError):
            release.prepare(self.xpi, self.manifest, self.config)
        self.package()
        changed = {**self.manifest, "version": "1.2.4"}
        with self.assertRaises(ValueError):
            release.prepare(self.xpi, changed, self.config)

    def test_same_version_and_downgrade_rejected(self):
        self.package()
        for version in ["1.2.3", "1.2.4", "2.0.0"]:
            previous = {"addons": {self.config["id"]: {"updates": [{"version": version}]}}}
            with self.assertRaises(ValueError):
                release.prepare(self.xpi, self.manifest, self.config, previous)

    def test_prerelease_and_invalid_versions_rejected(self):
        for version in ["1.0.0-beta", "01.0.0", "65536.0.0", "1.0", "1.2.3.4"]:
            with self.assertRaises(ValueError):
                release.version_parts(version)
