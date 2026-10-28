# Return Starstone Crystal Activation Sheet v1

## Purpose

転送先の星石遺跡にある帰還用クリスタルへ触れた際、待機状態から帰還転送が開始されるまでをつなぐ6コマの起動アニメーション。既存のパーティー転送消失エフェクトの直前または背面で使用する。

## Generation mode

- Built-in ImageGen
- Reference-based generation
- Chroma-key background removal with the installed ImageGen helper
- No external API key or additional API billing

## Reference images

- `assets/effects/portals/return-starstone-crystal-idle-sheet-v1-chroma.png`
  - 台座、結晶、視点、位置、待機状態の基準
- `assets/effects/portals/party-return-teleport-out-overlay-sheet-v1-chroma.png`
  - 上昇光、光輪、転送粒子の基準
- `assets/effects/portals/next-starstone-ruins-crystal-awakening-sheet-v1-chroma.png`
  - 結晶と台座の起動発光の基準

## Final generation prompt

```text
Use case: stylized-concept
Asset type: production-ready retro fantasy action-RPG environmental interaction sprite sheet
Primary request: Create a six-frame activation animation for the destination Starstone Ruins return crystal. This animation bridges the calm idle landmark into the existing party teleport-out overlay when the player chooses to return to the central forest ruins.
Input images: Image 1 is the exact invariant design reference for the circular mossy stone dais, floating cyan four-point star crystal, rune channels, scale, perspective, pixel density, and palette. Image 2 is the supporting reference for the upward teleport rings, narrow light columns, cyan diamonds, tiny gold sparks, and visual intensity at the end of the sequence. Image 3 is the supporting reference for how the crystal and platform glow during activation.
Scene/backdrop: perfectly flat uniform solid #eb05e4 chroma-key background for clean removal. No floor plane, no environment, no shadows outside the asset.
Subject: the same compact ancient circular moss-covered stone dais and same floating cyan four-point star crystal appear once in every frame. Preserve their geometry, scale, top-down three-quarter perspective, and base position exactly.
Style/medium: polished 16-bit-era Japanese fantasy RPG pixel art, crisp deliberate pixel clusters, limited 1990s console palette, identical visual language to the references. Not vector, not smooth modern illustration, not painterly.
Composition/framing: exact 3 columns by 2 rows, six equal cells, frames ordered left-to-right then top-to-bottom. Every complete sprite centered consistently with generous empty chroma padding. No panel borders, no grid lines, no labels.
Animation sequence: Frame 1 matches the quiet idle state with a faint crystal glow. Frame 2 the center socket and four rune channels illuminate outward. Frame 3 one thin cyan halo forms horizontally around the floating crystal and small blue/gold motes rise. Frame 4 a second halo appears lower above the platform while the upper halo begins rising; crystal core becomes bright blue-white. Frame 5 both halos expand slightly and several narrow vertical cyan light strands rise from the platform, clearly beginning teleport activation but not covering the whole landmark. Frame 6 the platform rune channels and crystal reach peak brightness, the two halos align into an upward transfer path, and a restrained column of vertical cyan light prepares to receive the party teleport-out overlay.
Lighting/mood: ancient magical mechanism awakening; clear, exciting, readable, but slightly less intense than the separate party teleport-out effect so the two assets can be composited.
Color palette: cyan, turquoise, pale blue-white, deep teal, subdued moss green, olive-gray stone, tiny warm gold sparks. Do not use magenta or pink in the subject.
Constraints: exactly six complete sprites. The stone platform must remain visible and mechanically consistent in all frames. Do not move, rotate, resize, redesign, damage, or replace the platform or crystal. Effects must grow progressively with no sudden full portal in early frames. No characters, silhouettes, monsters, UI, text, arrows, numbers, watermark, cast shadow, contact shadow, reflection, cell borders, separators, or cropped parts. Background must be perfectly flat solid #eb05e4 with no texture, gradient, glow spill, or lighting variation. Keep every effect safely inside its own cell and away from neighboring frames.
```

## Output

- Chroma source: `assets/effects/portals/return-starstone-crystal-activation-sheet-v1-chroma.png`
- Final RGBA: `assets/effects/portals/return-starstone-crystal-activation-sheet-v1.png`

## Validation

- Canvas: 1536 x 1024
- Layout: 3 columns x 2 rows
- Alpha range: 0–255
- Four corners: fully transparent
- All six frame subjects remain inside their own cells
- Platform position and scale remain consistent across the sequence
- No code implementation performed
