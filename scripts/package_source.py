"""Create the complete, tracked source archive required by Mozilla review."""
from pathlib import Path
import subprocess
import zipfile

files = subprocess.check_output(["git", "ls-files", "-z"]).decode().split("\0")
output = Path("artifacts/source.zip")
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
    for file in files:
        if file and Path(file).is_file():
            archive.write(file, file)
    if not {"entrypoints/newtab/main.ts", "wxt.config.ts", "pnpm-lock.yaml"}.issubset(archive.namelist()):
        raise RuntimeError("Build source is incomplete")
print("Complete review source: artifacts/source.zip")
