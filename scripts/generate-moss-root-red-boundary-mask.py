#!/usr/bin/env python3
"""Rasterize the user's red walk boundary, not the scenery beneath it.

The two source images have identical native 1295x1214 pixels. Their red-only
difference is a pair of traced banks around one continuous playable region.
The north/south passages are deliberately open to the image edge. Select only
the connected interior containing the starting plaza: red-enclosed outside
pockets between looping paths must remain blocked.
"""

from collections import deque
from pathlib import Path
import argparse

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
BACKGROUND = ROOT / "assets/environments/moss-root-ruins/moss-root-ruins-background-v2.png"
ANNOTATED = ROOT / "docs/references/moss-root-walk-boundary-red-v1.png"
BLUE_SOURCE = Path("/Users/katouhideki/Desktop/Codex 画像 2026年9月24日 08_22_36.png")
BLUE_ANNOTATED = ROOT / "docs/references/moss-root-walk-boundary-blue-bridge-v1.png"
CORRECTED_ANNOTATED = ROOT / "docs/references/moss-root-walk-boundary-red-v2.png"
MASK = ROOT / "assets/environments/moss-root-ruins/moss-root-ruins-walkability-red-v1.png"
QA = ROOT / "docs/screenshots"
BRIDGE_X = range(994, 1042)
BRIDGE_BLUE_BOX = (994, 548, 1043, 561)


