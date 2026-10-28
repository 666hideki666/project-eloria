# ELORIA タイトルロゴ v2（確認待ち）

2026-10-16、ユーザーは `PROJECT` をタイトルから外し、金色以外を希望。ゲームのタイトル表記は `ELORIA` のみ。背景 `assets/concepts/title/project-eloria-title-key-art-v2.png` は採用済み。ロゴは未承認・未実装。

- 透過PNG：`assets/concepts/title/eloria-title-logo-transparent-v2.png`（alpha 確認済み）
- 配置見本：`assets/concepts/title/eloria-title-placement-preview-v2.png`
- 生成方式：組み込み画像生成ツール。ロゴ本体は `transparent_background: true`、配置見本は `false`。
- 注意：配置見本は画像生成による概念図。実装では採用背景と透過ロゴを独立レイヤーで使う。旧 `PROJECT ELORIA` 金色案は不採用。

## ロゴの最終プロンプト

> Use case: logo-brand. Asset type: separate transparent PNG title wordmark to overlay on a wide mythic ancient-forest fantasy game artwork. Exact text, verbatim and only once: 'ELORIA' (E-L-O-R-I-A). No 'PROJECT', no subtitle, no other words, letters, runes, or numerals. Make a single-line, graceful, highly legible original fantasy serif wordmark with restrained mythic elegance and strong mobile-size readability. Color: luminous moonlit pearl and cool silver with subtle deep teal / cyan crystal accents and dark blue-green edge contrast. Absolutely NO gold, yellow, orange, brass, bronze, or warm metallic tones. Suggest an ancient forest and crystal world through extremely subtle crystal facets or root filigree woven around the baseline, but do not obstruct, deform or replace any letter. Centered wide horizontal layout with transparent padding around every edge. Truly transparent background with clean alpha, not checkerboard, not black, not a tinted panel, not a scene. No frame, plaque, characters, button, forest, watermark, or mockup. This is the title 'ELORIA' alone, not a project label.

## 配置見本の最終プロンプト

> Use case: compositing. Image 1 is the user-approved landscape key art for the ELORIA title screen (edit target). Image 2 is the new exact transparent silver-and-teal ELORIA wordmark (insert asset). Make a placement PREVIEW only. Preserve image 1's entire ancient forest, crystal cave, guardian-shaped roots, waterfalls, exact three adventurers, lighting, and framing; do not redesign the environment or people. Insert exactly one copy of image 2's existing wordmark centered in the dark upper-middle canopy, about 40–45% of image width, leaving comfortable space around it and leaving the cave entrance unobstructed. Preserve the wordmark's exact six letters E L O R I A and its cool silver/teal palette; absolutely no PROJECT, no gold, no extra text. Do not add a button or other UI yet. Output is an opaque placement mockup; the separate original logo stays transparent.
