# ヴェルグラン「岩樹の踏砕」攻撃シート v1

## 生成方式

- Codex組み込みImageGen（追加API課金なし）
- 既存の方向別シートと基本ポーズシートを参照
- `#ff00ff` のクロマキー背景で生成後、透過PNG化

## 参照画像

- `assets/sprites/bosses/velgran/velgran-direction-walk-sheet-v1.png`
- `assets/sprites/bosses/velgran/velgran-key-pose-sheet-v1.png`

## コマ構成

上段左から右、続いて下段左から右へ再生する。

1. 戦闘待機
2. 低く身構える予備動作
3. 両腕を持ち上げる
4. 両腕を高く掲げた最大溜め
5. 両腕を振り下ろす
6. 地面へ叩きつける攻撃判定コマ
7. 反動
8. 待機姿勢への復帰

## 最終プロンプト

Create a production-ready 8-frame boss attack animation sprite sheet for the exact established Forest Crystal Beast Velgran shown in the references.

Preserve the same creature: a massive quadrupedal forest guardian made of mossy green stone, bark and roots, with huge forelimbs, branching wooden antlers, small cyan crystal growths and one glowing cyan chest crystal. Preserve its anatomy, silhouette, palette, pixel density and top-down three-quarter FRONT/DOWN-facing gameplay perspective in every frame.

Attack: "岩樹の踏砕", a slow and extremely heavy two-fist ground smash.

STRICT LAYOUT: exactly 2 rows x 4 columns, exactly 8 isolated full-body sprites, read left-to-right across row 1 then row 2. Same scale, camera angle, center line, ground baseline and canvas footprint in every cell.

Frames:
1 neutral combat stance;
2 body crouches and shoulders pull backward;
3 both huge forelimbs begin lifting;
4 peak wind-up, torso raised high and both forelimbs overhead;
5 fast downward swing with both forelimbs descending together;
6 main impact pose, both fists planted hard on the ground and body compressed very low;
7 small upward recoil while forelimbs remain low;
8 recovery rising toward neutral.

Frame 6 is the damage timing. Clearly show heavy anticipation, one powerful impact and a short vulnerable recovery. Keep all limbs readable and consistent.

Polished 16-bit Japanese fantasy action RPG pixel art, crisp hard pixel clusters, limited palette, no smoothing or painterly rendering.

Creature body animation only. Do not include ground cracks, shockwaves, dust, rocks, magic aura, motion trails, shadows, health bars, text, labels, numbers, grid lines, borders or scenery. No cropping or overlap. Leave generous spacing.

Place everything on a perfectly flat, uniform, opaque #ff00ff chroma-key background with no gradient or texture. Do not use magenta or pink on Velgran.