def extract_mask() -> tuple[Image.Image, Image.Image, Image.Image, int]:
    background = Image.open(BACKGROUND).convert("RGB")
    annotated = Image.open(ANNOTATED).convert("RGB")
    if background.size != annotated.size or background.size != (1295, 1214):
        raise ValueError("Red annotation and backdrop must both be native 1295x1214 images")

    width, height = background.size
    red_line = bytearray(width * height)
    for index, (painted, original) in enumerate(zip(annotated.getdata(), background.getdata())):
        difference = [painted[channel] - original[channel] for channel in range(3)]
        if difference[0] > 8 and difference[0] - difference[1] > 8 and difference[0] - difference[2] > 8:
            red_line[index] = 255

    # The annotated stroke is antialiased. One native pixel of dilation closes
    # sampling gaps without replacing its hand-drawn curvature with geometry.
    boundary = Image.frombytes("L", (width, height), bytes(red_line)).filter(ImageFilter.MaxFilter(3))
    pen = ImageDraw.Draw(boundary)
    pen.line([(626, 41), (626, 0)], fill=255, width=3)
    pen.line([(668, 42), (668, 0)], fill=255, width=3)
    pen.line([(600, 1212), (600, 1213)], fill=255, width=3)
    pen.line([(689, 1212), (689, 1213)], fill=255, width=3)
    barrier = boundary.tobytes()

    inside = bytearray(width * height)
    queue: deque[int] = deque()

    def enqueue(index: int) -> None:
        if not barrier[index] and not inside[index]:
            inside[index] = 1
            queue.append(index)

    enqueue(1160 * width + 648)

    while queue:
        index = queue.popleft()
        x = index % width
        if x: enqueue(index - 1)
        if x < width - 1: enqueue(index + 1)
        if index >= width: enqueue(index - width)
        if index < width * (height - 1): enqueue(index + width)

    pixels = bytes(255 if inside[index] else 0
                   for index in range(width * height))
    mask = Image.frombytes("L", (width, height), pixels)
    if not 170_000 < pixels.count(255) < 450_000:
        raise ValueError("Flood fill escaped through a red-line gap or enclosed the wrong area")
    if not BLUE_ANNOTATED.exists():
        raise ValueError(f"Import the user's blue bridge reference first: {BLUE_ANNOTATED}")
    blue = Image.open(BLUE_ANNOTATED).convert("RGB")
    if blue.size != background.size:
        raise ValueError("Blue bridge annotation must have the same native dimensions")
    # Only the short southern edge of the east crystal bridge changes. Derive
    # each column's new boundary from the user's blue trace; never dilate the
    # whole walkable area or reinterpret scenery elsewhere.
    blue_by_x: dict[int, list[int]] = {}
    left, top, right, bottom = BRIDGE_BLUE_BOX
    for x in range(left, right):
        for y in range(top, bottom):
            painted = blue.getpixel((x, y))
            prior = annotated.getpixel((x, y))
            if painted[2] - prior[2] > 8 and painted[2] - painted[0] > 10:
                blue_by_x.setdefault(x, []).append(y)
    blue_count = sum(map(len, blue_by_x.values()))
    if not 105 <= blue_count <= 130 or min(blue_by_x) != 994 or max(blue_by_x) < 1040:
        raise ValueError(f"Unexpected local blue bridge trace: {blue_count} pixels")
    original_mask = mask.copy()
    corrected = annotated.copy()
    red_pen = ImageDraw.Draw(corrected)
    known_columns = sorted(blue_by_x)
    blue_edge: dict[int, int] = {}
    for x in BRIDGE_X:
        if x in blue_by_x:
            edge_y = min(blue_by_x[x])
        else:
            before = max((column for column in known_columns if column < x), default=None)
            after = min((column for column in known_columns if column > x), default=None)
            if before is None or after is None:
                raise ValueError(f"Blue trace has an unconnected endpoint at x={x}")
            portion = (x - before) / (after - before)
            edge_y = round(min(blue_by_x[before]) * (1 - portion) + min(blue_by_x[after]) * portion)
        blue_edge[x] = edge_y
        old_floor = [y for y in range(532, 551) if original_mask.getpixel((x, y)) == 255]
        if not old_floor:
            raise ValueError(f"No existing bridge floor in column x={x}")
        old_end = max(old_floor)
        if edge_y < old_end or edge_y > 560:
            raise ValueError(f"Blue edge does not widen the bridge at x={x}: {edge_y}")
        for y in range(old_end + 1, edge_y):
            mask.putpixel((x, y), 255)
        # The old southern red stroke is no longer the boundary. Remove only
        # that short stroke from the updated visual reference.
        for y in range(old_end + 1, min(edge_y + 3, 564)):
            painted = corrected.getpixel((x, y))
            original = background.getpixel((x, y))
            if painted[0] - original[0] > 8 and painted[0] - painted[1] > 8:
                corrected.putpixel((x, y), original)
    red_pen.line([(995, 563), (994, blue_edge[994])], fill=(206, 70, 48), width=1)
    red_pen.line([(x, blue_edge[x]) for x in BRIDGE_X], fill=(206, 70, 48), width=1)
    red_pen.line([(1041, blue_edge[1041]), (1043, 551)], fill=(206, 70, 48), width=1)
    before = original_mask.tobytes()
    after = mask.tobytes()
    changes = [(index % width, index // width) for index, (a, b) in enumerate(zip(before, after)) if a != b]
    added = len(changes)
    if added != 306 or any(before[y * width + x] != 0 or after[y * width + x] != 255 or not (994 <= x <= 1041 and 541 <= y <= 559) for x, y in changes):
        raise ValueError(f"Bridge-only mask change unexpectedly added {added} pixels")
    return mask, original_mask, corrected, added


def write_qa(mask: Image.Image, original_mask: Image.Image, corrected: Image.Image) -> None:
    QA.mkdir(parents=True, exist_ok=True)
    annotated = corrected.convert("RGBA")
    tint = Image.new("RGBA", mask.size, (24, 235, 120, 112))
    clear = Image.new("RGBA", mask.size, (0, 0, 0, 0))
    overlay = Image.alpha_composite(annotated, Image.composite(tint, clear, mask))
    overlay.save(QA / "layer1-red-boundary-mask-overlay.png")
    corrected.save(CORRECTED_ANNOTATED)
    bridge_overlay = Image.alpha_composite(
        Image.open(BACKGROUND).convert("RGBA"), Image.composite(tint, clear, mask)
    )
    bridge_overlay.save(QA / "layer1-blue-bridge-walkability-overlay.png")
    bridge_crop = bridge_overlay.crop((955, 520, 1085, 580))
    bridge_crop.resize((1040, 480), Image.Resampling.NEAREST).save(
        QA / "layer1-blue-bridge-walkability-zoom.png"
    )
    difference = Image.frombytes(
        "L", mask.size,
        bytes(255 if before == 0 and after == 255 else 0
              for before, after in zip(original_mask.tobytes(), mask.tobytes())),
    )
    difference_tint = Image.new("RGBA", mask.size, (40, 130, 255, 220))
    difference_overlay = Image.alpha_composite(
        Image.open(BACKGROUND).convert("RGBA"),
        Image.composite(difference_tint, clear, difference),
    )
    difference_overlay.save(QA / "layer1-blue-bridge-mask-diff.png")
    difference_crop = difference_overlay.crop((955, 520, 1085, 580))
    difference_crop.resize((1040, 480), Image.Resampling.NEAREST).save(
        QA / "layer1-blue-bridge-mask-diff-zoom.png"
    )
    for name, box in {
        "east-waterfall": (700, 225, 1215, 605),
        "middle-plazas": (125, 310, 1100, 760),
        "start-plaza": (425, 790, 860, 1214),
    }.items():
        crop = overlay.crop(box)
        crop.resize((crop.width * 2, crop.height * 2), Image.Resampling.NEAREST).save(
            QA / f"layer1-red-boundary-{name}-zoom.png"
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--import-blue", action="store_true")
    args = parser.parse_args()
    if args.import_blue:
        if not BLUE_SOURCE.exists():
            raise SystemExit(f"Blue reference not found: {BLUE_SOURCE}")
        Image.open(BLUE_SOURCE).save(BLUE_ANNOTATED)
    generated, original_mask, corrected, added = extract_mask()
    if args.check:
        if not MASK.exists() or Image.open(MASK).convert("L").tobytes() != generated.tobytes():
            raise SystemExit("Red-boundary walkability mask is stale; regenerate it")
        if not CORRECTED_ANNOTATED.exists() or Image.open(CORRECTED_ANNOTATED).convert("RGB").tobytes() != corrected.tobytes():
            raise SystemExit("Updated bridge reference is stale; regenerate it")
    else:
        generated.save(MASK)
        write_qa(generated, original_mask, corrected)
    print(f"red boundary mask OK: {generated.width}x{generated.height}, {generated.tobytes().count(255)} walkable pixels, {added} bridge pixels added")
