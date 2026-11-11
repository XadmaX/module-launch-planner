# Module Launch Planner

An unofficial event planner for Last Z players. [Open the planner](https://last-z-module-launch.framedrabbit4.chatgpt.site/) on your phone or computer.

## Read a screenshot on your phone

1. Take a portrait screenshot of **Module Spin** with the wheel unobstructed.
2. [Choose the screenshot in the planner](https://last-z-module-launch.framedrabbit4.chatgpt.site/#screenshot). Set **Game language in the screenshot** to the language shown in the game. It initially follows the planner language and remembers a separate choice. Changing it while reviewing a screenshot reads the image again. The first reading downloads the OCR engine and the required language data. The browser processes the image on your device.
3. Compare tokens, Luck, draws and the countdown with the preview. Correct any value or fill in a blank. The timer format is **days:hours:minutes:seconds** (for example, **4:09:04:07**).
4. Select **Apply and recalculate**. The planner rounds the countdown up to remaining event days and keeps your budget and store settings.

The browser reader supports all 23 planner locales, including both Chinese scripts. Original English 9:16 screenshots and generated localized examples were used for validation. Localized layouts, fonts and other aspect ratios can require corrections. A screenshot reflects the moment it was taken.

## Use the manual planner offline

1. [Download the planner ZIP](https://github.com/XadmaX/module-launch-planner/archive/refs/heads/main.zip) (or use **Code → Download ZIP** on GitHub).
2. Extract the ZIP. In the extracted folder, double-click **index.html** to open the planner in your browser.
3. Choose your language. Replace the sample values with your draws, tokens, days remaining and additional budget. The projected milestone and today's tasks update as you type.

**That's all you need for manual entry.** No account, BlueStacks, Python or terminal is required. Settings stay in the current browser.

## Optional: read the numbers from a screenshot

[Download the helper ZIP](https://github.com/XadmaX/module-launch-planner/archive/refs/heads/main.zip) and extract it on your Windows PC or Mac. This optional desktop helper expects the English game screen. It reads a **saved image** on your computer. It does not connect to BlueStacks. If you already have a suitable screenshot from your phone or emulator, skip straight to the reader setup.

### 1. Get a suitable screenshot

- **Windows:** Follow the [official BlueStacks 5 installation guide](https://support.bluestacks.com/hc/en-us/articles/360061525271-How-to-download-and-install-BlueStacks-5). Run the installer, then open the store in BlueStacks and install **Last Z: Survival Shooter**.
- **Mac with Apple silicon:** Follow the [official BlueStacks Air installation and game setup guide](https://support.bluestacks.com/hc/en-us/articles/32272892398093-How-to-install-and-play-games-with-BlueStacks-Air-on-Mac). Download Air, open the installer package, then find **Last Z: Survival Shooter** in the store. On an Intel Mac, use manual entry or a suitable screenshot from another device.
- Set the **game** language to English and use a **9:16 portrait** display (for example, 900 × 1600). Open **Module Spin**, close reward pop-ups and wait for the wheel to stop. The title, tokens, Luck, Draws and countdown must all be visible.
- Save just the game image, without the window frame, side toolbar or desktop. On Windows, use the [BlueStacks camera button and Open Folder](https://support.bluestacks.com/hc/en-us/articles/360061825432-How-to-take-a-screenshot-in-BlueStacks-5). On Mac you can press **Shift–Command–4** and select exactly the game area. Save the PNG as **wheel.png** next to **read_snapshot.py**.

### 2. Install the reader once

The reader needs Python 3.10 or newer, Pillow, and the Tesseract program with English language data. Pick the instructions for your computer. Run each command in order; stop if one reports an error.

**Windows 10/11 (PowerShell).** Open PowerShell and install the two system programs:

```powershell
winget install --id Python.Python.3.12 --exact
winget install --id UB-Mannheim.TesseractOCR --exact
```

If Windows does not recognize `winget`, use the [Python installer](https://www.python.org/downloads/windows/) and the Windows installer linked by the [Tesseract project](https://tesseract-ocr.github.io/tessdoc/Installation.html#windows). Include English language data. Then close PowerShell. In File Explorer, open the extracted planner folder containing **read_snapshot.py**, type `powershell` in the address bar and press Enter. Run:

```powershell
$env:Path += ";$env:ProgramFiles\Tesseract-OCR"
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
tesseract --list-langs
```

The last command must list **eng**. If Tesseract is not found, replace the folder in the first line with the actual folder containing `tesseract.exe`. The PATH change applies to this PowerShell window; repeat that first line if you open a new one. If `py` is unavailable, try `python --version` and use `python -m venv .venv` if it reports Python 3.10 or newer.

**macOS (Terminal).** If you do not have Homebrew, follow the [Homebrew installation guide](https://brew.sh/) first, including its printed “Next steps”. Open Terminal, type `cd ` (with a space), drag the extracted planner folder into the window and press Return. Run:

```sh
brew install python@3.12 tesseract
"$(brew --prefix python@3.12)/bin/python3.12" -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
tesseract --list-langs
```

Check that the last command lists **eng**. Pillow installs into the project folder; no environment activation is needed.

### 3. Import your first reading

With **wheel.png** in the extracted planner folder, run the command for your system there:

| System | Command |
| --- | --- |
| Windows (PowerShell) | `.\.venv\Scripts\python.exe read_snapshot.py wheel.png -o snapshot.json` |
| macOS (Terminal) | `./.venv/bin/python read_snapshot.py wheel.png -o snapshot.json` |

After the command finishes successfully, open the [online planner](https://last-z-module-launch.framedrabbit4.chatgpt.site/#helper) or your local **index.html**, click **Import helper JSON** (the wording follows your planner language) and choose **snapshot.json**. Compare the four readings with the image. Budget and store availability are still yours to enter. For the next reading, replace **wheel.png** and repeat just this step. If recognition fails, take a fresh screenshot or type the values manually; do not import an older JSON by mistake. No image is uploaded.

## Planning assumptions

The calculator models the paid Prime Pass from level 2, three token pack sizes, and prices recorded in November 2026. Set today's availability and remaining limits to match your own store. Budget is additional spend, in euros. Draw milestones and the Luck jackpot use separate counters. Prices, reset dates and rewards may change.

## License and attribution

Original code and interface translations are licensed under MIT (see LICENSE). Last Z and its game content belong to their respective owners. This project is independent of OMNILOJO. The license applies to the project code. Consult the [publisher's terms](https://last-z.com/terms/es/tos.html) when using the game. Pillow and Tesseract are separately installed dependencies under their own licenses.

## Host the screenshot reader

Place `index.html` and `spin-reader.js` together. Run `sh prepare-ocr.sh` from this directory with Node/npm and Python 3 to prepare the pinned browser runtime and language models in `ocr/`. Serve those files on one origin over HTTP or HTTPS. Opening the downloaded HTML directly supports manual planning and links to the hosted screenshot reader. The runtime is loaded only when an image is selected. Third-party OCR assets retain their own licenses.
