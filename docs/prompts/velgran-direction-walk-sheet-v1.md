# ヴェルグラン 方向別・待機歩行シート v1

## 生成方式

- Codex 組み込み ImageGen
- 既存のヴェルグラン基本ポーズシートと守護者コンセプトを参照
- 背景色 `#ff00ff` で生成後、クロマキー除去により透過PNG化

## 参照画像

- `assets/sprites/bosses/velgran/velgran-key-pose-sheet-v1.png`
- `assets/concepts/monsters/guardians/forest-crystal-guardian-pixel-concept-v1.png`

## 最終プロンプト

Create a production-ready directional idle and walk sprite reference sheet for the exact same original boss creature, Forest Crystal Beast Velgran, preserving its established identity: a large quadrupedal forest guardian made of mossy green stone, bark and roots, heavy forelimbs, branching wooden antlers, small glowing cyan crystal growths, and one prominent cyan crystal core embedded in the center of its chest.

Style: polished 16-bit era Japanese fantasy action RPG pixel art, top-down three-quarter gameplay perspective, crisp hard pixel clusters, limited cohesive palette, no smoothing, no painterly rendering. Keep the creature's size, silhouette, anatomy, antlers, colors and crystal placements consistent in every cell.

STRICT SHEET LAYOUT: exactly 4 horizontal rows by 3 vertical columns, 12 isolated full-body sprites, evenly spaced, identical canvas footprint and ground alignment in every cell.
Row 1 — facing DOWN/front toward the player: idle A, idle B with only subtle breathing/weight shift, walk step.
Row 2 — facing UP/away from the player: idle A, idle B with subtle breathing/weight shift, walk step.
Row 3 — facing LEFT: idle A, idle B with subtle breathing/weight shift, walk step.
Row 4 — facing RIGHT: idle A, idle B with subtle breathing/weight shift, walk step.

CRITICAL REAR-VIEW REQUIREMENT: every sprite in row 2 must be an unmistakable true back/rear view. Do not show its face, eyes, mouth, or chest crystal. Show the backs of the antlers, layered bark-and-stone back armor, shoulder plates, haunches and centered root-like tail. The cyan chest core must be completely hidden from the rear. Left and right rows must be clear mirrored side directions, not front-biased three-quarter poses.

No attacks, no magic, no impact effects, no dust, no cast shadow, no health bars, no labels, no letters, no numbers, no grid lines, no borders, no scenery. Put every sprite over one perfectly flat, uniform, fully opaque chroma-key background of exact color #ff00ff. Do not use magenta or pink anywhere on the creature. Leave generous clean spacing around each sprite for later frame extraction.

