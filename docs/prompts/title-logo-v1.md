# タイトルロゴ v1（ユーザー確認待ち）

背景 `assets/concepts/title/project-eloria-title-key-art-v2.png` は2026-10-16にユーザー採用。ロゴと配置はまだユーザー確認待ち、ゲームUIには未実装。

- 独立した透過PNG：`assets/concepts/title/project-eloria-title-logo-transparent-v1.png`
- 背景への配置見本：`assets/concepts/title/project-eloria-title-placement-preview-v1.png`
- 生成方法：組み込み画像生成ツール。ロゴは `transparent_background: true`、見本は `false`。ロゴPNGの alpha を確認済み。
- 正式表記：`PROJECT ELORIA`（既存の `README.md`、`index.html` に照合）。見本は配置確認専用であり、実装時は背景と透過ロゴを別レイヤーで重ねる。

## ロゴ生成の最終プロンプト

> Use case: logo-brand. Asset type: isolated transparent PNG game title wordmark for a premium fantasy action RPG, designed to be layered over a separately approved mythic ancient-forest painting. Primary request: create the game title logo with the EXACT English text on two centered lines: small upper line 'PROJECT'; large dominant lower line 'ELORIA'. Spell the lower line E-L-O-R-I-A, exactly once. No other words, subtitle, numerals, extra lettering, pseudo-runes, or stray glyphs. Style/medium: highly legible bespoke mythic-fantasy serif typography, regal yet restrained and modern-polished rather than retro pixel art or heavy medieval clip art. Refined antique ivory and softly luminous warm gold letter faces with subtle weathered-metal depth, precise dark-blue-green fine edging and sparse teal crystal-light accents to echo a forest and crystal ruin. A very delicate root-and-crystal ornamental flourish may support the wordmark but must not compete with or distort any letter. Composition: horizontal centered logo, compact two-line hierarchy, generous transparent breathing room on all sides, strong silhouette that reads at landscape phone size. The whole design must be truly isolated on a fully transparent background with clean antialiased alpha edges; absolutely no opaque field, plaque, gradient rectangle, mockup, painted background, forest, characters, water, dark canvas, checkerboard pattern, or frame. Exact text only: PROJECT / ELORIA. No watermark.

## 配置見本生成の最終プロンプト

> Use case: compositing. Image 1 is the approved landscape title-screen background illustration, the edit target. Image 2 is the newly created transparent PROJECT ELORIA title wordmark, the exact insert asset. Create a clean title-screen placement PREVIEW, not a redesign: preserve Image 1's forest, cave, guardian-shaped root, waterfall, crystals, three named adventurers, lighting, camera framing and overall pixel dimensions/composition. Place exactly one copy of the supplied wordmark from Image 2 centered in the dark upper-middle canopy area above the cave, around 42% of the image width, leaving air around it and not covering the three people or the crystal cave opening. Preserve the logo's exact text, letterforms, colors, transparency treatment and ornamentation as given; do not redraw, misspell, warp or add letters. No start button yet, no other UI, no subtitles, no borders, no watermark. The result is an opaque visual placement preview; the separately delivered title wordmark remains a transparent PNG asset.
