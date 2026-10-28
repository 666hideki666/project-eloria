#!/usr/bin/env python3
"""Extract the Ancient Forest floor from the user's aligned red annotation."""

import argparse
from collections import deque
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
BACKGROUND = ROOT / "assets/concepts/environments/star-circling-forest-intro-map-redline-base-v1.png"
ANNOTATED = ROOT / "docs/references/star-circling-forest-intro-walk-boundary-red-v1.png"
MASK = ROOT / "assets/environments/ancient-forest/ancient-forest-walkability-red-v1.png"
DATA = ROOT / "assets/environments/ancient-forest/ancient-forest-walkability-v1.rle.json"
OVERLAY = ROOT / "docs/screenshots/ancient-forest-walkability-overlay-v1.png"
WIDTH, HEIGHT = 1536, 1024
BACKGROUND_SHA256 = "798449ea85e769878b40891a3d3bc48964f8fbd45d62cd98e1e65725016697c6"
ANNOTATED_SHA256 = "8e09c307dda2a3addde857a532c651b3174cb4c27ba85214829080968ae96187"
SEED = (780, 850)
WALKABLE = {
    "spawn": (780, 900),
    "village-road": (780, 1018),
    "central-plaza": (780, 550),
    "left-ruin": (290, 405),
    "upper-left-dead-end": (310, 180),
    "right-turnback": (1320, 420),
    "cave": (825, 90),
}
BLOCKED = {
    "outer-forest": (50, 50),
    "left-island": (650, 430),
    "central-root-island": (925, 520),
    "right-forest": (1410, 560),
    "outside-village-road": (620, 1018),
    "outside-cave": (880, 90),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def extract() -> tuple[Image.Image, dict, Image.Image]:
    if sha256(BACKGROUND) != BACKGROUND_SHA256 or sha256(ANNOTATED) != ANNOTATED_SHA256:
        raise ValueError("The approved forest backdrop or user redline has changed")
    background = Image.open(BACKGROUND).convert("RGB")
    annotated = Image.open(ANNOTATED).convert("RGB")
    if background.size != (WIDTH, HEIGHT) or annotated.size != (WIDTH, HEIGHT):
        raise ValueError("Forest backdrop and annotation must both be native 1536x1024")

    # These images match pixel-for-pixel outside the painted annotation.
    # Include the faint antialiased fringe of the red stroke so tiny raster
    # sampling gaps do not connect the intended floor to the outer forest.
    differences = ImageChops.difference(annotated, background)
    diff_bytes = differences.tobytes()
    changed = bytes(255 if diff_bytes[index] or diff_bytes[index + 1] or diff_bytes[index + 2] else 0
                    for index in range(0, len(diff_bytes), 3))
    if not 28_000 <= changed.count(255) <= 31_000:
        raise ValueError("Unexpected red-annotation pixel count")
    boundary = Image.frombytes("L", (WIDTH, HEIGHT), changed).filter(ImageFilter.MaxFilter(3))
    pen = ImageDraw.Draw(boundary)
    # Only the two traced banks end just shy of the bottom image edge.
    pen.line([(667, 1014), (667, 1023)], fill=255, width=3)
    pen.line([(899, 1020), (899, 1023)], fill=255, width=3)
    barrier = boundary.tobytes()

    inside = bytearray(WIDTH * HEIGHT)
    start = SEED[1] * WIDTH + SEED[0]
    if barrier[start]:
        raise ValueError("Forest seed lies on the red boundary")
    queue: deque[int] = deque([start])
    inside[start] = 1
    while queue:
        index = queue.popleft()
        x = index % WIDTH
        neighbors = (
            (index - 1, x > 0),
            (index + 1, x < WIDTH - 1),
            (index - WIDTH, index >= WIDTH),
            (index + WIDTH, index < WIDTH * (HEIGHT - 1)),
        )
        for neighbor, valid in neighbors:
            if valid and not barrier[neighbor] and not inside[neighbor]:
                inside[neighbor] = 1
                queue.append(neighbor)
    floor_count = sum(inside)
    if not 375_000 <= floor_count <= 381_000:
        raise ValueError(f"Forest flood fill escaped or lost a branch: {floor_count}")
    for name, (x, y) in WALKABLE.items():
        if not inside[y * WIDTH + x]:
            raise ValueError(f"Required red-interior point is blocked: {name} {x},{y}")
    for name, (x, y) in BLOCKED.items():
        if inside[y * WIDTH + x]:
            raise ValueError(f"Red-exterior or enclosed island is walkable: {name} {x},{y}")

    mask = Image.frombytes("L", (WIDTH, HEIGHT), bytes(255 * value for value in inside))
    rows: list[list[list[int]]] = []
    for y in range(HEIGHT):
        spans: list[list[int]] = []
        start_x = -1
        for x in range(WIDTH):
            walkable = bool(inside[y * WIDTH + x])
            if walkable and start_x < 0:
                start_x = x
            elif not walkable and start_x >= 0:
                spans.append([start_x, x])
                start_x = -1
        if start_x >= 0:
            spans.append([start_x, WIDTH])
        rows.append(spans)
    data = {
        "version": 1,
        "coordinateSpace": "ancient-forest-user-redline-native-raster",
        "sourceWidth": WIDTH,
        "sourceHeight": HEIGHT,
        "backgroundSha256": BACKGROUND_SHA256,
        "redlineSha256": ANNOTATED_SHA256,
        "walkablePixels": floor_count,
        "rows": rows,
    }
    tint = Image.new("RGBA", (WIDTH, HEIGHT), (20, 235, 110, 110))
    clear = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    overlay = Image.alpha_composite(annotated.convert("RGBA"), Image.composite(tint, clear, mask))
    return mask, data, overlay


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    mask, data, overlay = extract()
    if args.check:
        if not MASK.exists() or Image.open(MASK).convert("L").tobytes() != mask.tobytes():
            raise SystemExit("Forest walkability mask is stale")
        if not DATA.exists() or json.loads(DATA.read_text()) != data:
            raise SystemExit("Forest walkability spans are stale")
    else:
        MASK.parent.mkdir(parents=True, exist_ok=True)
        OVERLAY.parent.mkdir(parents=True, exist_ok=True)
        mask.save(MASK)
        DATA.write_text(json.dumps(data, separators=(",", ":")) + "\n")
        overlay.save(OVERLAY)
    print(f"ancient forest redline OK: {WIDTH}x{HEIGHT}, {data['walkablePixels']} walkable pixels")


if __name__ == "__main__":
    main()
