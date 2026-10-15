"""Verify the Firefox new-tab override and native signed updates in a disposable profile."""
import base64
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import time
import urllib.error
import urllib.request

ID = "zzp-extension@zzp.moe"
HOME = "https://zzp.moe/"


def main():
    driver = os.environ.get("GECKODRIVER_BINARY") or shutil.which("geckodriver")
    binary = os.environ.get("FIREFOX_BINARY") or shutil.which("firefox")
    signed_xpi = os.environ.get("SIGNED_XPI")
    expected = os.environ.get("EXPECTED_UPDATE_VERSION")
    if not driver or not binary:
        raise RuntimeError("Set FIREFOX_BINARY and GECKODRIVER_BINARY to official Mozilla binaries")
    if expected and not signed_xpi:
        raise RuntimeError("An older Mozilla-signed SIGNED_XPI is required for update verification")
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    output = Path("artifacts")
    output.mkdir(exist_ok=True)
    with (output / "geckodriver.log").open("w") as log:
        process = subprocess.Popen([driver, "--port", str(port), "--allow-system-access", "--log", "error"], stdout=log, stderr=log)
        endpoint = f"http://127.0.0.1:{port}"
        session = None

        def call(path, data=None, method=None):
            request = urllib.request.Request(endpoint + path, data=json.dumps(data).encode() if data is not None else None, headers={"Content-Type": "application/json"}, method=method)
            try:
                return json.load(urllib.request.urlopen(request, timeout=150))["value"]
            except urllib.error.HTTPError as error:
                raise RuntimeError(error.read().decode()) from error

        try:
            for _ in range(100):
                try:
                    call("/status")
                    break
                except urllib.error.URLError:
                    time.sleep(0.1)
            capabilities = call("/session", {"capabilities": {"alwaysMatch": {"browserName": "firefox", "moz:firefoxOptions": {"binary": binary, "args": ["-headless", "-no-remote"]}}}})
            session = capabilities["sessionId"]
            prefix = "/session/" + session

            def command(path, data=None, method=None):
                return call(prefix + path, data, method)

            def script(code):
                return command("/execute/sync", {"script": code, "args": []})

            def async_script(code):
                value = command("/execute/async", {"script": "const done=arguments[0];(async()=>{" + code + "})().then(done,error=>done({error:String(error)}));", "args": []})
                assert not isinstance(value, dict) or "error" not in value, value
                return value

            command("/timeouts", {"script": 120000})
            command("/moz/addon/install", {"path": str(Path(signed_xpi or ".output/firefox-mv3").resolve()), "temporary": not bool(signed_xpi)})
            command("/moz/context", {"context": "chrome"})
            addon_state = 'const {AddonManager:AM}=ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");const a=await AM.getAddonByID("zzp-extension@zzp.moe");return {id:a.id,version:a.version,active:a.isActive,signed:a.signedState===AM.SIGNEDSTATE_SIGNED||a.signedState===AM.SIGNEDSTATE_PRELIMINARY,temporary:a.temporarilyInstalled};'
            initial = async_script(addon_state)
            assert initial["active"], initial
            if signed_xpi:
                assert initial["signed"] and not initial["temporary"], initial
            ids = json.loads(script('return Services.prefs.getStringPref("extensions.webextensions.uuids")'))
            extension_url = "moz-extension://" + ids[ID] + "/newtab.html"
            if expected:
                config = json.loads(Path("release-config.json").read_text())
                with urllib.request.urlopen(config["updateUrl"], timeout=60) as response:
                    update = json.load(response)["addons"][ID]["updates"][0]
                assert update["version"] == expected and expected != initial["version"], update
                failed = async_script('const {AddonManager:AM}=ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");const i=await AM.getInstallForURL(' + json.dumps(update["update_link"]) + ',{hash:"sha256:"+"0".repeat(64)});return await new Promise((resolve,reject)=>{i.addListener({onDownloadFailed(i){resolve({rejected:i.error===AM.ERROR_INCORRECT_HASH});},onInstallEnded(){reject(Error("Incorrect hash accepted"));},onInstallFailed(i){reject(Error("Unexpected failure "+i.error));}});i.install().catch(reject);});')
                assert failed["rejected"], failed
                assert async_script(addon_state) == initial
                installed = async_script('const {AddonManager:AM}=ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");const a=await AM.getAddonByID("zzp-extension@zzp.moe");return await new Promise((resolve,reject)=>{a.findUpdates({onUpdateAvailable(a,i){i.addListener({onInstallEnded(i,n){resolve({version:n.version,id:n.id});},onDownloadFailed(i){reject(Error("Download failed "+i.error));},onInstallFailed(i){reject(Error("Install failed "+i.error));}});i.install().catch(reject);},onNoUpdateAvailable(){reject(Error("No update from the installed update_url"));},onUpdateFinished(a,status){if(status)reject(Error("Update check failed "+status));}},AM.UPDATE_WHEN_USER_REQUESTED);});')
                assert installed == {"version": expected, "id": ID}, installed
                updated = async_script(addon_state)
                assert updated["signed"] and updated["active"] and updated["version"] == expected, updated
                print("Signed update passed:", initial["version"], "->", expected, "HTTPS discovery, bad hash preserves old version, native Mozilla signature")
            override = script('return ChromeUtils.importESModule("resource:///modules/AboutNewTab.sys.mjs").AboutNewTab.newTabURL')
            assert override == extension_url, override
            command("/moz/context", {"context": "content"})
            command("/url", {"url": override})
            for _ in range(200):
                if command("/url").startswith(HOME) and script('return !!document.querySelector("#global-search")'):
                    break
                time.sleep(0.1)
            assert command("/url") == HOME
            assert script('return !!document.querySelector("#global-search")'), "Existing Home did not load"
            assert "Zzp" in script("return document.title")
            (output / "firefox-smoke.png").write_bytes(base64.b64decode(command("/screenshot")))
            print("Native Firefox new tab passed:", capabilities["capabilities"]["browserVersion"], "registered override opens existing Home")
        finally:
            if session:
                try:
                    call("/session/" + session, method="DELETE")
                except Exception:
                    pass
            process.terminate()
            process.wait(timeout=20)


if __name__ == "__main__":
    main()
