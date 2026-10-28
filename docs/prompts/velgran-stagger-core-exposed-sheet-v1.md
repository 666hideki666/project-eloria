# ヴェルグラン「ひるみ・弱点結晶露出」モーション v1

## 生成方式

- Codex 内蔵 ImageGen
- 追加のAPI課金なし
- 参照素材:
  - `assets/sprites/bosses/velgran/velgran-direction-walk-sheet-v1.png`
  - `assets/sprites/bosses/velgran/velgran-key-pose-sheet-v1.png`
  - `assets/sprites/bosses/velgran/velgran-ganju-tosai-attack-sheet-v1.png`

## 出力仕様

- 16ビット風ピクセルアート
- 正面向き
- 2行×3列、全6コマ
- 本体モーションのみ
- 背景色: `#ff00ff` の単色クロマキー
- ヒット光、ダメージ数字、石片、床、影は含めない

## コマ構成

1. 結晶核を根の胸当てで守った通常姿勢
2. 強い攻撃を受けて上体がよろめく
3. 低く崩れ、胸当ての根が左右へ開き始める
4. 結晶核が完全に露出した弱点状態A
5. 結晶の光が脈動する弱点状態B
6. 根の胸当てを閉じながら立ち直り始める

## 実装上の想定

- 1〜3コマ目: ひるみ導入
- 4〜5コマ目: 弱点露出中のループ
- 6コマ目: 復帰導入
- 2〜3回の弱点露出で決着する短めのボス戦を想定

## 生成プロンプト

```text
Use case: stylized-concept
Asset type: production-ready 16-bit pixel art boss vulnerability animation sprite sheet for a top-down fantasy action RPG
Primary request: Create 森晶獣ヴェルグラン's stagger and exposed-weak-core animation, preserving the exact established creature identity from the attached references: mossy green stone-and-root body, branch antlers, stone mask-like face, huge forearms, cyan chest crystal, root lattice around the chest, proportions, palette, and sprite scale.

Gameplay concept: after enough damage or after a major attack, Velgran staggers. The protective root lattice around the chest crystal pulls apart and opens, making the cyan crystal core larger, brighter, and clearly vulnerable. The vulnerable state should be readable instantly without changing the monster into a different form.

Strict layout: exactly 2 rows × 3 columns, exactly 6 distinct frames, read left-to-right across the top row then left-to-right across the bottom row. Equal-size cells, generous clean spacing, each complete body fully visible and centered on the same baseline. Front-facing / downward-facing top-down action-game perspective matching the references.

Frame sequence:
1. Normal guarded stance: stable posture, root lattice snug around the chest crystal.
2. Heavy hit recoil: head snaps slightly back, shoulders twist, one forearm loses balance, torso jolts.
3. Collapse into stagger: body drops low onto both forearms, head bowed, stone shoulder plates loosen; chest root lattice begins splitting left and right.
4. Weak core exposed A: kneeling/slumped and stunned, both forearms planted wide, protective roots fully peeled apart to the sides, a visibly larger bright cyan crystal core protrudes from the chest. This is the main vulnerable frame.
5. Weak core exposed B: same size, pose, and open root-lattice state as frame 4, but the crystal pulse/highlight changes slightly and the body gives a tiny weak tremor. Frames 4 and 5 must form a seamless two-frame vulnerable-state loop.
6. Recovery begins: head lifts, arms brace, split root lattice starts closing back toward the crystal, core glow becomes less intense; still not fully standing.

Visual priorities:
- The chest crystal is already visible in the normal design, so the exposed version must be unmistakably more vulnerable: root cage pulled far apart, crystal visibly larger/protruding, brighter cyan-white center, body slumped and unable to attack.
- Preserve the original crystal color and monster design.
- Keep frames 4 and 5 nearly identical in body silhouette for a clean looping vulnerable state.

BODY ONLY. No impact flash, damage numbers, hit sparks, flying debris, dust, particles, aura rings, floor, cracks, blood, projectiles, shadows, platform, UI, text, labels, arrows, numbers, borders, grid lines, cell dividers, watermark, or extra creatures.

Style: crisp hard-edged 16-bit pixel art, limited cohesive fantasy palette, readable combat silhouette, no antialiasing, no blur, no painterly rendering, no 3D, no smooth vector shapes. Preserve consistent scale, center, and baseline. The creature must not contain pink or magenta.

Background: one perfectly flat, completely uniform exact #ff00ff chroma-key color across the entire canvas. No texture, gradient, noise, floor plane, lighting variation, reflection, or shadow.
```

