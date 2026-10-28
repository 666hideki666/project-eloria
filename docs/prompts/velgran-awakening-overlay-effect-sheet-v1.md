# ヴェルグラン「登場・覚醒」重ねエフェクト v1

## 生成方式

- Codex 内蔵 ImageGen
- 追加のAPI課金なし
- 参照素材:
  - `assets/sprites/bosses/velgran/velgran-awakening-body-sheet-v1.png`
  - `assets/effects/bosses/velgran/velgran-nebashiri-root-eruption-effect-sheet-v1.png`
  - `assets/effects/bosses/velgran/velgran-ganju-tosai-impact-effect-sheet-v1.png`

## 出力仕様

- 16ビット風ピクセルアート
- 2行×3列、全6コマ
- 結晶光、短い根、石片、土埃だけの重ね素材
- 背景色: `#ff00ff` の単色クロマキー
- 実装用PNGはクロマキーを除去した透過版
- ヴェルグラン本体や地面は含めない

## コマ構成

1. ごく小さな光粒と休眠中の根先
2. 胸の位置に小さな結晶光、根がわずかに動く
3. 結晶光が強まり、根と小石が動き始める
4. 起き上がりに合わせて根と土埃が広がる
5. 咆哮時の最大結晶光、衝撃輪、土埃と石片
6. 光が安定し、根と埃が静かに収まる

## 実装上の想定

- `velgran-awakening-body-sheet-v1.png` と同じ2×3のセル順で重ねる
- 胸の光は各本体コマの結晶位置に合わせる
- 根と土埃は足元・前腕の接地付近へ重ねる
- 攻撃判定は持たせず、登場演出専用とする

## 生成プロンプト

```text
Use case: stylized-concept
Asset type: production-ready 16-bit pixel-art boss awakening overlay VFX sprite sheet for a top-down fantasy action RPG
Primary request: Create the external awakening effects that overlay the existing 6-frame body animation for 森晶獣ヴェルグラン (Velgran). Show ONLY magical crystal light, subtle moving roots at ground level, small stone chips, and controlled dust puffs. Do not draw any part of Velgran's body.

Reference roles:
- Reference 1 is the exact 2×3 awakening body-animation alignment. Match its six equal cells. Place chest-light effects at the corresponding chest-crystal position in each referenced frame, and place roots/dust around the corresponding forearm and ground-contact area. The body itself must remain absent.
- References 2 and 3 define the established crisp pixel style, cyan energy, brown roots, gray stone fragments, and effect density. This awakening should be less destructive than an attack.

Strict layout: exactly 2 rows × 3 columns, exactly 6 distinct frames, read left-to-right across the top row and then across the bottom row. Equal-size cells with no visible dividers. Keep all effects inside their own cells. The animation must synchronize directly with the six frames of Reference 1.

Frame sequence:
1. Dormant: almost empty. Only two or three tiny muted teal motes near the dark chest position and a few still brown root tips close to the ground.
2. First pulse: a small compact cyan-white diamond glow at the low chest position, faint thin cyan pulse arc, nearby root tips twitch upward slightly, two tiny dust pixels.
3. Rising: the chest glow moves to the higher corresponding chest position and becomes brighter; several thin brown root strands stir along the ground around both forearm positions; small muted gray-brown dust puffs begin.
4. Body lift: stronger centered cyan crystal flare with short sharp rays; roots flex outward in a low shallow arc and a restrained semicircle of dust and tiny stone chips rises from the ground-contact area.
5. Roar peak: brightest cyan-white chest flash, one broad but readable broken circular shockwave surrounding the torso area, roots flare outward at ground level, and a strong symmetrical dust burst rises near both forearms. Dramatic but not a screen-filling explosion.
6. Settled battle ready: the shockwave is gone; only a stable small cyan glint at the normal chest position, a few falling dust pixels and root tips settling flat. Nearly finished and calm.

EFFECTS ONLY. No boss body, face, hands, claws, antlers, creature silhouette, characters, floor, platform, cast shadow, UI, text, labels, arrows, numbers, borders, grid lines, cell dividers, watermark, or additional monsters. No tall root wall and no damaging spikes. The roots should look like short living strands brushing the ground, not an attack.

Style: crisp hard-edged 16-bit fantasy pixel art with deliberate pixel clusters and stepped diagonals. Limited palette: luminous cyan, pale ice-blue, white highlights, deep teal, earthy brown roots, muted gray/tan dust and small stone chips. No painterly rendering, no 3D, no soft modern bloom, no blur, no fog clouds, no smooth vector shapes, no translucent gradients. Do not use magenta in any effect subject.

Background: one perfectly flat, completely uniform exact solid #ff00ff chroma-key color across the entire canvas, including every cell. No texture, gradient, noise, floor plane, lighting variation, reflection, shadow, checkerboard, or transparency preview.
```
