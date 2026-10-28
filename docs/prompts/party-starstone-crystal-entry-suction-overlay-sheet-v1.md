# パーティー・星石クリスタル吸い込み転送演出 v1

## 概要

- 用途: 解放済みの星石クリスタルへ触れ、次の遺跡へ入る際のパーティー用オーバーレイ
- 形式: 2行3列、全6コマの透過PNGスプライトシート
- 解像度: 1536 × 1024 px（1コマ 512 × 512 px）
- キャラクター: 描画せず、ゲーム内の3人へ重ねて使用
- 生成方法: Codex内蔵 ImageGen（APIキーを使う追加課金のCLI生成は未使用）
- 背景処理: 単色マゼンタ背景で生成後、ローカルのクロマキー除去で透過化

## 参照素材

- `assets/effects/portals/party-return-teleport-out-overlay-sheet-v1-chroma.png`
- `assets/effects/portals/party-return-teleport-arrival-overlay-sheet-v1-chroma.png`
- `assets/effects/portals/next-starstone-ruins-crystal-awakening-sheet-v1-chroma.png`

## 生成プロンプト

```text
Create a production-ready 16-bit fantasy JRPG pixel-art effect sprite sheet for PROJECT ELORIA.

Use case: stylized-concept
Asset type: transparent party overlay for entering an awakened Starstone Ruins crystal
Primary request: an effect-only six-frame animation placed over the three party sprites when they touch the active Starstone crystal. Cyan and turquoise light gathers around the party, bends toward one upper central focus point, compresses into a narrow star-shaped stream, and pulls the party into the crystal. The characters themselves are rendered separately and must NOT appear in this asset.
Input images: Images 1 and 2 define Project Eloria's existing return teleport effect language, pixel density, cyan crystal diamonds, restrained old-gold sparks, and leaf motes. Image 3 defines the active four-point Starstone crystal and its cyan halo. Create a distinct directional inward-suction animation, not another vertical return column and not another pedestal animation.

OUTPUT:
- Exactly 1536 x 1024 pixels.
- Strict 2 rows x 3 columns, exactly 6 equal 512 x 512 cells.
- Read frames left-to-right across the top row, then left-to-right across the bottom row.
- Perfectly flat solid #ff00ff chroma-key background throughout all empty pixels.
- Do not use magenta in any artwork.
- Effect-only overlay. No characters, silhouettes, faces, bodies, clothing, weapons, floor, stone dais, pedestal, crystal landmark, map, scenery, UI, labels, text, numbers, shadows, smoke, fog, or watermark.
- Crisp hard-edged 16-bit pixel art matching the references. No painterly rendering, smooth vector graphics, blur, soft translucent haze, or realistic lighting.

SPATIAL DESIGN:
- The overlay covers a compact three-person formation area about 270–310 px wide and 260–310 px tall.
- Party ground anchor is local x=256, local y=405.
- The suction destination is one small four-point cyan star aperture at local x=256, local y=125.
- Light must visibly travel upward and inward from the party area toward that single destination.
- Use curved cyan-turquoise ribbon fragments, broken oval arcs, faceted diamond motes, three to seven tiny moss-green leaves, restrained antique-gold four-point sparks, and narrow pixel streaks.
- Leave the center of the lower party area mostly transparent so the real character sprites remain readable under the effect until the compression frames.
- Do not create a solid opaque cylinder, giant white block, full-screen flash, circular portal pool, doorway, attack slash, explosion, or healing aura.
- Maximum complete footprint 330 px wide and 350 px tall.
- Keep every visible pixel fully inside its own 512 x 512 cell with at least 65 px of perfectly empty #ff00ff padding on all four local edges.

SIX-FRAME CRYSTAL ENTRY:
1. Contact response: a thin broken cyan oval appears around the party's feet near local y=390. Four small diamond points mark the ring. Two faint curved light strands begin rising inward. The upper star destination is only a tiny dim glint.
2. Gathering: the ground oval brightens and narrows. Several cyan ribbon fragments and gold/leaf motes spiral upward from the left and right edges of the party area toward the upper center. Keep a large transparent central opening for the characters.
3. Upward pull: two strong mirrored S-curves lean inward, forming a tapered funnel from the broad lower party area to the small upper star. Short vertical pixel streaks point upward. The ground oval begins collapsing.
4. Compression: the funnel becomes much narrower. Three broken horizontal arcs squeeze toward the centerline, and most motes stretch into upward streaks. A bright but contained four-point cyan star aperture appears at local y=125. No solid white fill.
5. Starstream: the lower party area is almost empty. One narrow segmented cyan-turquoise beam and a cluster of tiny compressed diamond pixels rush upward into the star aperture. A small old-gold glint marks the final pull.
6. Departure afterglow: the party area is completely clear. Only the small upper four-point star briefly flashes, with two or three fading cyan diamond motes and one tiny leaf below it. This frame should naturally lead to a scene fade or map transition.

ANIMATION AND GAMEPLAY READABILITY:
- Clear progression: ground response -> spiral gathering -> directional pull -> compression -> starstream -> empty afterglow.
- It must read as being drawn INTO a crystal above, not arriving from above, healing, reviving, attacking, or returning from a dungeon.
- Keep the effect composition consistent around the same party anchor and upper destination in all frames.
- Do not show multiple destination stars, multiple portals, circular floors, characters, ghosts, bodies, or equipment.
- Do not reproduce the full vertical cylinder from the return teleport references.
- Keep frame 4 dramatic but smaller than an ultimate attack.
- Keep every ribbon, streak, sparkle, leaf, diamond, and star fully inside its cell.
- Never touch or cross x=512, x=1024, or y=512.
- Highest visible pixel below local y=70; lowest visible pixel above local y=440.
- No readable letters or symbols.

COLOR:
Bright cyan, turquoise, pale blue-white, deep teal edges, sparse moss-green leaves, restrained antique gold sparks. Match Project Eloria's limited 16-bit palette and the reference teleport effects.

Create the requested asset on a perfectly flat solid #ff00ff chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep the effect fully separated from the background with crisp edges and generous padding. No watermark.
```

## 検証結果

- RGBA、1536 × 1024 px
- 四隅のアルファ値: 0
- 6コマすべてがセル境界を越えず、独立切り出し可能
- 前半は中央が透明で、実際の3キャラスプライトを視認可能
- 後半は上部の一点へ光が収束し、次画面への切り替えに接続可能
- 透過後の輪郭、発光色、16ビット風ピクセル表現を目視確認済み
