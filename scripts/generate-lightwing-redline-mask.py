#!/usr/bin/env python3
"""Convert the user's Layer 2 red outline to native-pixel floor spans.

Only the two short south-entrance line ends are closed at the image edge.
The lake bridge remains a separate, activation-only part of the same outline.
"""

from hashlib import sha256
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
BACKGROUND = ROOT / "assets/concepts/environments/lightwing-crystal-cavern/lightwing-crystal-cavern-full-map-concept-v3.png"
REDLINE = ROOT / "docs/references/lightwing-crystal-cavern-walk-boundary-red-v1.png"
OUTPUT = ROOT / "assets/environments/lightwing-crystal-cavern/lightwing-crystal-cavern-walkability-v1.rle.json"
BRIDGE_START = 800
BRIDGE_END = 1170


def spans_for_row(row):
    padded = np.pad(row.astype(np.int8), (1, 1))
    changes = np.diff(padded)
    return list(zip(np.flatnonzero(changes == 1).tolist(), np.flatnonzero(changes == -1).tolist()))


def main():
    background = np.asarray(Image.open(BACKGROUND).convert("RGB"), dtype=np.int16)
    painted = np.asarray(Image.open(REDLINE).convert("RGB"), dtype=np.int16)
    if background.shape != (960, 1638, 3) or painted.shape != background.shape:
        raise ValueError("The background and redline must be aligned 1638x960 images")
    difference = np.max(np.abs(background - painted), axis=2) > 5
    # Match the approved review overlay's antialiasing-gap closure.
    boundary = np.array(Image.fromarray((difference * 255).astype(np.uint8))
                        .filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9)))
    boundary[[0, -1], :] = 255
    boundary[:, [0, -1]] = 255
    boundary[950:960, 506:511] = 255
    boundary[955:960, 441:446] = 255
    filled = Image.fromarray(boundary).copy()
    ImageDraw.floodfill(filled, (470, 900), 128, thresh=0)
    inside = np.asarray(filled) == 128
    if not 170000 < int(inside.sum()) < 177000:
        raise ValueError("The red outline leaked or selected the wrong region")

    bridge = inside.copy()
    bridge[:, :BRIDGE_START] = False
    bridge[:, BRIDGE_END + 1:] = False
    static = inside & ~bridge
    for x, y, expected in [(470, 900, True), (300, 190, True),
                            (170, 630, True), (950, 380, True),
                            (1415, 245, True), (565, 375, False),
                            (900, 600, False)]:
        if bool(inside[y, x]) != expected:
            raise ValueError(f"Unexpected redline classification at {x},{y}")
    if np.any(bridge[:, :BRIDGE_START]) or np.any(bridge[:, BRIDGE_END + 1:]):
        raise ValueError("Bridge pixels escaped their reviewed x interval")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "version": 1,
        "coordinateSpace": "lightwing-crystal-cavern-full-map-concept-v3-native-pixels",
        "sourceWidth": 1638,
        "sourceHeight": 960,
        "redlineSha256": sha256(REDLINE.read_bytes()).hexdigest(),
        "bridgeSourceX": [BRIDGE_START, BRIDGE_END],
        "staticRows": [spans_for_row(row) for row in static],
        "bridgeRows": [spans_for_row(row) for row in bridge],
    }
    OUTPUT.write_text(json.dumps(data, separators=(",", ":")) + "\n")
    print(f"static={int(static.sum())} bridge={int(bridge.sum())} output={OUTPUT}")


if __name__ == "__main__":
    main()
