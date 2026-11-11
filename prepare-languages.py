"""Install the pinned Tesseract fast models for the browser's game-language picker."""
from concurrent.futures import ThreadPoolExecutor
import gzip
from pathlib import Path
import sys
from urllib.request import urlopen

REVISION = "87416418657359cb625c412a48b6e1d6d41c29bd"
CODES = "rus ukr deu tur spa ara chi_sim chi_tra jpn kor fra cat por ita pol ind vie tha nld msa hin urd".split()

def install(code):
    url = f"https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/{REVISION}/{code}.traineddata"
    with urlopen(url, timeout=90) as response:
        data = response.read()
    if len(data) < 100_000:
        raise ValueError(f"Incomplete OCR model: {code}")
    path = destination / f"{code}.traineddata.gz"
    path.with_suffix(".tmp").write_bytes(gzip.compress(data, compresslevel=6, mtime=0))
    path.with_suffix(".tmp").replace(path)

if __name__ == "__main__":
    destination = Path(sys.argv[1])
    destination.mkdir(parents=True, exist_ok=True)
    license_url = f"https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/{REVISION}/LICENSE"
    with urlopen(license_url, timeout=90) as response:
        (destination / "LICENSE-tessdata-fast.txt").write_bytes(response.read())
    with ThreadPoolExecutor(max_workers=5) as pool:
        list(pool.map(install, CODES))
