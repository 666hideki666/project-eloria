"""Pack approved downed concepts; crop/nearest resize only, no repaint or alpha editing."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
records = []
for name, version, width in [('kyle', 2, 44), ('nadi', 1, 42), ('mel', 1, 42)]:
    source = ROOT / f'assets/concepts/characters/downed/{name}-downed-concept-v{version}.png'
    image = Image.open(source).convert('RGBA')
    # Ignore only the alpha=1 near-invisible canvas noise when locating the subject.
    # The crop itself preserves every source color and alpha; no mask is applied.
    bounds = image.getchannel('A').point(lambda a: 255 if a >= 2 else 0).getbbox()
    assert bounds
    crop = (max(0, bounds[0]-4), max(0, bounds[1]-4), min(image.width, bounds[2]+4), min(image.height, bounds[3]+4))
    subject = image.crop(crop)
    height = round(subject.height * width / subject.width)
    subject = subject.resize((width, height), Image.Resampling.NEAREST)
    frame = Image.new('RGBA', (48, 48))
    offset = ((48-width)//2, 36-height)
    frame.paste(subject, offset)  # Copy RGBA, do not multiply the authored alpha.
    output = ROOT / f'assets/sprites/characters/{name}/{name}-downed-48px-v1.png'
    frame.save(output)
    records.append(dict(character=name, source=str(source.relative_to(ROOT)), sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(), crop=crop, resize=[width,height], paste=list(offset), output=str(output.relative_to(ROOT)), frame=[48,48], anchor=[24,32], drawScale=0.75, resample='NEAREST', alpha='source unchanged'))
(ROOT / 'assets/sprites/characters/downed-preparation-v1.json').write_text(json.dumps(records, indent=2)+'\n')
print(json.dumps(records, indent=2))
