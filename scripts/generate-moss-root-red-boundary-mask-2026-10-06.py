#!/usr/bin/env python3
"""Rasterize the October 6 user outline and preserve only the approved north exit."""

from collections import deque
from pathlib import Path
import argparse
import hashlib
import json

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / "assets/environments/moss-root-ruins"
BACKGROUND = ENV / "moss-root-ruins-background-v2.png"
ANNOTATED = ROOT / "docs/references/moss-root-walk-boundary-red-v3.png"
OLD_MASK = ENV / "moss-root-ruins-walkability-red-v1.png"
NORTH_EXIT = ENV / "moss-root-ruins-north-exit-v2.json"
MASK = ENV / "moss-root-ruins-walkability-red-v3.png"
QA = ROOT / "docs/screenshots"
SIZE = (1295, 1214)


def make_mask() -> tuple[Image.Image, Image.Image, Image.Image]:
    background = Image.open(BACKGROUND).convert("RGB")
    annotated = Image.open(ANNOTATED).convert("RGB")
    if background.size != SIZE or annotated.size != SIZE:
        raise ValueError("Background and October 6 redline must both be native 1295x1214 images")

    width, height = SIZE
    red_line = bytearray(width * height)
    changed = bytearray(width * height)
    painted_bytes = annotated.tobytes()
    original_bytes = background.tobytes()
    for index in range(width * height):
        offset = index * 3
        difference = [painted_bytes[offset + channel] - original_bytes[offset + channel] for channel in range(3)]
        if any(difference):
            changed[index] = 255
        if difference[0] > 8 and difference[0] - difference[1] > 8 and difference[0] - difference[2] > 8:
            red_line[index] = 255

    # Every changed pixel must be part of the traced stroke or its antialiasing.
    red_nearby = Image.frombytes("L", SIZE, bytes(red_line)).filter(ImageFilter.MaxFilter(7)).tobytes()
    if any(painted and not nearby for painted, nearby in zip(changed, red_nearby)):
        raise ValueError("Annotated image differs from the background away from the red stroke")

    # One native pixel closes antialiasing holes, as in the earlier approved
    # extraction. The two south banks end one row above the image edge; extend
    # those exact endpoints to the edge so flood fill cannot escape below them.
    boundary = Image.frombytes("L", SIZE, bytes(red_line)).filter(ImageFilter.MaxFilter(3))
    pen = ImageDraw.Draw(boundary)
    pen.line([(598, 1211), (598, 1213)], fill=255, width=3)
    pen.line([(694, 1211), (694, 1213)], fill=255, width=3)
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
        if x:
            enqueue(index - 1)
        if x < width - 1:
            enqueue(index + 1)
        if index >= width:
            enqueue(index - width)
        if index < width * (height - 1):
            enqueue(index + width)

    if not 215_000 < sum(inside) < 230_000:
        raise ValueError("October 6 outline is open or the flood fill selected the wrong region")

    north = json.loads(NORTH_EXIT.read_text())
    if (north["sourceWidth"], north["firstRow"], north["lastRowInclusive"]) != (width, 0, 60):
        raise ValueError("Historical north-exit rows must be limited to y=0..60")
    if len(north["rows"]) != 61 or hashlib.sha256(OLD_MASK.read_bytes()).hexdigest() != north["sourceMaskSha256"]:
        raise ValueError("Historical north-exit fixture does not match the approved old mask")
    exception = bytearray(width * height)
    for y, spans in enumerate(north["rows"]):
        if y > 60:
            raise ValueError("North-exit exception extends below its approved local range")
        for start, end in spans:
            if not 600 <= start < end <= 700:
                raise ValueError(f"North-exit exception widened unexpectedly at y={y}")
            for x in range(start, end):
                index = y * width + x
                if not inside[index]:
                    inside[index] = 1
                    exception[index] = 255

    # The carried old corridor meets the newly traced floor at the north plaza.
    if not inside[20 * width + 648] or not inside[60 * width + 648]:
        raise ValueError("North exit is not connected to the new plaza")
    mask = Image.frombytes("L", SIZE, bytes(255 if value else 0 for value in inside))
    return mask, Image.frombytes("L", SIZE, bytes(exception)), annotated


def write_qa(mask: Image.Image, exception: Image.Image, annotated: Image.Image) -> None:
    QA.mkdir(parents=True, exist_ok=True)
    clear = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    green = Image.new("RGBA", SIZE, (20, 225, 115, 105))
    yellow = Image.new("RGBA", SIZE, (255, 205, 48, 210))
    overlay = Image.alpha_composite(annotated.convert("RGBA"), Image.composite(green, clear, mask))
    overlay = Image.alpha_composite(overlay, Image.composite(yellow, clear, exception))
    overlay.save(QA / "layer1-redline-v3-mask-overlay-full-native.png")
    overlay.crop((570, 0, 725, 135)).resize((930, 810), Image.Resampling.NEAREST).save(
        QA / "layer1-redline-v3-north-exit-zoom.png")

    old = Image.open(OLD_MASK).convert("L")
    if old.size != SIZE:
        raise ValueError("Previous mask must share native coordinates")
    before, after = old.tobytes(), mask.tobytes()
    added = bytes(255 if a == 0 and b == 255 else 0 for a, b in zip(before, after))
    removed = bytes(255 if a == 255 and b == 0 else 0 for a, b in zip(before, after))
    addition = Image.frombytes("L", SIZE, added)
    removal = Image.frombytes("L", SIZE, removed)
    diff = Image.open(BACKGROUND).convert("RGBA")
    diff = Image.alpha_composite(diff, Image.composite(Image.new("RGBA", SIZE, (45, 145, 255, 200)), clear, addition))
    diff = Image.alpha_composite(diff, Image.composite(Image.new("RGBA", SIZE, (255, 65, 80, 215)), clear, removal))
    diff = Image.alpha_composite(diff, Image.composite(yellow, clear, exception))
    diff.save(QA / "layer1-redline-v3-mask-diff-full-native.png")
    print(f"old {before.count(255)}, new {after.count(255)}, added {added.count(255)}, removed {removed.count(255)}, north exception {exception.tobytes().count(255)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    generated, exception, annotated = make_mask()
    if args.check:
        if not MASK.exists() or Image.open(MASK).convert("L").tobytes() != generated.tobytes():
            raise SystemExit("October 6 redline mask is stale; regenerate it")
    else:
        generated.save(MASK)
        write_qa(generated, exception, annotated)
    print(f"October 6 redline mask OK: {generated.width}x{generated.height}, {generated.tobytes().count(255)} walkable pixels")
