# パーティ帰還・転送消失オーバーレイ v1

## 生成方法

- Built-in ImageGen（追加のAPI課金なし）
- 用途: カイル・ナディ・メルへ共通で重ねる帰還転送エフェクト
- 参照素材:
  - `assets/effects/portals/forest-ruins-return-portal-sheet-v1.png`
  - `assets/effects/items/forest-seal-stone-stage-clear-blessing-sheet-v1.png`
  - `assets/sprites/characters/kyle/kyle-idle-walk-transparent-source-v1.png`（人物の大きさのみ参照）
- 生成時背景: フラットな `#ff00ff`
- 生成後、クロマキー除去スクリプトでRGBA透過素材へ変換

## 最終プロンプト

```text
Create a production-ready 16-bit fantasy JRPG pixel-art sprite sheet for PROJECT ELORIA.

Use case: stylized-concept
Asset type: universal transparent character teleport-out overlay animation
Primary request: an ancient forest-crystal return teleport effect that wraps around any one party character standing inside the active return portal, lifts their presence upward as cyan rune light, and leaves only a few fading motes. The effect will be applied separately to Kyle, Nadi, and Mel, so do not draw any character, body, silhouette, clothing, weapon, face, or shadow.
Input images: Image 1 is the exact cyan return-portal visual language and palette; Image 2 is the matching rune, root, leaf, and sparkle style; Image 3 defines the approximate standing character footprint and scale only, but the character must not appear in the output.

OUTPUT:
- Exactly 1536 x 1024 pixels.
- Strict 2 rows x 3 columns, exactly 6 equal 512 x 512 cells.
- Read frames left-to-right across the top row, then left-to-right across the bottom row.
- Perfectly flat solid #ff00ff chroma-key background throughout all empty pixels.
- Do not use magenta in the effect.
- No grid lines, labels, text, UI, floor, portal base, full magic circle, characters, silhouettes, boss, item, cast shadow, smoke, or fog.
- Crisp hard-edged 16-bit pixel art matching the references. No painterly art, smooth vector graphics, realistic lighting, or blurry transparency.

EFFECT DESIGN:
- A universal overlay centered around an invisible standing character approximately 150–175 px tall in each 512 px cell.
- Keep the central body-shaped region mostly open and readable so an external character sprite can remain visible beneath the overlay in frames 1–3.
- Effect footprint about 190–240 px wide and 250–310 px tall at maximum.
- Same anchor in every frame: invisible character feet near local x=256, y=350.
- Cyan and turquoise vertical rune streaks, broken elliptical bands, small diamond motes, a few pale-gold glints, and two or three moss-green leaves rising upward.
- Restrained ancient root curls may briefly appear at ankle height, then dissolve into cyan pixels.
- The motion must feel safe, triumphant, and like returning home after stage clear, not an attack, death, damage, healing spell, or resurrection.
- Use discrete opaque pixel clusters and stepped brightness bands. Avoid translucent soft glow that will be difficult to chroma-key.

SIX-FRAME TELEPORT-OUT:
1. Ground response: two thin broken cyan elliptical arcs appear around the invisible feet; four tiny diamond motes rise to knee height; center remains completely open.
2. Rising spiral: the foot arcs brighten and a loose pair of cyan ribbon-like rune streaks coil upward along the left and right sides of the empty character space; a few leaves lift.
3. Full enclosure: narrow vertical light bars and diamond motes surround the empty character from boots to above the head, while leaving the middle partially open. A small bright ring passes around chest height.
4. Transfer flash: the strongest frame; a contained pillar-like bundle of cyan and pale-blue vertical streaks covers much of the character space, with bright segmented bands and upward fragments, but remains narrower than the portal effect. No solid white block and no explosion.
5. Ascending remnants: most lower light has vanished; a narrowing bundle of streaks, diamonds, and pixel fragments moves upward above the former head position, with only a dim broken ring at the feet.
6. Completion residue: the character area is empty; only six to ten small cyan/gold motes, one short fading arc near the feet, and two high rising streak fragments remain. This final frame clearly reads as teleport complete.

PHYSICAL AND GAMEPLAY REQUIREMENTS:
- Clear progression: foot response -> rising wrap -> enclosure -> transfer flash -> upward disappearance -> residual motes.
- Do not include a character-shaped solid mass or a white silhouette; implementation will fade the actual character independently.
- All frames must share the exact same foot anchor and vertical centerline.
- Keep all pixels fully inside each 512 px cell with generous padding.
- Never cross cell boundaries.
- The effect should still read clearly when scaled down beside 48 px game sprites.
- Keep frame 4 dramatic but smaller and slimmer than the large return portal column.
- No readable letters or symbols.

COLOR:
Bright cyan, turquoise, pale blue-white highlights, deep teal edge pixels, restrained warm-gold sparkles, a few olive/moss leaves, and very subtle brown root accents. Match the Project Eloria references exactly.
```

## 最終余白調整

初回出力では一部の足元と上昇光がセル境界に触れていたため、デザインを維持したまま約18〜22%縮小し、各セル中央へ再配置した。最終版は全6コマのアルファ領域がセル境界をまたがないことを確認済み。
