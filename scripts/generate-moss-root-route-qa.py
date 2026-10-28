#!/usr/bin/env python3
"""Builds visual QA from the effective collision rows and computed BFS route."""
from pathlib import Path
import json
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BG_PATH = ROOT / "assets/environments/moss-root-ruins/moss-root-ruins-background-v2.png"
MASK_PATH = ROOT / "assets/environments/moss-root-ruins/moss-root-ruins-walkability-v2.rle.json"
ROUTE_PATH = ROOT / "assets/environments/moss-root-ruins/moss-root-ruins-required-route-v3.json"
OUT_DIR = ROOT / "docs/screenshots"

background = Image.open(BG_PATH).convert("RGBA")
mask_data = json.loads(MASK_PATH.read_text())
mask = Image.new("L", (mask_data["sourceWidth"], mask_data["sourceHeight"]), 0)
mask_draw = ImageDraw.Draw(mask)
for row_y, spans in enumerate(mask_data["rows"]):
    for start_x, end_x in spans:
        mask_draw.line((start_x, row_y, end_x - 1, row_y), fill=255)
route = json.loads(ROUTE_PATH.read_text())
radius = int(route["footprintRadiusPixels"])
points = [tuple(point) for point in route["points"]]
if not points:
    raise SystemExit("computed route has no points")
for x, y in points:
    for offset_y in range(-radius, radius + 1):
        for offset_x in range(-radius, radius + 1):
            if offset_x * offset_x + offset_y * offset_y > radius * radius:
                continue
            sample_x = x + offset_x
            sample_y = y + offset_y
            if not (0 <= sample_x < mask.width and 0 <= sample_y < mask.height):
                raise SystemExit(f"route footprint left mask bounds at {x},{y}")
            if mask.getpixel((sample_x, sample_y)) != 255:
                raise SystemExit(f"route footprint touched blocked raster at {x},{y}")

red = Image.new("RGBA", background.size, (130, 10, 25, 74))
green = Image.new("RGBA", background.size, (20, 230, 125, 112))
transparent = Image.new("RGBA", background.size, (0, 0, 0, 0))
red.alpha_composite(Image.composite(green, transparent, mask))
overlay = Image.alpha_composite(background, red)
draw = ImageDraw.Draw(overlay, "RGBA")
draw.line(points, fill=(255, 224, 86, 245), width=5, joint="curve")
waypoint_colors = {
    "start": (105, 244, 222, 255), "battle1": (255, 116, 80, 255),
    "battle2": (255, 116, 80, 255), "crystal": (92, 236, 231, 255),
    "rootApproach": (255, 173, 72, 255), "rootBeyond": (255, 196, 95, 255),
    "final": (255, 92, 100, 255), "exit": (188, 255, 214, 255),
}
for name, point in route["waypoints"].items():
    x, y = point
    color = waypoint_colors.get(name, (255, 255, 255, 255))
    draw.ellipse((x - 7, y - 7, x + 7, y + 7), fill=color, outline=(255, 255, 255, 255), width=2)
    draw.rectangle((x + 9, y - 8, x + 15 + len(name) * 7, y + 7), fill=(4, 12, 12, 210))
    draw.text((x + 12, y - 7), name.upper(), fill=(255, 255, 240, 255))

OUT_DIR.mkdir(parents=True, exist_ok=True)
overlay.save(OUT_DIR / "layer1-redline-v3-required-route-overlay-full-native.png")
# High-resolution audit panels cover the whole native background without resampling.
panel_width = math.ceil(background.width / 3)
panel_height = math.ceil(background.height / 3)
for row in range(3):
    for column in range(3):
        left = column * panel_width
        top = row * panel_height
        crop = overlay.crop((left, top, min(background.width, left + panel_width), min(background.height, top + panel_height)))
        crop.save(OUT_DIR / f"layer1-redline-v3-mask-audit-r{row + 1}-c{column + 1}.png")
print(f"QA route OK: {len(points)} computed points, radius {radius}px; wrote full overlay and 9 native audit panels")
