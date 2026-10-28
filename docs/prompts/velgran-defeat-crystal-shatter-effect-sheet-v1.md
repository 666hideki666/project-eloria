# ヴェルグラン「撃破・結晶破砕」エフェクト v1

## 生成方式

- Codex 内蔵 ImageGen
- 追加のAPI課金なし
- 参照素材:
  - `assets/sprites/bosses/velgran/velgran-defeat-collapse-sheet-v1.png`
  - `assets/effects/bosses/velgran/velgran-ganju-tosai-impact-effect-sheet-v1.png`
  - `assets/effects/bosses/velgran/velgran-shohen-tobashi-crystal-projectile-effect-sheet-v1.png`

## 出力仕様

- 16ビット風ピクセルアート
- 2行×3列、全6コマ
- 結晶の光と破片だけのエフェクト素材
- 背景色: `#ff00ff` の単色クロマキー
- 実装用PNGはクロマキーを除去した透過版

## コマ構成

1. 結晶核の中心に細い亀裂光が走る
2. 亀裂が広がり、小さな破片が浮く
3. 結晶殻が弾け、放射状の閃光が走る
4. 最大破砕。多数の結晶片が外へ飛び散る
5. 閃光が消え、破片だけが落ちながら暗くなる
6. わずかな光粒と小片だけが残って消える

## 実装上の想定

- `velgran-defeat-collapse-sheet-v1.png` の胸部結晶核へ重ねる
- 1〜4コマ目は本体撃破モーションと同期
- 5〜6コマ目で光と破片だけを消し、本体の倒れた姿は残す
- 本体・地面・影・UIはこの素材に含めない

## 生成プロンプト

```text
Create one 16-bit fantasy action-RPG pixel-art VFX sprite sheet for the defeat of the boss 森晶獣ヴェルグラン (Velgran). This is an EFFECT-ONLY sheet: show only cyan-white crystal light, angular crystal fragments, cracks, sparks, and fading particles. Absolutely no boss body, creature, character, floor, shadow, UI, text, labels, borders, or visible grid lines.

Layout must be exactly 6 distinct animation frames in a strict 2-row by 3-column arrangement, evenly spaced and centered within equal cells. Maintain the same centered scale across frames so the effect overlays the glowing crystal core in the referenced defeat animation. Each frame is a clear temporal progression:
1) compact thin cyan-white crack-star at the center, restrained and small;
2) brighter growing internal fracture with several small angular cyan shards;
3) crystal core shell bursts outward, sharp cyan-white radial flash and angular fragments;
4) maximum shatter, a large but readable circular/radial burst with many crystalline pieces, never filling the whole cell with fog or haze;
5) fragments drift and fall outward while dimming; main ring/flash is gone;
6) only a few tiny fading cyan sparkles and dim fragments remain, almost empty.

Use a limited 16-bit palette: luminous cyan, pale ice blue, white highlights, deep teal outlines, and a little muted gray. Crisp hard pixel clusters, deliberate stepped diagonals, no anti-aliased painterly glow, no soft blur, no gradients that look modern. Match the pixel density and crystal color language of the references, but create a new defeat-shatter sequence. Do not include magenta anywhere in the effect subject.

Background must be one perfectly flat, exact solid #ff00ff chroma-key color across the entire canvas, including every cell. No checkerboard, no transparency preview, no black background, no texture, no shadows on the background.
```
