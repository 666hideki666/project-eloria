# パーティ帰還・転送到着オーバーレイ v1

## 生成方法

- Built-in ImageGen（追加のAPI課金なし）
- 用途: 中央遺跡へ帰還したカイル・ナディ・メルへ共通で重ねる到着エフェクト
- 参照素材:
  - `assets/effects/portals/party-return-teleport-out-overlay-sheet-v1.png`
  - `assets/effects/portals/forest-ruins-return-portal-sheet-v1.png`
- 生成時背景: フラットな `#ff00ff`
- 生成後、クロマキー除去スクリプトでRGBA透過素材へ変換

## 最終プロンプト

```text
Create a production-ready 16-bit fantasy JRPG pixel-art sprite sheet for PROJECT ELORIA.

Use case: stylized-concept
Asset type: universal transparent character teleport-arrival overlay animation
Primary request: a safe ancient forest-crystal arrival effect at the central forest ruins. Cyan rune light descends from above, condenses into the position of an invisible party character, opens to reveal them, then the foot ring and last motes fade away. This will be applied separately to Kyle, Nadi, and Mel, so do not draw any character, body, silhouette, clothing, weapon, face, or shadow.
Input images: Image 1 is the exact matching teleport-out overlay style, scale, anchor, and palette; Image 2 is the matching floor portal rune language. This new sheet must feel like the complementary arrival half of the same travel event, with clearly downward motion.

OUTPUT:
- Exactly 1536 x 1024 pixels.
- Strict 2 rows x 3 columns, exactly 6 equal 512 x 512 cells.
- Read frames left-to-right across the top row, then left-to-right across the bottom row.
- Perfectly flat solid #ff00ff chroma-key background throughout all empty pixels.
- Do not use magenta in the effect.
- No grid lines, labels, text, UI, floor, scenery, portal pool, full large portal, characters, silhouettes, boss, item, cast shadow, smoke, or fog.
- Crisp hard-edged 16-bit pixel art matching the references.

DESIGN AND ANCHOR:
- Universal overlay centered around an invisible standing character about 150–175 px tall.
- Cyan, turquoise, pale blue-white descending vertical rune streaks; broken elliptical bands; tiny diamond motes; restrained warm-gold glints; moss-green leaves drifting downward then settling.
- Early frames may cover the central character region densely; frames 4–6 progressively open the center so the arriving character can be revealed.
- Safe and welcoming travel magic, not an attack, damage, death, resurrection, healing spell, lightning strike, or explosion.

SIX-FRAME ARRIVAL:
1. Distant signal: sparse cyan streaks, diamonds, and leaves descend from above.
2. Descending focus: a narrow light bundle approaches the invisible character position and a foot arc begins forming.
3. Arrival column: the strongest contained frame, with a segmented light pillar, chest ring, and foot ellipse.
4. Reveal opening: light bars separate toward both sides and open the character region.
5. Stabilized reveal: side spirals, foot ellipse, and settling particles remain while the center is clear.
6. Completion: only a dim broken foot arc, tiny motes, and a settled leaf remain.

COLOR:
Bright cyan, turquoise, pale blue-white highlights, deep teal edge pixels, restrained warm-gold sparkles, and a few olive/moss leaves. Match the existing Project Eloria return effects.
```

## 品質確認

- RGBA透過PNG
- 1536×1024px、2行×3列、全6コマ
- 透過四隅を確認済み
- 全エフェクトが各512×512セル内に収まり、セル境界をまたがないことを確認済み
- 追加の位置合わせ生成は内蔵ImageGenの通信エラーにより未採用。API版への切り替えは行っていない
