"""Smoke-test the real Firefox MV3 package in a fresh, disposable profile."""
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


def main():
    driver = os.environ.get("GECKODRIVER_BINARY") or shutil.which("geckodriver")
    binary = os.environ.get("FIREFOX_BINARY") or shutil.which("firefox")
    if not driver or not binary:
        raise RuntimeError("Set FIREFOX_BINARY and GECKODRIVER_BINARY to official Firefox/geckodriver binaries")
    signed_xpi = os.environ.get("SIGNED_XPI")
    update_version = os.environ.get("EXPECTED_UPDATE_VERSION")
    if update_version and not signed_xpi:
        raise RuntimeError("Update verification requires an older Mozilla-signed SIGNED_XPI")
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    output = Path("artifacts")
    output.mkdir(exist_ok=True)
    with (output / "geckodriver.log").open("w") as log:
        process = subprocess.Popen([driver, "--port", str(port), "--allow-system-access", "--log", "error"], stdout=log, stderr=log)
        session = None
        try:
            endpoint = f"http://127.0.0.1:{port}"

            def call(path, data=None, method=None):
                request = urllib.request.Request(endpoint + path, data=json.dumps(data).encode() if data is not None else None, headers={"Content-Type": "application/json"}, method=method)
                try:
                    return json.load(urllib.request.urlopen(request, timeout=150))["value"]
                except urllib.error.HTTPError as error:
                    raise RuntimeError(error.read().decode()) from error

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
            package = Path(signed_xpi or ".output/firefox-mv3").resolve()
            command("/moz/addon/install", {"path": str(package), "temporary": not bool(signed_xpi)})
            command("/moz/context", {"context": "chrome"})
            addon_state = 'const {AddonManager:AM}=ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");const a=await AM.getAddonByID("zzp-extension@zzp.moe");return {id:a.id,version:a.version,active:a.isActive,signed:a.signedState===AM.SIGNEDSTATE_SIGNED||a.signedState===AM.SIGNEDSTATE_PRELIMINARY,temporary:a.temporarilyInstalled};'
            initial = async_script(addon_state)
            assert initial["active"], initial
            if signed_xpi:
                assert initial["signed"] and not initial["temporary"], initial
            ids = json.loads(script('return Services.prefs.getStringPref("extensions.webextensions.uuids")'))
            command("/moz/context", {"context": "content"})
            extension_url = "moz-extension://" + ids["zzp-extension@zzp.moe"] + "/newtab.html"
            command("/url", {"url": extension_url})
            for _ in range(100):
                if script('return !!document.querySelector("#global-search")'):
                    break
                time.sleep(0.1)
            assert script('return document.title') == "搜索 · Zzp"
            assert script('return document.querySelector("#global-search").value') == ""
            assert script('return document.activeElement.id') != "global-search", "Do not take focus from Firefox's address bar"
            script('document.querySelector(".skip-link").click()')
            assert command("/url") == extension_url
            assert script('return document.activeElement.id') == "main"
            if not update_version:
                assert script('return !browser.runtime.getManifest().permissions.includes("search")')
                assert script('return !document.querySelector("option[value=browser-default]")')
            script('document.querySelector("button[aria-label=设置]").click()')
            for _ in range(100):
                if script('return !!document.querySelector("[role=dialog]")'):
                    break
                time.sleep(0.1)
            script('[...document.querySelectorAll("button")].find(b=>b.textContent==="深色").click()')
            command("/refresh", {})
            assert script('return document.documentElement.dataset.theme') == "dark"
            script('const x=document.querySelector("#global-search");x.dispatchEvent(new CompositionEvent("compositionstart",{bubbles:true}));document.querySelector("form").requestSubmit();x.dispatchEvent(new CompositionEvent("compositionend",{bubbles:true}));')
            assert command("/url") == extension_url
            if update_version:
                config = json.loads(Path("release-config.json").read_text())
                with urllib.request.urlopen(config["updateUrl"], timeout=60) as response:
                    update = json.load(response)["addons"][config["id"]]["updates"][0]
                assert update["version"] == update_version and update_version != initial["version"], update
                # This fixture exists only in the disposable test profile.
                fixture = {"capture:00000000-0000-4000-8000-000000000001": {"capture": {"version": 1, "id": "00000000-0000-4000-8000-000000000001", "title": "Update preservation check", "url": "https://example.com/"}, "createdAt": "2026-10-15T00:00:00.000Z"}}
                async_script("await browser.storage.local.set(" + json.dumps(fixture) + ");return true;")
                command("/url", {"url": "about:blank"})
                command("/moz/context", {"context": "chrome"})
                # Exercise Firefox's native downloader with an intentionally wrong hash.
                # Production feed and signed bytes remain untouched.
                failure = async_script('const {AddonManager:AM}=ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");const i=await AM.getInstallForURL(' + json.dumps(update["update_link"]) + ',{hash:"sha256:"+"0".repeat(64)});return await new Promise((resolve,reject)=>{i.addListener({onDownloadFailed(i){resolve({rejected:i.error===AM.ERROR_INCORRECT_HASH});},onInstallEnded(){reject(Error("Incorrect hash was accepted"));},onInstallFailed(i){reject(Error("Unexpected install error "+i.error));}});i.install();});')
                assert failure["rejected"], failure
                assert async_script(addon_state) == initial, "A failed update must preserve the installed version"
                result = async_script('const {AddonManager:AM}=ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");const a=await AM.getAddonByID("zzp-extension@zzp.moe");return await new Promise((resolve,reject)=>{a.findUpdates({onUpdateAvailable(a,i){i.addListener({onInstallEnded(i,n){resolve({version:n.version,id:n.id});},onDownloadFailed(i){reject(Error("Update download failed "+i.error));},onInstallFailed(i){reject(Error("Update install failed "+i.error));}});i.install();},onNoUpdateAvailable(){reject(Error("No update available from the installed update_url"));},onUpdateFinished(a,status){if(status)reject(Error("Update check failed "+status));}},AM.UPDATE_WHEN_USER_REQUESTED);});')
                assert result == {"version": update_version, "id": config["id"]}, result
                updated = async_script(addon_state)
                assert updated["signed"] and updated["active"] and updated["version"] == update_version, updated
                command("/moz/context", {"context": "content"})
                command("/url", {"url": extension_url})
                for _ in range(100):
                    if script('return !!document.querySelector("#global-search")'):
                        break
                    time.sleep(0.1)
                assert script('return !browser.runtime.getManifest().permissions.includes("search")')
                assert script('return !document.querySelector("option[value=browser-default]")')
                assert script('return document.documentElement.dataset.theme') == "dark"
                assert async_script("return await browser.storage.local.get(" + json.dumps(list(fixture)) + ");") == fixture
                print("Signed update passed:", initial["version"], "->", update_version, "HTTPS discovery, bad hash preserves old version, native Mozilla signature, theme and pending capture preserved")
            def icon_result():
                element = command("/element", {"using": "css selector", "value": "#global-search"})["element-6066-11e4-a52e-4f735466cecf"]
                command("/element/" + element + "/value", {"text": "GitHub"})
                for _ in range(150):
                    state = script('const e=document.querySelector(".bookmark-result .site-icon");const i=e?.querySelector("img");return e?{src:i?.src||"",width:i?.naturalWidth||0,height:i?.naturalHeight||0,text:e.textContent.trim()}:null;')
                    if state and (state["width"] or state["text"]):
                        return state
                    time.sleep(0.1)
                raise AssertionError("No rendered icon or text fallback for the public GitHub bookmark")

            verify_icons = os.environ.get("VERIFY_REMOTE_ICONS") == "1"
            if verify_icons:
                icon = icon_result()
                revision = json.loads(Path("vendor/home/data/zzp-home-icons.json").read_text())["revision"]
                assert icon["src"].startswith("https://raw.githubusercontent.com/zzpice/assets/" + revision + "/icons/"), icon
                assert (icon["width"], icon["height"]) == (512, 512), icon
            command("/moz/context", {"context": "chrome"})
            script("Services.io.offline=true")
            command("/moz/context", {"context": "content"})
            command("/refresh", {})
            assert script('return !!document.querySelector("#global-search")')
            if verify_icons:
                cached = icon_result()
                assert cached["width"] == 512 or cached["text"], cached
                command("/moz/context", {"context": "chrome"})
                script("Services.cache2.clear()")
                command("/moz/context", {"context": "content"})
                command("/refresh", {})
                fallback = icon_result()
                assert not fallback["src"] and fallback["text"], fallback
                print("Original icon checks passed: on-demand 512px PNG, browser cache offline, text fallback without image cache")
            (output / "firefox-smoke.png").write_bytes(base64.b64decode(command("/screenshot")))
            print("Native Firefox smoke passed:", capabilities["capabilities"]["browserVersion"], "MV3 load, original Home search, theme persistence, IME, offline shell")
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
