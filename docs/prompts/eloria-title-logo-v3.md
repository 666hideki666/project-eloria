# ELORIA タイトルロゴ v3（確認待ち）

ユーザーは v2 の銀白・青緑ロゴを「ギラギラしすぎて違う」と評価。2026-10-17に発光・晶石装飾・金属感を抑えた新案を作成。背景は採用済み、v3 ロゴは未承認・未実装。

- 透過PNG：`assets/concepts/title/eloria-title-logo-transparent-v3.png`（alpha 確認済み）
- 配置見本：`assets/concepts/title/eloria-title-placement-preview-v3.png`
- 方式：組み込み画像生成ツールを使用。ロゴ本体 `transparent_background: true`、配置見本 `false`。見本は概念図であり、実装では採用背景と透過ロゴを別レイヤーにする。

## ロゴの最終プロンプト

> Use case: logo-brand. Asset type: transparent PNG title wordmark for the fantasy adventure game ELORIA, to sit quietly over a rich mythic forest-and-crystal painting. Text, exactly and only: 'ELORIA' — six letters E L O R I A, one line, no other text. Direction: understated, mature, atmospheric, and elegant; the previous glossy silver-and-cyan crystal logo was far too flashy. Create a refined high-legibility fantasy serif letterform with a subtle hand-cut / old-book quality and generous letter spacing. Matte pale moonstone gray, muted misty blue-gray, and the faintest cool sage undertone; the lettering should feel softly lit by forest moonlight rather than glowing from within. Very restrained depth and lightly weathered pigment, nearly flat. Large calm letter shapes readable on a landscape phone. If any motif appears, limit it to one very thin low-contrast root or crescent-like stroke below the lettering; ideally no ornaments at all. Centered wide horizontal layout with clean transparent padding. Background must be genuinely transparent alpha. Absolutely no sparkle, glitter, bright cyan gems, embedded crystal facets, starbursts, shine, metallic sheen, gold, chrome, bevel, neon, outer glow, 3D extrusion, ornate tendrils, decorative swashes, plaque, border, scene, characters, button, subtitle, PROJECT, extra glyphs or watermark.

## 配置見本の最終プロンプト

> Use case: compositing. Image 1 is the APPROVED ELORIA ancient forest title background (edit target). Image 2 is the new subdued matte gray transparent ELORIA wordmark (insert asset). Make an exact placement preview only, preserving the background scenery, three canonical heroes, guardian-like root formation, crystal cave, waterfalls, lighting and landscape framing as closely as possible. Place the supplied wordmark once in the upper-middle dark canopy, centered at about 40–45% width; keep its six letters E L O R I A exactly, its quiet matte blue-gray stone finish, and its clean simple form. The logo must be readable but deliberately restrained, not glowing, metallic, sparkling or ornate. Do not reintroduce decorative crystals, starbursts, gold, PROJECT, subtitles, buttons, borders or any other UI. This is a visual mockup only; the separate logo remains transparent.
