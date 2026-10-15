"""Create the complete, tracked source archive required by Mozilla review."""
from pathlib import Path
import subprocess
import zipfile

files = subprocess.check_output(["git", "ls-files", "--recurse-submodules", "-z"]).decode().split("\0")
output = Path("artifacts/source.zip")
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
    for file in files:
        if file and Path(file).is_file():
            archive.write(file, file)
    if "vendor/home/src/pages/SearchPage.tsx" not in archive.namelist():
        raise RuntimeError("Home submodule source is missing")
print("Complete review source: artifacts/source.zip")
