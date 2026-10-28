# ヴェルグラン「晶片飛ばし」本体モーション v1

## 生成方式

- Codex 内蔵 ImageGen
- 追加のAPI課金なし
- 参照素材:
  - `assets/sprites/bosses/velgran/velgran-direction-walk-sheet-v1.png`
  - `assets/sprites/bosses/velgran/velgran-key-pose-sheet-v1.png`
  - `assets/sprites/bosses/velgran/velgran-nebashiri-attack-sheet-v1.png`

## 出力仕様

- 16ビット風ピクセルアート
- 正面向き
- 2行×3列、全6コマ
- 本体モーションのみ
- 背景色: `#ff00ff` の単色クロマキー
- 晶片、発射光、軌跡、着弾は別素材

## コマ構成

1. 警戒した通常姿勢
2. 上体を起こして胸の結晶へ力を集める
3. 両腕で胸の結晶を囲む最大溜め
4. 両腕を大きく外へ振り、扇状に放つ発射姿勢
5. 発射後の反動
6. 通常姿勢へ復帰

## 生成プロンプト

```text
Use case: stylized-concept
Asset type: production-ready 16-bit pixel art boss body-animation sprite sheet for a top-down fantasy action RPG
Primary request: Create the body animation for 森晶獣ヴェルグラン's ranged attack 晶片飛ばし (Shōhen Tobashi / Crystal Shard Fan), preserving the exact established creature identity from the attached references: mossy green stone-and-root body, branch antlers, stone mask-like face, large cyan chest crystal, proportions, palette, and sprite scale.

Strict layout: exactly 2 rows × 3 columns, exactly 6 distinct frames, read left-to-right across the top row then left-to-right across the bottom row. Equal-size cells, generous clean spacing, every frame fully visible and centered on the same baseline. Front-facing / downward-facing top-down action-game perspective matching the references.

Attack concept: Velgran gathers crystal energy in the chest, folds both massive forearms inward across the crystal, then forcefully sweeps both arms outward to launch a fan of crystal shards toward the player. This sheet contains only the boss body; projectile shards and launch flashes will be separate assets.

Frame sequence:
1. Neutral alert stance, firmly braced.
2. Charge begins: torso rises slightly, shoulders draw back, cyan chest crystal brightens.
3. Maximum anticipation: both massive forearms cross inward protectively around the chest crystal, body compressed, crystal at brightest charge.
4. Release pose: both arms sweep sharply outward and slightly forward in a broad fan-launch gesture, chest thrust forward, strong readable silhouette. This is the projectile spawn timing.
5. Recoil: arms remain wide but lower, torso rocks backward slightly after the release.
6. Return to stable neutral recovery pose.

BODY ONLY. Do not draw any flying crystal shards, projectiles, launch trails, beams, impact effects, particles, attack cones, range indicators, floor, cracks, debris, aura rings, shadows, platforms, or extra creatures. No text, labels, arrows, numbers, borders, grid lines, cell dividers, UI, or watermark.

Style: crisp hard-edged 16-bit pixel art, limited cohesive fantasy palette, clear readable silhouettes, no antialiasing, no blur, no painterly rendering, no 3D, no smooth vector shapes. Preserve consistent character scale, center, and baseline across all six frames. The creature must not contain pink or magenta.

Background: one perfectly flat, completely uniform exact #ff00ff chroma-key color over the entire canvas. No texture, gradient, noise, lighting variation, floor plane, reflection, or shadow.
```

