#!/usr/bin/env python3
"""Apply the approved north-edge-only correction to the Layer 2 bridge mask.

The v1 redline mask remains the immutable source. These hand-reviewed points
follow the cobblestone walking surface in the activated 1638x960 bridge art;
the crystal tips, masonry side, and water are not navigation floor.
"""

from hashlib import sha256
import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / "assets/environments/lightwing-crystal-cavern"
BASE = ENV / "lightwing-crystal-cavern-walkability-v1.rle.json"
OUTPUT = ENV / "lightwing-crystal-cavern-walkability-v2.rle.json"
BACKGROUND = ROOT / "assets/concepts/environments/lightwing-crystal-cavern/lightwing-crystal-cavern-full-map-concept-v3.png"
BRIDGE_ART = ENV / "lightwing-crystal-bridge-layer-v2.png"
REVIEW = ROOT / "docs/screenshots/layer2-bridge-north-edge-mask-review-v2.png"
REVIEW_ZOOM = ROOT / "docs/screenshots/layer2-bridge-north-edge-mask-review-zoom-v2.png"
BRIDGE_START, BRIDGE_END = 800, 1170

# Native image x and first walkable y, traced against the bridge's stone top.
# The short shore connections remain open at y=390 and y=394 respectively.
NORTH_EDGE = [
    (800, 390), (830, 386), (875, 381), (925, 377), (975, 375),
    (1025, 375), (1075, 377), (1125, 384), (1170, 394),
]


def decode(rows):
    mask = np.zeros((960, 1638), dtype=bool)
    for y, spans in enumerate(rows):
        for left, right in spans:
            mask[y, left:right] = True
    return mask


def spans_for_row(row):
    padded = np.pad(row.astype(np.int8), (1, 1))
    changes = np.diff(padded)
    return list(zip(np.flatnonzero(changes == 1).tolist(), np.flatnonzero(changes == -1).tolist()))


def main():
    original = json.loads(BASE.read_text())
    if original["version"] != 1 or original["sourceWidth"] != 1638 or original["sourceHeight"] != 960:
        raise ValueError("Unexpected Layer 2 redline mask")
    if Image.open(BRIDGE_ART).size != (1638, 960):
        raise ValueError("Bridge art must use the original image coordinates")

    before = decode(original["bridgeRows"])
    bridge = before.copy()
    x_points, y_points = zip(*NORTH_EDGE)
    cutoffs = np.ceil(np.interp(np.arange(BRIDGE_START, BRIDGE_END + 1), x_points, y_points)).astype(int)
    for x, north_y in zip(range(BRIDGE_START, BRIDGE_END + 1), cutoffs):
        bridge[:north_y, x] = False

    removed = before & ~bridge
    if np.any(bridge & ~before) or np.any(removed[:, :BRIDGE_START]) or np.any(removed[:, BRIDGE_END + 1:]):
        raise ValueError("Bridge correction added floor or escaped the approved interval")
    for x in range(BRIDGE_START, BRIDGE_END + 1):
        old_rows = np.flatnonzero(before[:, x])
        new_rows = np.flatnonzero(bridge[:, x])
        if not len(new_rows) or new_rows[-1] != old_rows[-1]:
            raise ValueError(f"South edge or shore connection changed at x={x}")
    if bridge[365, 950] or bridge[365, 1000] or not bridge[380, 950]:
        raise ValueError("Bridge representative points failed")

    data = {
        "version": 2,
        "coordinateSpace": original["coordinateSpace"],
        "sourceWidth": 1638,
        "sourceHeight": 960,
        "redlineSha256": original["redlineSha256"],
        "sourceMaskSha256": sha256(BASE.read_bytes()).hexdigest(),
        "bridgeSourceX": [BRIDGE_START, BRIDGE_END],
        "bridgeNorthEdgeControlPoints": NORTH_EDGE,
        "removedBridgePixels": int(removed.sum()),
        "staticRows": original["staticRows"],
        "bridgeRows": [spans_for_row(row) for row in bridge],
    }
    OUTPUT.write_text(json.dumps(data, separators=(",", ":")) + "\n")

    background = Image.open(BACKGROUND).convert("RGBA")
    background.alpha_composite(Image.open(BRIDGE_ART).convert("RGBA"))
    pixels = np.zeros((960, 1638, 4), dtype=np.uint8)
    pixels[bridge] = (42, 232, 158, 64)
    pixels[removed] = (255, 55, 75, 168)
    review = Image.alpha_composite(background, Image.fromarray(pixels, "RGBA")).convert("RGB")
    REVIEW.parent.mkdir(parents=True, exist_ok=True)
    review.save(REVIEW)
    review.crop((770, 340, 1200, 470)).resize((1290, 390), Image.Resampling.NEAREST).save(REVIEW_ZOOM)
    print(f"bridge before={int(before.sum())} after={int(bridge.sum())} removed={int(removed.sum())}")
    print(f"static={sum(right-left for row in original['staticRows'] for left,right in row)} unchanged")
    print(f"output={OUTPUT} review={REVIEW}")


if __name__ == "__main__":
    main()
