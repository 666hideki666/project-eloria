# 森の封印石・中央遺跡台座への設置演出 v1

## 概要

- 用途: 森の封印石を中央遺跡の台座へ戻すイベント演出
- 形式: 2行3列、全6コマの透過PNGスプライトシート
- 解像度: 1536 × 1024 px（1コマ 512 × 512 px）
- 生成方法: Codex内蔵 ImageGen（APIキーを使う追加課金のCLI生成は未使用）
- 背景処理: 単色マゼンタ背景で生成後、ローカルのクロマキー除去で透過化

## 参照素材

- `assets/items/key-items/forest-seal-stone-formation-sheet-v1.png`
- `assets/effects/items/forest-seal-stone-stage-clear-blessing-sheet-v1.png`
- `assets/environments/bosses/velgran/velgran-sealing-altar-v1.png`

## 初回生成プロンプト

```text
Create a production-ready 16-bit fantasy JRPG pixel-art sprite sheet for PROJECT ELORIA.

Use case: stylized-concept
Asset type: transparent key-item installation event animation
Primary request: after the party returns to the central forest ruins, the completed Forest Seal Stone floats above an ancient empty socket, descends into it, is gently clasped by living roots, activates the ruin's cyan-green rune network, and remains installed as a softly pulsing completed landmark.
Input images: Image 1 is the exact Forest Seal Stone design and must be preserved; Image 2 defines the matching cyan rune, root, leaf, and gold sparkle language; Image 3 defines ancient mossy stone-and-root altar materials and top-down three-quarter perspective. Do not include Velgran, the boss arena, or characters.

OUTPUT:
- Exactly 1536 x 1024 pixels.
- Strict 2 rows x 3 columns, exactly 6 equal 512 x 512 cells.
- Read frames left-to-right across the top row, then left-to-right across the bottom row.
- Perfectly flat solid #ff00ff chroma-key background throughout all empty pixels.
- Do not use magenta in any artwork.
- No grid lines, labels, text, UI, floor, scenery, full room, characters, boss, weapons, treasure chest, cast shadow, smoke, or fog.
- Crisp hard-edged 16-bit pixel art matching the references. No painterly rendering, smooth vector graphics, blur, or soft transparent haze.

SUBJECT:
- Preserve the Forest Seal Stone as a tall faceted cyan-teal crystal held in an ornate symmetrical frame of warm brown roots with small moss-green leaves and tiny pale-gold buds.
- Add one compact ancient installation socket below it: a low circular or slightly elliptical weathered dark-stone pedestal viewed in top-down three-quarter perspective, about 220–260 px wide and 80–110 px tall.
- The socket has a central diamond-shaped recess, four short broken cyan rune channels at cardinal directions, thin moss, and two small root clamps curling from left and right.
- The socket is a permanent physical landmark, not a portal, fountain, throne, door, or large monument.
- Keep the same centerline and bottom anchor in all frames: socket centered near local x=256, with its lowest visible pixel near local y=410.
- Maximum complete footprint about 280–320 px wide and 310–350 px tall.
- The stone must remain smaller than a character-height boss crystal but clearly readable beside 48 px game sprites after scaling.

SIX-FRAME INSTALLATION:
1. Awaiting socket: the compact empty stone socket is visible with a dark diamond recess and four very dim cyan rune points. The Forest Seal Stone hovers high above it, separated by a clear gap, with only two tiny drifting leaves.
2. Recognition: the stone moves lower; a narrow cyan-green beam connects its bottom tip to the recess. The four rune points brighten and the side roots begin lifting toward the stone.
3. Descent: the Forest Seal Stone is halfway into the socket; root clamps curl inward around its lower frame. Broken cyan rune arcs trace around the pedestal and small golden glints appear.
4. Locking flash: the stone reaches its final installed height. The roots clasp it symmetrically and a contained bright cyan-green horizontal pulse ring expands from the socket. A few leaves and diamond motes lift. No explosion and no solid white block.
5. Ruin awakening: the stone is fully mounted and clearly visible; four short rune channels glow outward from the pedestal, root tips and leaves catch warm-gold highlights, and one restrained cyan circular arc surrounds the base.
6. Stable completed state: same installed stone and exact anchor as frame 5, but calmer. The rune channels remain softly lit, the crystal has a small internal star-like glint, and only three to five motes/leaves shift position so frames 5 and 6 can alternate as a subtle idle pulse.

GAMEPLAY AND VISUAL REQUIREMENTS:
- Clear progression: hover -> recognition beam -> descent -> lock -> energy spreads -> stable installed landmark.
- The Forest Seal Stone must remain consistent in shape, frame, facets, root ornament, and cyan-teal palette across all frames.
- Do not show the stone breaking, transforming into another item, disappearing, being held by hands, or entering a character.
- Keep frame 4 impressive but peaceful, smaller than a boss attack or return portal.
- The final installed state must read as “one forest seal has been restored” without text or numbers.
- Do not create multiple seal stones, multiple sockets, a standing doorway, portal pool, healing spring, explosion, attack effect, or giant tree.
- Keep every pixel fully inside its own 512 x 512 cell with at least 60 px clear padding on every local edge.
- Highest pixel below local y=60; lowest pixel above local y=440.
- Never touch or cross cell boundaries.
- No readable letters or symbols.

COLOR:
Cyan and turquoise crystal light, deep teal shadows, pale blue-white facets, moss and olive leaves, warm brown roots, restrained antique gold highlights, dark desaturated green-gray stone. Match Project Eloria's limited 16-bit palette.

Create the requested asset on a perfectly flat solid #ff00ff chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep the subject fully separated from the background with crisp edges and generous padding. No watermark.
```

## 余白修正プロンプト

```text
Edit the supplied sprite sheet only to correct cell margins and separation. Preserve the exact 1536 x 1024 canvas, exact 2 rows x 3 columns, exact six-frame sequence, Forest Seal Stone design, socket design, effects, palette, and crisp 16-bit pixel-art style. In EACH 512 x 512 cell, uniformly scale the complete frame artwork down to about 78% of its current size and recenter it independently inside that cell. Every visible pixel, mote, leaf, beam, pulse ring, rune channel, and ornament must remain completely inside its own cell with at least 55 pixels of perfectly flat solid #ff00ff empty padding on all four local cell edges. Do not let any artwork touch or cross x=512, x=1024, or y=512. Keep the socket bottom anchor consistent near local y=405 in all frames. Do not remove, add, redraw, reorder, combine, or change any frame. Do not add grid lines, text, labels, characters, scenery, shadows, gradients, blur, transparency, or watermark. Background must remain perfectly uniform solid #ff00ff, and no magenta may appear in the artwork.
```

## 検証結果

- RGBA、1536 × 1024 px
- 四隅のアルファ値: 0
- 6コマすべてがセル境界を越えず、独立切り出し可能
- 発光、葉、粒子を含む最小余白: 36 px以上
- 透過後の輪郭と16ビット風のピクセル表現を目視確認済み
