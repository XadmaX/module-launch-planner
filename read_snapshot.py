"""Read a user-selected English Module Spin screenshot, entirely offline."""
import argparse
import io
import json
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageOps


class ReadError(Exception):
    pass


def parse_frame(path):
    with Image.open(path) as original:
        if abs(original.width / original.height - 9 / 16) > .016:
            raise ReadError('Expected a portrait 9:16 screenshot.')
        img = original.convert("RGB").resize((900, 1600), Image.Resampling.LANCZOS)

    def read(box, threshold, allowed=None):
        area = img.crop(box)
        area = area.resize((area.width * 3, area.height * 3), Image.Resampling.BICUBIC)
        mono = ImageOps.invert(area.convert("L").point(lambda x: 255 if x > threshold else 0))
        buff = io.BytesIO()
        ImageOps.expand(mono, border=12, fill=255).save(buff, format="PNG")
        cmd = ["tesseract", "stdin", "stdout", "--psm", "7", "-l", "eng"]
        if allowed:
            cmd.extend(["-c", "tessedit_char_whitelist=" + allowed])
        result = subprocess.run(cmd, input=buff.getvalue(), capture_output=True, check=True, timeout=5)
        return result.stdout.decode().strip()

    if (read((82, 43, 327, 102), 185).casefold() != "module spin"
            or read((397, 670, 495, 711), 185).casefold() != "luck"):
        raise ReadError('Open Module Spin and close any overlays before saving the image.')

    def verified(label, box, thresholds, pattern, allowed=None):
        readings = [read(box, t, allowed).replace(" ", "") for t in thresholds]
        if readings[0] == readings[1]:
            match = re.fullmatch(pattern, readings[0], re.I)
            if match:
                return match
        raise ReadError('Could not reliably read the field: ' + label)

    # The token counter moves with the width of the diamond balance.
    green = img.crop((640, 60, 735, 88))
    columns = [x for x in range(green.width) if any(
        g > 130 and g > 1.5*r and g > 1.5*b
        for r, g, b in (green.getpixel((x, y)) for y in range(green.height)))]
    if not columns or not 18 <= columns[-1] - columns[0] <= 30:
        raise ReadError('Could not locate the token counter.')
    plus = 640 + columns[0]
    tokens = int(verified("tokens", (plus-66, 47, plus-4, 98), (191, 205), r"[0-9]{1,4}", "0123456789")[0])
    luck = int(verified("Luck", (388, 706, 518, 775), (170, 190), r"[0-9]{1,3}", "0123456789")[0])
    draws = int(verified("Draws", (111, 1159, 322, 1207), (170, 198), r"Draws:([0-9]{1,5})")[1])
    timer = verified("timer", (69, 106, 253, 148), (170, 191),
                     r"(?:([0-6])d)?([0-9]{1,2}):([0-5][0-9]):([0-5][0-9])", "0123456789d:")
    days, hours, minutes, seconds = [int(n or 0) for n in timer.groups()]
    if hours >= 24 or luck > min(draws, 200):
        raise ReadError('The values are inconsistent. Save a new image after the animation.')
    return dict(tokens=tokens, luck=luck, draws=draws,
                seconds=((days*24+hours)*60+minutes)*60+seconds)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(parse_frame(args.image)))
    except (ReadError, OSError, subprocess.SubprocessError) as exc:
        parser.exit(1, f"Could not read screenshot: {exc}\n")
