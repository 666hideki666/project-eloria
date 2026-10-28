# Return Starstone Crystal Idle Sheet v1

## Purpose

転送先の星石遺跡に常設する、中央遺跡への帰還用クリスタルの待機アニメーション。探索中は静かに発光し、起動演出や転送演出よりも控えめなランドマークとして使用する。

## Generation mode

- Built-in ImageGen
- Reference-based generation
- Chroma-key background removal with the installed ImageGen helper
- No external API key or additional API billing

## Reference images

- `assets/effects/portals/next-starstone-ruins-crystal-awakening-sheet-v1-chroma.png`
  - 台座、星形結晶、ピクセル密度、視点、配色の基準
- `assets/effects/portals/party-starstone-dungeon-arrival-materialization-overlay-sheet-v1-chroma.png`
  - 転送光、青・金の微粒子表現の補助基準

## Final generation prompt

```text
Use case: stylized-concept
Asset type: production-ready retro fantasy action-RPG environmental landmark sprite sheet
Primary request: Create a six-frame idle animation sprite sheet for the return crystal located inside the destination Starstone Ruins. This is a permanent two-way travel landmark that returns the party to the central forest ruins.
Input images: Image 1 is the exact visual reference for the ancient circular stone platform, floating cyan four-point star crystal, mossy stonework, cyan rune channels, palette, pixel density, perspective, and rendering style. Image 2 is a supporting reference for the destination teleport light language and small blue/gold motes.
Scene/backdrop: perfectly flat, uniform solid #eb05e4 chroma-key background for clean removal; no floor plane, no environment, no shadows outside the asset.
Subject: one compact ancient circular moss-covered stone dais with cyan rune grooves and a floating cyan four-point star crystal. The same full landmark appears once in each of six cells.
Style/medium: polished 16-bit-era Japanese fantasy RPG pixel art, crisp hard pixel clusters, limited 1990s console palette, matching the reference exactly. Not modern vector art, not painterly.
Composition/framing: exact 3 columns by 2 rows, six equal cells, left-to-right then top-to-bottom. All six sprites centered consistently, same scale and base position. Generous empty chroma space around every sprite. No cell borders, no grid lines, no labels.
Animation sequence: a calm seamless idle loop. Frame 1 dim steady crystal and faint rune channels; frame 2 crystal core brightens slightly and one tiny mote rises; frame 3 a thin cyan halo begins circling the crystal; frame 4 halo reaches its brightest but remains restrained, two or three tiny blue/gold motes visible; frame 5 halo fades and rune channels pulse outward once; frame 6 returns nearly to frame 1 with one final small sparkle. The stone platform and crystal geometry must remain identical in every frame; only glow, halo, and tiny motes animate.
Lighting/mood: mysterious, inviting, safe checkpoint glow; much calmer and less explosive than an activation or teleport sequence.
Color palette: cyan, turquoise, pale blue-white highlights, subdued moss green, olive-gray ancient stone, tiny restrained warm-gold sparks. Do not use magenta or pink in the subject.
Constraints: exactly six complete sprites; no characters, monsters, UI, text, arrows, symbols, numbers, watermark, cast shadow, contact shadow, reflections, panel borders, dividing lines, or cropped parts. Preserve the exact top-down three-quarter perspective and compact footprint from Image 1. The background must be perfectly flat solid #eb05e4 with no texture, gradients, glow spill, or lighting variation. Keep all particles close to their own cell and safely away from neighboring cells.
```

## Output

- Chroma source: `assets/effects/portals/return-starstone-crystal-idle-sheet-v1-chroma.png`
- Final RGBA: `assets/effects/portals/return-starstone-crystal-idle-sheet-v1.png`

## Validation

- Canvas: 1536 x 1024
- Layout: 3 columns x 2 rows
- Alpha range: 0–255
- Four corners: fully transparent
- All six frame subjects remain inside their own cells
- No code implementation performed
