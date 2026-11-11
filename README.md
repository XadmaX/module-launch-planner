# Module Launch Planner

An unofficial, offline event planner for Last Z players. Open **index.html** in a modern browser. Choose your language, enter your current draws, tokens, remaining days and extra budget, then check the projected milestone and today's tasks. The sample values are illustrative. Your settings stay in the current browser.

## Optional screenshot reader

The Python helper reads an image you save yourself. It reads tokens, Luck, completed draws and the countdown from an unobstructed **English Module Spin screen in 9:16 portrait orientation**. The planner interface and the OCR language are independent. Check the recognized values against the image before planning a purchase.

Install Python 3.10+, Pillow and the Tesseract CLI with English trained data. Make sure `tesseract` is on your PATH. Then run:

```sh
python3 -m pip install Pillow
python3 read_snapshot.py wheel.png > snapshot.json
```

Open the planner and use **Import helper JSON** to load the four readings. Images stay on your computer. The reader works on one saved file per invocation and requires no game login, emulator connection or network access.

## Planning assumptions

The calculator models the paid Prime Pass from level 2, three token pack sizes, and prices recorded in November 2026. Set today's availability and remaining limits to match your own store. Budget is additional spend, in euros. Draw milestones and the Luck jackpot use separate counters. Prices, reset dates and rewards may change.

## License and attribution

Original code and interface translations are licensed under MIT (see LICENSE). Last Z and its game content belong to their respective owners. This project is independent of OMNILOJO. The license applies to the project code. Consult the [publisher's terms](https://last-z.com/terms/es/tos.html) when using the game. Pillow and Tesseract are separately installed dependencies under their own licenses.
