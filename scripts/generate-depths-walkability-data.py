#!/usr/bin/env python3
"""Encode the approved, native-resolution Layer 3 floor mask as deterministic RLE."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/references/spirit-cloth-stonescale-depths-walkability-mask-v1.png'
OUTPUT = ROOT / 'assets/environments/spirit-cloth-stonescale-depths/spirit-cloth-stonescale-depths-walkability-v1.rle.json'


def build() -> str:
    image = Image.open(SOURCE).convert('L')
    if image.size != (1638, 960):
        raise ValueError(f'Unexpected mask size: {image.size}')
    data = image.tobytes()
    if set(data) != {0, 255}:
        raise ValueError('The approved mask must be binary')
    rows = []
    count = 0
    for y in range(image.height):
        row = []
        start = None
        for x in range(image.width + 1):
            on = x < image.width and data[y * image.width + x] == 255
            if on and start is None:
                start = x
            elif not on and start is not None:
                row.append([start, x])
                count += x - start
                start = None
        rows.append(row)
    if count != 231601:
        raise ValueError(f'Unexpected approved floor area: {count}')
    result = {
        'version': 1,
        'coordinateSpace': 'spirit-cloth-stonescale-depths-full-map-concept-v2 native pixels',
        'sourceWidth': image.width,
        'sourceHeight': image.height,
        'sourceMaskSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'walkablePixelCount': count,
        'rows': rows,
    }
    return json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n'


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    content = build()
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != content:
            raise SystemExit('Layer 3 walkability RLE is out of date')
        print('Layer 3 walkability RLE OK: 1638x960, 231601 floor pixels')
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(content)
        print(f'Wrote {OUTPUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
