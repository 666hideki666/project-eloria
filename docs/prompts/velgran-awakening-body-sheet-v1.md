# ヴェルグラン「登場・覚醒」本体モーション v1

## 生成方式

- Codex 内蔵 ImageGen
- 追加のAPI課金なし
- 参照素材:
  - `assets/sprites/bosses/velgran/velgran-key-pose-sheet-v1.png`
  - `assets/sprites/bosses/velgran/velgran-direction-walk-sheet-v1.png`
  - `assets/sprites/bosses/velgran/velgran-defeat-collapse-sheet-v1.png`

## 出力仕様

- 16ビット風ピクセルアート
- 正面向き
- 2行×3列、全6コマ
- 覚醒する本体モーションのみ
- 背景色: `#ff00ff` の単色クロマキー
- 実装用PNGはクロマキーを除去した透過版
- 外部の光、土埃、根の動きは別エフェクト素材

## コマ構成

1. 石像のように低く丸まった休眠状態。胸の結晶は消灯
2. 結晶が弱く点灯し、頭と根がわずかに動く
3. 頭と肩を持ち上げ、両腕を地面へつく
4. 巨体を起こし、通常の戦闘姿勢へ近づく
5. 結晶を強く輝かせて咆哮する
6. 既存の正面戦闘待機姿勢へ落ち着く

## 実装上の想定

- ボス部屋へ入った直後は1コマ目を静止表示
- 覚醒イベント開始後に2〜5コマ目を再生
- 6コマ目から通常待機アニメーションへ接続
- 結晶光、根のざわめき、土埃は次に作る別エフェクトを重ねる

## 生成プロンプト

```text
Use case: stylized-concept
Asset type: production-ready 16-bit pixel-art boss awakening body-animation sprite sheet for a top-down fantasy action RPG
Primary request: Create the entrance and awakening animation for 森晶獣ヴェルグラン (Velgran), beginning as a dormant ancient stone-and-root beast and ending in the established front-facing battle idle pose.

Reference roles:
- Reference 1 is the primary identity, body proportions, palette, front-facing battle pose, stone-mask face, antler branches, root mane, huge forearms, and cyan chest crystal.
- Reference 2 provides consistent movement anatomy and sprite scale.
- Reference 3 provides the low collapsed silhouette only as motion guidance; this new awakening must not look defeated or injured.

Preserve the exact established boss identity in every frame: gigantic quadrupedal moss-green stone-and-root guardian, layered gray stone armor plates, branch antlers, stern stone mask-like face, massive clawed forearms, tangled brown root lattice around a cyan chest crystal, no redesign and no added armor.

Strict layout: exactly 2 rows × 3 columns, exactly 6 distinct frames, read left-to-right across the top row and then left-to-right across the bottom row. Equal-size cells, generous clean spacing, every complete body fully visible. Front-facing / downward-facing top-down action-game perspective in every frame. Keep the horizontal center and ground baseline consistent. Keep the same boss scale and pixel density as the references.

Frame sequence:
1. Dormant guardian: Velgran is curled low and broad like an ancient overgrown stone monument, head bowed, forearms folded near the body, antlers and root mane settled, chest crystal completely dark teal and unlit. It must look asleep/sealed, not dead.
2. First awakening: same low body, faint cyan glow appears inside the chest crystal, fingers and roots tense slightly, head begins to lift.
3. Rising head: chest crystal becomes clearly cyan, eyes begin to glow faintly, head and shoulders lift, forearms plant firmly on the ground.
4. Body rises: massive torso pushes upward, shoulders spread, antler branches lift, both forearms brace wide, transitioning toward the normal battle silhouette.
5. Awakening roar: fully raised front-facing guardian throws its head slightly upward and opens its mouth in a powerful roar, chest crystal shines strongly, forearms spread and body tense.
6. Battle ready: settles into the exact established front-facing combat idle stance from the references, mouth closed, stern eyes, cyan core at normal stable brightness.

BODY ANIMATION ONLY. The cyan core and eye illumination are part of the body, but do not draw any external aura or effect. No energy rings, rays, sparkles, floating particles, dust clouds, loose debris, floor cracks, roots growing across the floor, ground, platform, cast shadow, heroes, UI, text, labels, arrows, numbers, borders, grid lines, cell dividers, watermark, extra creatures, or scene background. A separate effect sheet will provide the crystal glow, root movement, and dust.

Style: crisp hard-edged 16-bit era fantasy pixel art, limited cohesive palette, strong readable boss silhouette, deliberate pixel clusters and stepped diagonals, no antialiasing, no blur, no painterly rendering, no 3D, no smooth vector shapes. Preserve the exact green, brown, gray-stone, and cyan palette. The creature must not contain pink or magenta.

Background: one perfectly flat, completely uniform exact solid #ff00ff chroma-key color across the entire canvas, including every cell. No texture, gradient, noise, floor plane, lighting variation, reflection, shadow, checkerboard, or transparency preview.
```
