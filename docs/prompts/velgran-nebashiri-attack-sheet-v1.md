# ヴェルグラン「根走り」本体モーション v1

## 生成方式

- Codex 内蔵 ImageGen
- 追加のAPI課金なし
- 参照画像:
  - `assets/sprites/bosses/velgran/velgran-direction-walk-sheet-v1.png`
  - `assets/sprites/bosses/velgran/velgran-key-pose-sheet-v1.png`

## 出力仕様

- 16ビット風ピクセルアート
- 正面向き
- 2行×3列、全6コマ
- 本体モーションのみ
- 背景色: `#ff00ff` の単色クロマキー
- 根の予告線、地面からの噴出、亀裂、石片、影は別素材

## コマ構成

1. 警戒した通常姿勢
2. 肩を上げ、両前肢を内側へ構える溜め
3. 両前肢を地面へ突き立てる
4. 両前肢を地中へ固定し、胸の結晶が強く発光する維持姿勢
5. 両前肢を引き抜く反動
6. 通常姿勢へ復帰

## 生成プロンプト

```text
Create a production-ready 16-bit pixel art sprite animation sheet for the established boss monster 森晶獣ヴェルグラン (Velgran), using the attached reference sheets to preserve the exact creature identity, palette, crystal placement, mossy stone-and-root anatomy, proportions, and sprite scale.

This sheet is the body animation for the attack 根走り (Nebashiri / Root Run). Strict layout: exactly 2 rows × 3 columns, exactly 6 separate frames, read left-to-right on the top row then left-to-right on the bottom row. Equal-size cells, generous clean spacing, every frame fully visible and centered on the same baseline. Front-facing / downward-facing top-down action-game perspective matching the references.

Frame sequence:
1. Neutral alert pose, body braced.
2. Anticipation: shoulders rise, root-like forelimbs rotate inward, chest tightens.
3. Both root-like foreclaws/hands drive sharply down toward the ground.
4. Main channel/hold pose: both forelimbs firmly planted into the ground, torso lowered, embedded chest crystal glowing cyan more strongly; powerful readable silhouette.
5. Pull-out recoil: forelimbs wrench upward from the ground, torso recoils slightly.
6. Return to stable neutral recovery pose.

BODY ONLY. Do not draw roots extending away from the monster. No traveling root lines, no floor, no ground cracks, no eruption, no debris, no dust, no particles, no attack range, no aura rings, no shadow, no platform. Those effects will be separate assets. No text, labels, arrows, borders, grid, cell lines, numbers, UI, watermark, or extra creatures.

Pixel art rules: hard-edged crisp pixels, limited cohesive 16-bit fantasy palette, no antialiasing, no blur, no painterly rendering, no 3D, no smooth vector shapes. Preserve consistent scale, center, and baseline across all six frames. The creature must not contain any pink or magenta.

Background must be one perfectly flat, uniform, exact chroma-key color #ff00ff across the entire canvas, with no texture, gradient, noise, shadow, or variation.
```

