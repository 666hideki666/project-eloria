# ヴェルグラン「結晶崩壊・撃破」本体モーション v1

## 生成方式

- Codex 内蔵 ImageGen
- 追加のAPI課金なし
- 参照素材:
  - `assets/sprites/bosses/velgran/velgran-stagger-core-exposed-sheet-v1.png`
  - `assets/sprites/bosses/velgran/velgran-key-pose-sheet-v1.png`
  - `assets/sprites/bosses/velgran/velgran-direction-walk-sheet-v1.png`

## 出力仕様

- 16ビット風ピクセルアート
- 正面向き
- 2行×3列、全6コマ
- 本体モーションのみ
- 背景色: `#ff00ff` の単色クロマキー
- 結晶の爆発光、飛散する破片、土煙は別素材

## コマ構成

1. 弱点結晶核に最後の亀裂が入る
2. 結晶核の衝撃で上体が大きく反る
3. 力を失い、頭と肩が沈む
4. 両腕を広げながら前へ崩れる
5. 地面へ完全に倒れた撃破状態
6. 同じ姿勢で完全に動かなくなる最終状態

## 実装上の想定

- 1〜4コマ目: 撃破演出
- 5コマ目: 着地
- 6コマ目: 撃破後に残す静止状態
- 結晶破片や光の消滅は別エフェクトを重ねる

## 生成プロンプト

```text
Use case: stylized-concept
Asset type: production-ready 16-bit pixel art boss defeat body-animation sprite sheet for a top-down fantasy action RPG
Primary request: Create 森晶獣ヴェルグラン's final defeat animation, continuing naturally from the attached exposed-weak-core animation. Preserve the exact established creature identity: mossy green stone-and-root body, branch antlers, stone mask-like face, huge forearms, root lattice, cyan chest crystal, proportions, palette, and sprite scale.

Story and motion: the exposed cyan crystal core suffers a final internal fracture. Velgran arches from the shock, loses strength, drops heavily onto its forearms, then collapses forward into a broad motionless mound of ancient roots and stone. The ending should feel solemn and powerful, not bloody or grotesque. The core remains physically present but cracked and dim.

Strict layout: exactly 2 rows × 3 columns, exactly 6 distinct frames, read left-to-right across the top row then left-to-right across the bottom row. Equal-size cells, generous clean spacing, every complete body fully visible. Front-facing / downward-facing top-down action-game perspective matching the references. Keep the center and ground baseline consistent until the natural forward collapse changes the silhouette.

Frame sequence:
1. Final weak-core hit: Velgran remains low and vulnerable; the exposed cyan chest crystal shows one clear bright internal crack, body tenses.
2. Shock arch: head and shoulders jerk upward, forearms spread, cracked crystal flashes white-cyan; roots around the core lose tension.
3. Strength fails: head bows, shoulders sink, one forearm buckles, antler branches tilt, core light becomes uneven.
4. Heavy forward collapse: massive torso drops toward the ground, both arms splay outward, face lowers, body becomes wider and flatter.
5. Fully defeated: broad collapsed body resting face-down/forward, limbs motionless, roots and stone plates settled, chest core visibly fractured and much dimmer.
6. Final still state: same collapsed silhouette as frame 5 with only a subtle final dimming of the cracked cyan core; designed to remain on screen after the animation ends.

Visual priorities:
- Frames 5 and 6 must clearly read as the same permanent defeated body, with no signs of standing back up.
- The cracked core must remain visible, dim cyan rather than disappearing.
- The final body should be wide and low but still recognizably Velgran.
- No gore, blood, severed anatomy, skeleton, or gruesome damage.

BODY ONLY. Do not draw an explosion, flying crystal pieces, loose debris, dust clouds, energy rings, particles, floor cracks, ground, shadows, platform, victory text, treasure, heroes, UI, labels, arrows, numbers, borders, grid lines, cell dividers, watermark, or extra creatures. A separate effect sheet will provide the crystal burst and settling debris.

Style: crisp hard-edged 16-bit pixel art, limited cohesive fantasy palette, readable boss-scale silhouette, no antialiasing, no blur, no painterly rendering, no 3D, no smooth vector shapes. Preserve consistent scale and visual identity. The creature must not contain pink or magenta.

Background: one perfectly flat, completely uniform exact #ff00ff chroma-key color across the entire canvas. No texture, gradient, noise, floor plane, lighting variation, reflection, or shadow.
```

