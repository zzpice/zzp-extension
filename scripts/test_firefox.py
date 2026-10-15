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
                    return json.load(urllib.request.urlopen(request, timeout=60))["value"]
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

            command("/moz/addon/install", {"path": str(Path(".output/firefox-mv3").resolve()), "temporary": True})
            command("/moz/context", {"context": "chrome"})
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
            engines = command("/execute/async", {"script": "browser.search.get().then(e=>arguments[0](e.map(v=>({name:v.name,isDefault:v.isDefault}))))", "args": []})
            assert any(engine["isDefault"] for engine in engines)
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
            command("/moz/context", {"context": "chrome"})
            script("Services.io.offline=true")
            command("/moz/context", {"context": "content"})
            command("/refresh", {})
            assert script('return !!document.querySelector("#global-search")')
            (output / "firefox-smoke.png").write_bytes(base64.b64decode(command("/screenshot")))
            print("Native Firefox smoke passed:", capabilities["capabilities"]["browserVersion"], "MV3 load, native search API, theme persistence, IME, offline shell")
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
