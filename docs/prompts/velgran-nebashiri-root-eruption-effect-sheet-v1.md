# ヴェルグラン「根走り」根噴出エフェクト v1

## 生成方式

- Codex 内蔵 ImageGen
- 追加のAPI課金なし
- 参照素材:
  - `assets/effects/bosses/velgran/velgran-ganju-tosai-impact-effect-sheet-v1.png`
  - `assets/sprites/bosses/velgran/velgran-nebashiri-attack-sheet-v1.png`

## 出力仕様

- 16ビット風ピクセルアート
- 2行×3列、全6コマ
- 左から右へ伸びる再利用可能な根の噴出区間
- ゲーム側で攻撃方向へ回転させて使用
- 背景色: `#ff00ff` の単色クロマキー
- ヴェルグラン本体、床、UI、影は含めない

## コマ構成

1. 細いシアン色の亀裂による安全な予告
2. 明るく太くなった直前予告
3. 根の先端と小石が噴き出す発生
4. 根・石片・晶力が最大になるダメージ判定
5. 根が地上へ残る危険状態
6. 根が崩れて亀裂が消える収束

## 生成プロンプト

```text
Use case: stylized-concept
Asset type: production-ready 16-bit pixel art combat VFX sprite sheet for a top-down fantasy action RPG
Primary request: Create the separate ground effect animation for the boss attack 根走り (Nebashiri / Root Run), matching the established Velgran sprite and the attached impact-effect reference.

Strict layout: exactly 2 rows × 3 columns, exactly 6 distinct animation frames, read left-to-right across the top row then left-to-right across the bottom row. Equal-size cells with generous empty space. Every effect must be fully contained inside its cell and centered on the same horizontal axis.

The effect is one reusable elongated root-eruption segment viewed from a top-down / slightly elevated action-game perspective. Keep its direction horizontal from left to right so the game can rotate the sprite toward the target.

Frame sequence:
1. Safe telegraph: a thin, faint cyan dotted fissure line glowing beneath the ground path; clearly visible but not dangerous.
2. Strong telegraph: the cyan fissure becomes brighter and wider with a few tiny lifted stone pixels; imminent danger.
3. Initial eruption: the first brown root tips and small stones burst upward along the glowing line.
4. Maximum damaging eruption: a continuous jagged ridge of thick dark-brown roots, thorn-like branches, cracked stones, and cyan crystal energy bursts upward along the full line; this is the clearest and largest frame.
5. Dangerous hold: the root ridge remains raised but settles slightly, with reduced cyan energy and a few falling stones.
6. Collapse: the roots retract and crumble into short broken root stubs, fading cyan cracks, and a few settling pixels.

Visual identity: ancient forest ruins, gnarled dark-brown roots with mossy green accents, muted gray stone fragments, restrained cyan crystal glow matching Velgran. Crisp hard-edged 16-bit pixel art, limited cohesive palette, readable silhouette, no antialiasing, no blur, no painterly texture, no smooth vector rendering, no 3D.

EFFECT ONLY. Do not include Velgran, heroes, enemies, floor tiles, circular arena, UI, attack cone, arrows, text, labels, numbers, borders, grid lines, cell dividers, watermark, cast shadow, or platform. The effect must not contain pink or magenta.

Background: one perfectly flat, completely uniform exact #ff00ff chroma-key color over the entire canvas. No texture, gradient, noise, floor plane, lighting variation, or shadow in the background.
```

