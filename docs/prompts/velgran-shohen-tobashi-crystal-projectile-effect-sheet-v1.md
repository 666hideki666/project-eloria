# ヴェルグラン「晶片飛ばし」晶片エフェクト v1

## 生成方式

- Codex 内蔵 ImageGen
- 追加のAPI課金なし
- 参照素材:
  - `assets/sprites/bosses/velgran/velgran-shohen-tobashi-attack-sheet-v1.png`
  - `assets/effects/bosses/velgran/velgran-ganju-tosai-impact-effect-sheet-v1.png`
  - `assets/effects/bosses/velgran/velgran-nebashiri-root-eruption-effect-sheet-v1.png`

## 出力仕様

- 16ビット風ピクセルアート
- 2行×3列、全6コマ
- 左から右へ飛ぶ単体の晶片
- ゲーム側で複数コピーを角度違いに発射して扇状攻撃を構成
- 背景色: `#ff00ff` の単色クロマキー
- ボス本体、床、敵味方、攻撃範囲は含めない

## コマ構成

1. 小さな菱形の発生光
2. 短い晶片が形成される
3. 完成した晶片の飛翔A
4. 完成した晶片の飛翔B
5. 晶片が複数の破片へ砕ける
6. 小さな光片だけが残って消滅する

## 生成プロンプト

```text
Use case: stylized-concept
Asset type: production-ready 16-bit pixel art projectile VFX sprite sheet for a top-down fantasy action RPG
Primary request: Create one reusable animated crystal-shard projectile for 森晶獣ヴェルグラン's attack 晶片飛ばし (Crystal Shard Fan), matching the cyan crystal energy and pixel-art rendering of the attached Velgran assets.

Important implementation concept: this sheet depicts ONE projectile only. The game will spawn several copies at different angles to form a fan. Keep the projectile pointing horizontally from left to right in every frame so it can be rotated cleanly toward any firing angle.

Strict layout: exactly 2 rows × 3 columns, exactly 6 distinct animation frames, read left-to-right across the top row then left-to-right across the bottom row. Equal-size cells, generous empty space, each frame fully contained, centered on the same position and horizontal axis. Consistent projectile scale.

Frame sequence:
1. Spawn flash: a small compact cyan-white diamond spark, just beginning to form.
2. Formation: a short sharp crystal shard emerges, with a restrained cyan energy flare behind it.
3. Full flight A: one long faceted cyan crystal shard pointing right, bright white leading tip, short pixel trail behind; clean readable projectile silhouette.
4. Full flight B: same size and position as frame 3, with the internal highlight and tiny trailing pixels shifted for a two-frame flight loop.
5. Breakup: the shard cracks into three or four angular crystal pieces, forward momentum still pointing right.
6. Dissolve: only a few small cyan fragments and dim sparkling pixels remain, fading out.

Style and materials: hard-edged crisp 16-bit pixel art, limited cyan, pale-blue, white, deep-teal, and tiny muted stone-gray accents. Faceted magical crystal, bright but not neon-overexposed, readable at small gameplay scale. No antialiasing, no blur, no glow haze, no painterly rendering, no 3D, no smooth vector shapes.

PROJECTILE EFFECT ONLY. Exactly one shard/projectile per cell, except its own breakup fragments in frames 5–6. Do not draw a fan of multiple projectiles, Velgran, heroes, enemies, targets, floor, ground cracks, roots, stones, impact burst, attack cone, range indicator, circles, shadows, platforms, UI, text, labels, arrows, numbers, borders, grid lines, cell dividers, or watermark. The projectile must not contain pink or magenta.

Background: one perfectly flat, completely uniform exact #ff00ff chroma-key color across the entire canvas. No texture, gradient, noise, floor plane, lighting variation, reflection, or shadow.
```

