#!/usr/bin/env python3
"""Extract the approved Velgran arena redline into a native-pixel floor mask."""
import argparse
import hashlib
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
BACKGROUND = ROOT / "assets/concepts/environments/crystal-dungeon-01/velgran-boss-arena-production-layout-concept-v1.png"
REDLINE = ROOT / "docs/references/velgran-boss-arena-walk-boundary-red-v1.png"
MASK = ROOT / "docs/references/velgran-boss-arena-walkability-mask-v1.png"
DATA = ROOT / "assets/environments/bosses/velgran/velgran-boss-arena-walkability-v1.rle.json"
OVERLAY = ROOT / "docs/screenshots/velgran-boss-arena-runtime-mask-overlay-v1.png"
SIZE = (1496, 1051)
BOTTOM_COMPLETION = ((618, 1045), (618, 1050))


def png_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def build() -> tuple[bytes, bytes, bytes, int]:
    background = Image.open(BACKGROUND).convert("RGB")
    redline = Image.open(REDLINE).convert("RGB")
    if background.size != SIZE or redline.size != SIZE:
        raise ValueError("The background and authored redline must both be 1496x1051")
    original = np.asarray(background).astype(np.int16)
    marked = np.asarray(redline).astype(np.int16)
    difference = marked - original
    red_pixels = (
        (difference[:, :, 0] > 15)
        & (marked[:, :, 0] > marked[:, :, 1] * 1.5)
        & (marked[:, :, 0] > marked[:, :, 2] * 1.5)
    )
    boundary = Image.fromarray(np.uint8(red_pixels) * 255, "L")
    # The only authored-gap completion approved by the user. The 3x3 filter
    # closes anti-aliased one-pixel breaks without redrawing the boundary.
    ImageDraw.Draw(boundary).line(BOTTOM_COMPLETION, fill=255, width=1)
    boundary = boundary.filter(ImageFilter.MaxFilter(3))
    outside = boundary.copy()
    ImageDraw.floodfill(outside, (0, 0), 128, thresh=0)
    floor = Image.fromarray(np.uint8(np.asarray(outside) == 0) * 255, "L")
    pixels = np.asarray(floor)
    count = int(np.count_nonzero(pixels))
    if not 430000 <= count <= 440000 or not pixels[1049, 748] or pixels[500, 100]:
        raise ValueError(f"Unexpected redline interior: {count} pixels")

    rows = []
    for y in range(SIZE[1]):
        row = pixels[y] > 0
        edges = np.diff(np.concatenate(([False], row, [False])).astype(np.int8))
        starts = np.flatnonzero(edges == 1)
        ends = np.flatnonzero(edges == -1)
        rows.append([[int(start), int(end)] for start, end in zip(starts, ends)])
    encoded = {
        "version": 1,
        "coordinateSpace": "velgran-boss-arena-production-layout-concept-v1 native pixels",
        "sourceWidth": SIZE[0],
        "sourceHeight": SIZE[1],
        "sourceBackgroundSha256": hashlib.sha256(BACKGROUND.read_bytes()).hexdigest(),
        "sourceRedlineSha256": hashlib.sha256(REDLINE.read_bytes()).hexdigest(),
        "bottomCompletion": BOTTOM_COMPLETION,
        "walkablePixelCount": count,
        "rows": rows,
    }
    tint = Image.new("RGB", SIZE, (30, 204, 153))
    overlay = Image.composite(Image.blend(background, tint, 0.28), redline, floor)
    ImageDraw.Draw(overlay).line(BOTTOM_COMPLETION, fill=(58, 210, 255), width=2)
    return png_bytes(floor), (json.dumps(encoded, ensure_ascii=False, separators=(",", ":")) + "\n").encode(), png_bytes(overlay), count


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    products = (MASK, DATA, OVERLAY)
    *contents, count = build()
    if args.check:
        if any(not path.exists() or path.read_bytes() != content for path, content in zip(products, contents)):
            raise SystemExit("Crystal altar redline outputs are out of date")
        print(f"Crystal altar walkability OK: {SIZE[0]}x{SIZE[1]}, {count} floor pixels")
    else:
        for path, content in zip(products, contents):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
            print(f"Wrote {path.relative_to(ROOT)}")
        print(f"Walkable pixels: {count}")


if __name__ == "__main__":
    main()
