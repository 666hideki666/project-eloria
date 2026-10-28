# ヴェルグラン基本ポーズシート v1 生成プロンプト

## 生成方式

- Codex組み込み画像生成
- 既存コンセプト2点を参照
- 単色マゼンタ背景で生成後、ローカル処理で透過PNG化

## 参照画像

1. `assets/concepts/monsters/guardians/forest-crystal-guardian-pixel-concept-v1.png`
   - キャラクターデザイン、体格、素材、配色の基準
2. `assets/concepts/environments/crystal-dungeon-01/crystal-altar-guardian-battle-v1.png`
   - ゲーム内のサイズ感、視点、戦闘時の雰囲気の基準

## 最終プロンプト

```text
Use case: stylized-concept
Asset type: production key-pose sprite sheet for a top-down 16-bit fantasy action RPG boss
Primary request: Create a clean game-ready key-pose sprite sheet of the exact same forest crystal guardian beast shown in Image 1, matching its identity and design. Image 2 is a scale, viewpoint, and battle-context reference only.
Subject: one massive sacred quadruped guardian beast with moss, dark bark, stone armor plates, branch antlers, heavy forelegs, and one large cyan crystal core embedded in the chest. Preserve the same silhouette, face, armor placement, colors, crystal shape, and proportions across every cell.
Style/medium: crisp hand-authored 1990s 16-bit JRPG pixel art, limited palette, sharp pixel clusters, no antialiasing, no painterly rendering, no modern 3D
Composition: a strict 4 columns by 3 rows sprite sheet with twelve evenly sized cells, generous equal padding, no overlap, every full body visible, consistent scale and ground contact. Top-down three-quarter game view matching the player sprites.
Pose order:
Row 1: idle facing down, idle facing left, idle facing right, idle facing up.
Row 2: heavy walk step, foreleg raised for stomp, foreleg impact stomp, roots erupting from the ground.
Row 3: crystal shard launch, front-leg stone armor cracked, knocked down with chest core exposed, calm resting pose after defeat.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background, one uniform color only.
Constraints: no labels, no grid lines, no text, no UI, no scenery, no floor plane, no cast shadow, no contact shadow, no reflection, no watermark. Do not use #ff00ff anywhere in the creature or effects. Each cell must show the same creature, not variants or multiple species. Roots and shards stay inside their own cell. Keep edges crisp and fully separated from the background.
Avoid: realistic painting, soft lighting, beige paper, concept-art annotations, white background, inconsistent horns, missing crystal core, bipedal stance, cropped limbs, extra creatures.
```

## 保存ファイル

- 透過済み：`assets/sprites/bosses/velgran/velgran-key-pose-sheet-v1.png`
- 元のクロマキー版：`assets/sprites/bosses/velgran/velgran-key-pose-sheet-v1-chroma.png`
