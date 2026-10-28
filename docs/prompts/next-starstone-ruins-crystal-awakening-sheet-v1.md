# 次の星石遺跡・クリスタル解放演出 v1

## 概要

- 用途: 森の封印石を中央遺跡へ設置した後、次の星石遺跡が解放されるイベント
- 形式: 2行3列、全6コマの透過PNGスプライトシート
- 解像度: 1536 × 1024 px（1コマ 512 × 512 px）
- 生成方法: Codex内蔵 ImageGen（APIキーを使う追加課金のCLI生成は未使用）
- 背景処理: 単色マゼンタ背景で生成後、ローカルのクロマキー除去で透過化

## 参照素材

- `assets/concepts/environments/star-circling-forest-overview-v1.png`
- `assets/effects/items/forest-seal-stone-central-altar-installation-sheet-v1-chroma.png`
- `assets/concepts/environments/crystal-dungeon-01/crystal-altar-clear-event-v1.png`

## 生成プロンプト

```text
Create a production-ready 16-bit fantasy JRPG pixel-art sprite sheet for PROJECT ELORIA.

Use case: stylized-concept
Asset type: transparent next-stage Starstone Ruins crystal awakening animation
Primary request: after the Forest Seal Stone is installed in the central forest ruin, dormant energy reaches one of the surrounding Starstone Ruins. Its small cyan star-shaped travel crystal awakens, the invisible seal dissolves, and the crystal becomes an active touchable entrance to the next dungeon.
Input images: Image 1 defines the forest hub, compact circular Starstone Ruins platforms, cyan four-point star crystal motif, mossy stone materials, and top-down three-quarter perspective. Image 2 defines the exact cyan-green rune, antique-gold sparkle, leaf, and peaceful activation effect language. Image 3 defines Project Eloria's ancient crystal-ruin palette and restrained mystical atmosphere. Do not copy the large Forest Seal Stone object from Image 2 and do not include the boss or characters from Image 3.

OUTPUT:
- Exactly 1536 x 1024 pixels.
- Strict 2 rows x 3 columns, exactly 6 equal 512 x 512 cells.
- Read frames left-to-right across the top row, then left-to-right across the bottom row.
- Perfectly flat solid #ff00ff chroma-key background throughout all empty pixels.
- Do not use magenta in any artwork.
- No grid lines, labels, text, UI, map, forest scenery, full room, characters, enemies, boss, weapons, treasure chest, cast shadow, smoke, fog, or watermark.
- Crisp hard-edged 16-bit pixel art matching the references. No painterly rendering, smooth vector graphics, blur, or soft transparent haze.

SUBJECT:
- One compact ancient Starstone Ruins waypoint viewed in top-down three-quarter perspective.
- A low circular weathered gray-green stone dais, approximately 230–270 px wide and 70–95 px tall, with a shallow center socket and four short cyan rune grooves pointing north, east, south, and west.
- Moss is sparse and tasteful. Add only two or three tiny old-gold metal inlays.
- Above the dais floats one small four-point star-shaped crystal, clearly different from the tall ornate Forest Seal Stone. It should look like a faceted cyan diamond with four short pointed rays, about 72–92 px tall when fully awake.
- In dormant frames the crystal is dark desaturated teal and partially enclosed by two thin translucent dark-cyan seal arcs. In active frames it becomes bright cyan-turquoise with a pale blue-white center star.
- The landmark is a dungeon-entry crystal, not a healing fountain, portal pool, large monument, tree, doorway, or treasure chest.
- Keep the same centerline and bottom anchor in every frame: dais centered near local x=256; its lowest visible pixel near local y=405.
- Maximum complete footprint 300 px wide and 330 px tall.
- Every frame must remain fully within its own cell with at least 70 px of perfectly empty #ff00ff padding on all four local edges.

SIX-FRAME AWAKENING:
1. Dormant: the small dark teal star crystal hangs low over an unlit stone socket. Two thin closed seal arcs cross around it. The four dais grooves are almost black. No sparkles.
2. Distant response: one narrow cyan-green energy filament enters from above and touches the crystal. A single tiny antique-gold spark appears. The central socket glows faintly while the seal arcs remain closed.
3. Seal loosens: the crystal rises slightly and brightens from its center. The two seal arcs separate and rotate outward. Four broken cyan lines begin moving from the socket along the cardinal grooves.
4. Awakening pulse: the seal arcs dissolve into small square motes. A contained cyan-turquoise pulse ring expands around the crystal and dais. The crystal reaches full height and shows a strong pale four-point center glint. Impressive but smaller and calmer than a boss attack.
5. Active entrance: the fully bright star crystal floats above the now-lit dais. Four rune grooves glow clearly, a thin oval halo surrounds the base, and three to five tiny gold/cyan motes rise. No large explosion.
6. Stable active idle: same exact active crystal, scale, centerline, and bottom anchor as frame 5, with a slightly dimmer halo and the glint/motes shifted subtly. Frames 5 and 6 must alternate smoothly as a calm touchable-entry idle animation.

GAMEPLAY READABILITY:
- Clear progression: dormant lock -> incoming energy -> seal opening -> activation pulse -> active entrance -> stable idle.
- The final state must immediately read as “this crystal can now be touched to enter the next dungeon,” without text, arrows, buttons, hands, or characters.
- Preserve one single crystal and one single dais in every frame.
- Do not turn it into the Forest Seal Stone, a purple healing crystal, a portal hole, a water surface, an altar throne, a gate, or a weapon.
- Do not create multiple crystals, extra pedestals, giant rune circles, solid white flashes, attack slashes, or screen-filling effects.
- Keep every leaf, spark, arc, halo, beam, and visible pixel completely inside its own 512 x 512 cell.
- Never touch or cross x=512, x=1024, or y=512.
- Highest visible pixel below local y=70; lowest visible pixel above local y=440.
- No readable letters, numbers, or symbols.

COLOR:
Cyan, turquoise, pale blue-white, deep teal, dark desaturated green-gray stone, sparse moss green, and restrained antique gold. Match Project Eloria's limited 16-bit palette.

Create the requested asset on a perfectly flat solid #ff00ff chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep the subject fully separated from the background with crisp edges and generous padding. No watermark.
```

## 検証結果

- RGBA、1536 × 1024 px
- 四隅のアルファ値: 0
- 6コマすべてがセル境界を越えず、独立切り出し可能
- 最終2コマは位置と大きさが揃い、交互表示による待機アニメに使用可能
- 透過後の輪郭、発光色、16ビット風ピクセル表現を目視確認済み
