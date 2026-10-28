# パーティー・星石遺跡到着／実体化演出 v1

## 概要

- 用途: 星石クリスタルによる転送後、次の遺跡へ到着する際のパーティー用オーバーレイ
- 形式: 2行3列、全6コマの透過PNGスプライトシート
- 解像度: 1536 × 1024 px（1コマ 512 × 512 px）
- キャラクター: 描画せず、ゲーム内の3人へ重ねて使用
- 生成方法: Codex内蔵 ImageGen（APIキーを使う追加課金のCLI生成は未使用）
- 背景処理: 単色マゼンタ背景で生成後、ローカルのクロマキー除去で透過化

## 参照素材

- `assets/effects/portals/party-starstone-crystal-entry-suction-overlay-sheet-v1-chroma.png`
- `assets/effects/portals/party-return-teleport-arrival-overlay-sheet-v1-chroma.png`
- `assets/effects/portals/next-starstone-ruins-crystal-awakening-sheet-v1-chroma.png`

## 初回生成プロンプト

```text
Create a production-ready 16-bit fantasy JRPG pixel-art effect sprite sheet for PROJECT ELORIA.

Use case: stylized-concept
Asset type: transparent party arrival overlay for materializing inside the next Starstone Ruins dungeon
Primary request: immediately after the party is pulled into the awakened Starstone crystal, one cyan four-point star appears above the destination, splits into three descending star-light streams, and materializes the three party members into their normal triangular exploration formation. The characters themselves are rendered separately and must NOT appear in this asset.
Input images: Image 1 defines the exact preceding inward-suction motion, its upper four-point star destination, pixel density, cyan ribbons, old-gold sparks, and leaf motes. Image 2 defines Project Eloria's existing arrival effect vocabulary, but this new animation must use three separated landing streams instead of one large cylinder. Image 3 defines the active Starstone crystal's bright cyan four-point star motif and rune color. Do not include the stone pedestal or crystal landmark.

OUTPUT:
- Exactly 1536 x 1024 pixels.
- Strict 2 rows x 3 columns, exactly 6 equal 512 x 512 cells.
- Read frames left-to-right across the top row, then left-to-right across the bottom row.
- Perfectly flat solid #ff00ff chroma-key background throughout all empty pixels.
- Do not use magenta in any artwork.
- Effect-only overlay. No characters, silhouettes, faces, bodies, clothing, weapons, floor, pedestal, crystal landmark, map, scenery, UI, labels, text, numbers, shadows, smoke, fog, or watermark.
- Crisp hard-edged 16-bit pixel art matching the references. No painterly rendering, smooth vector graphics, blur, soft translucent haze, or realistic lighting.

PARTY FORMATION AND ANCHORS:
- One leader landing anchor at local x=256, local y=365.
- Two companion landing anchors slightly behind and wider: local x=185, local y=410 and local x=327, local y=410.
- The source star begins at local x=256, local y=105.
- All three landing streams must clearly connect from the single upper star toward the three fixed landing anchors.
- Use narrow broken cyan-turquoise pixel streaks, small faceted diamond motes, restrained antique-gold four-point sparks, two to five tiny moss-green leaves, and three small broken landing ovals.
- Keep each landing stream only about 48–62 px wide so the three real character sprites remain individually readable.
- Do not merge the streams into one solid cylinder or a large opaque wall of light.
- Maximum complete footprint 340 px wide and 350 px tall.
- Keep every visible pixel fully inside its own 512 x 512 cell with at least 60 px of perfectly empty #ff00ff padding on all local edges.

SIX-FRAME STARSTONE ARRIVAL:
1. Star emergence: one bright but compact four-point cyan star appears at the upper center. Beneath it are only three tiny falling diamond motes hinting at the future landing positions. The lower party area remains completely transparent.
2. Three-way split: the upper star sends three thin branching cyan trails downward: one straight to the leader anchor and two diagonal trails to the left and right companion anchors. Each trail has broken pixel segments and one small gold glint.
3. Landing descent: the three trails become three separate narrow columns of descending light, clearly spaced apart. Tiny broken ovals begin forming under the three landing anchors. Leave transparent vertical gaps between the columns.
4. Materialization peak: each anchor is wrapped by a compact open-sided light shell made of short vertical streaks and one thin oval ring. The upper source star dims. The centers of all three shells remain transparent so the real character sprites can appear inside. Dramatic but not an attack.
5. Light shell opening: the three shells peel outward and downward into curved cyan fragments. The character centers become mostly unobstructed. Three small landing rings glow at the feet, with a few gold sparks and leaves drifting away.
6. Settled formation: almost all vertical light is gone. Only three subtle broken cyan landing ovals and five to eight fading diamond/gold/leaf motes remain around the fixed formation anchors. This frame must leave the real party fully readable and transition naturally into player control.

ANIMATION AND GAMEPLAY READABILITY:
- Clear progression: single star -> three-way split -> three descents -> three materialization shells -> shells open -> settled party.
- It must read as arrival and materialization at a new dungeon, not being pulled away, returning to the hub, healing, reviving, attacking, or spawning enemies.
- Preserve one upper source star and exactly three distinct landing anchors.
- Do not show more than three streams, any characters, ghosts, body outlines, equipment, multiple portals, a large floor circle, or a full vertical cylinder.
- Do not reproduce Image 2's single large teleport cage.
- Keep frame 4 impressive but smaller than an ultimate attack.
- Keep every streak, ribbon, sparkle, leaf, diamond, ring, and star fully inside its own cell.
- Never touch or cross x=512, x=1024, or y=512.
- Highest visible pixel below local y=60; lowest visible pixel above local y=445.
- No readable letters or symbols.

COLOR:
Bright cyan, turquoise, pale blue-white, deep teal edge pixels, sparse moss-green leaves, and restrained antique gold sparks. Match Project Eloria's limited 16-bit palette and the preceding crystal-entry effect.

Create the requested asset on a perfectly flat solid #ff00ff chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep the effect fully separated from the background with crisp edges and generous padding. No watermark.
```

## 区切り線除去プロンプト

```text
Edit the supplied 1536 x 1024 sprite sheet with one precise correction only: remove every visible white grid line and cell-divider line, especially the vertical lines at x=512 and x=1024, the horizontal line at y=512, and the thin white outer border. Replace those lines with exactly the same perfectly flat solid #ff00ff background as the surrounding empty area.

Preserve unchanged:
- exact 1536 x 1024 canvas
- exact 2 rows x 3 columns
- exact six-frame sequence and order
- every cyan star, three branching trails, three separated landing columns, open light shells, spiral fragments, landing ovals, gold sparks, green leaves, pixel shapes, positions, scale, color, and crisp 16-bit pixel-art edges
- all empty background as perfectly uniform solid #ff00ff

Do not redraw, move, resize, add, remove, recolor, or alter any effect artwork. Do not add any new lines, labels, text, UI, characters, shadows, gradients, texture, watermark, or transparency. The final image must have no visible grid, no separators, and no border.
```

## 検証結果

- RGBA、1536 × 1024 px
- 四隅のアルファ値: 0
- 白い区切り線と外枠を除去済み
- 6コマすべてがセル境界を越えず、独立切り出し可能
- 3本の光柱は互いに分離し、各キャラスプライトを個別に表示可能
- 最終コマは小さな着地リングだけが残り、操作開始へ自然に接続可能
- 透過後の輪郭、発光色、16ビット風ピクセル表現を目視確認済み
