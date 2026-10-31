"""Resize the existing approved HUD portrait for Home Screen icons; no redraw."""
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
source = Image.open(ROOT / 'assets/ui/portraits/kyle/kyle-hud-portrait-64px-v1.png').convert('RGBA')
side = max(source.size)
icon = Image.new('RGBA', (side, side), '#081413')
icon.alpha_composite(source, ((side-source.width)//2, (side-source.height)//2))
output = ROOT / 'public/icons'
output.mkdir(parents=True, exist_ok=True)
for size in [180, 192, 512]:
    icon.resize((size, size), Image.Resampling.NEAREST).save(output / f'eloria-{size}.png')
