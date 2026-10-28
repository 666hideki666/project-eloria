# 森の中央遺跡・帰還転送門アニメーション v1

## 生成方法

- Built-in ImageGen（追加のAPI課金なし）
- 参照画像:
  - `assets/environments/bosses/velgran/velgran-sealing-altar-v1.png`
  - `assets/concepts/environments/crystal-dungeon-01/crystal-altar-clear-event-v1.png`
  - `assets/effects/items/forest-seal-stone-stage-clear-blessing-sheet-v1.png`
- 生成時背景: フラットな `#ff00ff`
- 生成後、クロマキー除去スクリプトでRGBA透過素材へ変換

## 最終プロンプト

Create a production-ready 16-bit fantasy JRPG pixel-art sprite sheet for PROJECT ELORIA.

Use case: stylized-concept
Asset type: transparent environmental return-teleport activation animation
Primary request: after the Forest Seal Stone is obtained, the ancient center pattern of Velgran's boss altar reactivates and becomes a return teleport that sends the three-person party back to the central forest ruins.
Input images: use the circular altar's cyan rune geometry as the design language; use the clear-event concept for mood and scale; use the blessing effect for cyan, gold, leaf, and rune particle style.

OUTPUT:
- Exactly 1536 x 1024 pixels.
- Strict 2 rows x 3 columns, exactly 6 equal 512 x 512 cells.
- Read frames left-to-right across the top row, then left-to-right across the bottom row.
- Perfectly flat solid #ff00ff chroma-key background throughout all empty pixels.
- Do not use magenta in the artwork.
- No grid lines, labels, text, UI, floor tiles, full altar, characters, boss, item, or cast shadow.
- Crisp hard-edged 16-bit pixel art matching the references. No painterly art, smooth vector graphics, or blurry fog.

SUBJECT AND PERSPECTIVE:
- A top-down three-quarter-view FLOOR teleport effect, not an upright doorway.
- Base footprint: an ancient elliptical rune circle viewed from above, suitable for overlaying the center of the referenced circular boss altar.
- Stable portal footprint about 340–390 px wide and 150–190 px tall.
- From that floor ellipse rises a controlled translucent-looking column of cyan light about 200–270 px high, made from discrete pixel clusters and vertical rune streaks rather than soft transparent gradients.
- Keep the base centered at the same anchor near the lower-middle of every 512 px cell.
- The base must remain readable as a walk-in activation zone large enough for three small party sprites.
- Ancient forest details: small curling root motifs at the left and right edges, a few moss-green leaves, tiny pale-gold glints.
- Crystal details: four small cyan diamond markers around the ellipse and broken concentric rune arcs.
- No physical stone structure; effect-only overlay.

SIX-FRAME ACTIVATION:
1. Dormant response: only a few cyan cracks and four dim points appear in a small elliptical footprint; one or two leaves lift from the floor.
2. Rune ignition: broken cyan elliptical arcs trace outward; four diamond markers light one by one; thin root-shaped lines glow at the sides.
3. Portal opening: inner ellipse fills with deep teal-blue energy and a bright rim; short vertical light streaks begin rising from the rear half of the circle.
4. Light column rising: a clear cyan column grows upward from the ellipse, with layered pixel bands, floating diamond motes, and upward leaves. The floor center remains visibly deep teal, like magical depth.
5. Stable return gate A: fully active wide floor portal with bright double elliptical rim, deep cyan center, tall contained light column, four cardinal crystal markers, and restrained particles. No explosion.
6. Stable return gate B: same completed structure and anchor as frame 5, but with alternating rune brightness, slightly shifted vertical streaks, and a few moved leaves/sparkles so frames 5 and 6 can loop as an idle animation.

PHYSICAL AND GAMEPLAY REQUIREMENTS:
- Clear progression: dormant -> rune trace -> energy pool -> rising column -> stable portal -> idle variant.
- Keep portal and all particles fully inside each cell with at least 30 px padding.
- Never cross cell boundaries.
- Do not make a standing circular doorway, stone arch, rectangular door, staircase, hole, water fountain, healing spring, attack area, or damaging magic.
- Do not include the Forest Seal Stone itself.
- Do not create a solid opaque white center; use layered cyan, turquoise, deep teal, and pale blue-white highlights.
- The stable portal should look inviting and safe, distinct from enemy attacks.
- No text or symbols that resemble readable letters.

COLOR:
Cyan and turquoise rune light, deep teal portal center, pale blue-white highlights, restrained warm-gold sparkles, olive/moss leaves, subtle brown root-line accents. Match the existing Project Eloria pixel scale and palette.

## 最終余白調整

初回出力では一部の光柱と粒子がセル境界に近かったため、同じデザインを参照して次の調整を行った。

```text
Preserve the exact six-frame portal design, palette, perspective, frame order, and transparent-asset intent of the reference image. Scale every portal effect down by roughly 15–20 percent and recenter it within its own 512 x 512 cell. Keep every rune arc, light column, leaf, sparkle, and particle safely inside its cell with generous empty magenta margin. Aim for at least 45 px clearance from every local cell edge. In frames 4–6, shorten and lower the vertical cyan light column so its highest visible pixel stays below local y=45 and its lowest visible pixel stays above local y=455. Do not add anything new. Keep the strict 2 x 3 layout and flat #ff00ff background.
```

最終版は各コマのアルファ領域を検査し、セル境界をまたぐ要素がないことを確認済み。
