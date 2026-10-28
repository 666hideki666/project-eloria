# ヴェルグラン封印根・開放アニメーション v1

## 生成方法

- Built-in ImageGen（追加のAPI課金なし）
- 参照画像:
  - `assets/environments/bosses/velgran/velgran-sealing-altar-v1.png`
  - `assets/sprites/bosses/velgran/velgran-awakening-body-sheet-v1.png`
  - `assets/effects/bosses/velgran/velgran-nebashiri-root-eruption-effect-sheet-v1.png`
- 生成時背景: フラットな `#ff00ff`
- 生成後、クロマキー除去スクリプトでRGBA透過素材へ変換

## 最終プロンプト

Create a production-ready pixel-art sprite sheet for PROJECT ELORIA, matching the referenced 16-bit fantasy JRPG pixel-art style, palette, lighting, bark detail, moss, and cyan crystal energy.

OUTPUT LAYOUT:
- Exactly 1536 x 1024 pixels.
- Strict sprite sheet grid: 2 rows x 3 columns, exactly 6 equal cells of 512 x 512 pixels.
- Read frames left-to-right on top row, then left-to-right on bottom row.
- Each cell contains ONLY the foreground sealing roots overlay, centered consistently in the lower-middle area.
- Exact flat chroma-key background color #ff00ff across all empty pixels. Do not use magenta anywhere in the artwork.
- Crisp hard-edged pixel art, no blur, no antialiasing haze, no labels, no borders, no grid lines, no text.

SUBJECT:
A low ancient root seal placed across the front-center of Velgran's circular altar. It is made of several thick, old, intertwined brown tree roots with moss-green growth, small leaves, muted stone dust, and faint cyan magical veins. It must feel organic and physically intertwined, like a knot holding a dormant guardian in place. It is NOT a solid wall, NOT a pair of doors, NOT a rectangular gate, NOT a vertical spike barrier, and NOT an attack effect.

SCALE AND PLACEMENT:
- In each 512 x 512 cell, the roots occupy roughly 400–450 px width and 140–220 px height.
- Keep the roots as a low foreground arc/knot across the lower half of the cell.
- Maintain identical anchor position across all frames so it animates without jumping.
- No altar floor, no boss body, no characters, no shadows, no UI.

SIX-FRAME OPENING ANIMATION:
1. Fully sealed: several thick roots woven into a dense but natural low central knot/arc. The center is blocked by crossed roots but it must still look organic, not architectural.
2. Magical strain: thin cyan light pulses along bark seams; the central knot flexes and loosens slightly; tiny dust and leaf motes appear.
3. First release: one or two upper crossing roots lift, unhook, and begin curling backward diagonally; a narrow central gap starts opening.
4. Unwinding: roots actively curl and retract diagonally/backward toward the left and right outer edges of the altar, like living vines releasing tension. The central opening becomes clearly wider. Do not slide them horizontally as rigid halves.
5. Nearly open: most roots are coiled and settling along the lower-left and lower-right outer edges; only a couple thin tips still cross near the center; wide clear passage.
6. Fully open: all sealing roots have naturally retracted and settled into low coils at the far lower-left and lower-right edges, leaving the entire center completely clear. Only small root tips, falling leaves, dust, and faint cyan sparkles remain.

PHYSICAL MOTION REQUIREMENTS:
- The knot loosens sequentially; individual roots bend, unhook, curl, and recoil.
- Root mass redistributes toward the outer corners rather than splitting into two rigid pieces.
- Each frame must clearly advance the same continuous action.
- Preserve root identity and thickness between adjacent frames.
- No explosions, no damaging spikes, no giant cyan slash, no bright combat impact.

COLOR:
Dark warm brown bark, olive and moss green, subdued gray-brown dust and stones, very small cyan seal veins and particles consistent with the altar crystals. Cyan is an accent, not the dominant mass.

This is a transparent foreground environmental animation asset after chroma removal, designed to overlay the referenced altar and reveal the sleeping Velgran beneath it.

