# ヴェルグラン専用「森晶の封印台座」v1

## 生成方式

- Codex 内蔵 ImageGen
- 追加のAPI課金なし
- 参照素材:
  - `assets/concepts/environments/crystal-dungeon-01/crystal-altar-guardian-battle-v1.png`
  - `assets/sprites/bosses/velgran/velgran-awakening-body-sheet-v1.png`
  - `assets/concepts/environments/moss-root-ruins/tiles/moss-root-ruins-core-terrain-design-board-v1.png`

## 出力仕様

- 16ビット風ピクセルアート
- 見下ろし斜め視点の大型環境オブジェクト
- 中央へ休眠中のヴェルグランを配置できる広い空間
- 円形石造台座、巨大な根、結晶柱、苔を一体化
- 背景色: `#ff00ff` の単色クロマキー
- 実装用PNGはクロマキーを除去した透過版

## デザイン構成

- 2〜3重の円環と幾何学的な封印線を刻んだ古代石床
- 中央はボスの視認性を優先した静かな石床
- 外周と奥側へ太い古木の根を編み込む
- 周囲の石柱に青緑色の結晶を配置
- 石床の一部に淡い青緑の鉱脈
- 苔、若葉、崩れた小石で森の遺跡らしさを追加
- 正面側には戦闘後も通行できる開口を残す

## 実装上の想定

- ボス本体より下へ置く背景・床レイヤー
- 休眠時と戦闘中の両方で使用
- 中央に `velgran-awakening-body-sheet-v1.png` を配置
- 高い結晶柱と根は外周だけにあり、ボス本体を隠さない
- 根の開放アニメーションを追加する場合は別の前景素材として作成する

## 生成プロンプト

```text
Use case: stylized-concept
Asset type: production-ready 16-bit pixel-art environmental object for a top-down fantasy action RPG boss room
Primary request: Create a single ancient sealing altar/platform designed specifically for the sleeping forest crystal guardian boss 森晶獣ヴェルグラン (Velgran). It will be placed beneath the boss during the awakening scene and remain as scenery during the battle.

Reference roles:
- Reference 1 establishes the forest crystal ruin boss-room mood, circular engraved stone floor, dark ancient masonry, massive roots, moss, and cyan crystals.
- Reference 2 defines Velgran's approximate boss footprint and scale. The altar's clear center must comfortably hold the full dormant boss without showing the boss itself.
- Reference 3 establishes the reusable moss-root ruin stonework, palette, top-down perspective, pixel density, roots, columns, and cyan crystal language.

Composition: one large horizontal oval/circular ritual dais viewed in the same top-down three-quarter action-game perspective as the references. The altar should occupy most of the canvas width but have generous transparent padding. It consists of:
- a broad low ancient stone disk with 2 or 3 concentric cracked rings and subtle engraved geometric seal lines;
- a wide clear central resting area large enough for Velgran, with no tall object in the center;
- massive old brown roots woven around and partly over the outer rim like a natural seal, especially along the back and side edges, but leaving clear openings at the front-left and front-right so the arena reads as traversable after awakening;
- four low ruined stone pylons placed around the perimeter, each holding a small cyan/teal crystal shard;
- faint cyan mineral seams running through a few cracks, restrained rather than glowing everywhere;
- moss, tiny leaves, and a few small stone fragments integrated into the rim.

The silhouette must be easy to read as one boss-specific altar, not a full room or full-screen background. It should feel ancient, sacred, overgrown, and slightly ominous. The roots are a seal/cradle, not a fence and not a damaging attack. The center must remain visually calm so the large green boss sprite remains readable on top.

Layering-friendly design: the central stone disk and most roots should read as an underlay beneath the boss. Keep tall crystal pylons and thick root arches only around the outer/back edge, never crossing the central placement area. Avoid a high front wall that would hide the boss.

Style: crisp hard-edged 16-bit fantasy pixel art, limited cohesive palette, detailed but readable at gameplay scale, deliberate pixel clusters, stepped diagonals, no antialiasing, no blur, no painterly rendering, no 3D, no smooth vector shapes. Palette: dark olive-gray ruins, muted moss green, earthy brown roots, cyan/teal crystal accents, pale stone highlights. No pink or magenta in the object.

Do not draw Velgran, any monster, heroes, characters, UI, text, labels, arrows, numbers, treasure chest, doors, room walls, full arena floor, background scenery, cast shadow, watermark, border, grid lines, or multiple design variants. Exactly one isolated environmental object.

Background: one perfectly flat, completely uniform exact solid #ff00ff chroma-key color across the entire canvas. No texture, gradient, noise, floor plane, lighting variation, reflection, shadow, checkerboard, or transparency preview.
```
