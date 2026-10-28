# ヴェルグラン「岩樹の踏砕」衝撃エフェクト v1

## 生成方式

- Codex組み込みImageGen（追加API課金なし）
- 「岩樹の踏砕」本体アニメーションを大きさと画風の参照に使用
- `#ff00ff` のクロマキー背景で生成後、透過PNG化

## 参照画像

- `assets/sprites/bosses/velgran/velgran-ganju-tosai-attack-sheet-v1.png`

## コマ構成

上段左から右、続いて下段左から右へ再生する。

1. 接地光と最初の亀裂
2. 亀裂と小さな晶力の輪が拡大
3. 衝撃波と岩片が広がる
4. 最大衝撃
5. 輪と岩片が消散
6. 薄い亀裂だけが残って消える

本体アニメーションの6コマ目を起点として、このエフェクトを再生する。

## 最終プロンプト

Create a production-ready 6-frame ground-impact visual-effects sprite sheet for the boss attack "岩樹の踏砕" used by Forest Crystal Beast Velgran.

This is an EFFECT-ONLY sheet. Do not draw Velgran or any creature. The effect is centered beneath the boss when both fists strike the floor: ancient stone cracks, heavy earth force, small mossy stone fragments, root-like fracture lines, and a restrained cyan crystal-energy shockwave matching Velgran's glowing chest core.

STRICT LAYOUT: exactly 2 horizontal rows x 3 vertical columns, exactly 6 isolated top-down effects, read left-to-right across row 1 then row 2. Every frame uses the exact same center point, camera angle, scale and square canvas footprint. Leave large clean gaps between cells.

Animation sequence:
1. Tiny cyan-white contact flash at the exact center with the first short cracks.
2. Dark brown and moss-green radial cracks spread outward; a compact cyan ring begins.
3. The cyan circular shockwave expands; 4 to 6 small stone chips lift around the center.
4. Maximum impact: widest bright broken ring, longest branching cracks, strongest stone debris.
5. Ring becomes thinner and fragmented while debris falls and the cyan light weakens.
6. Nearly faded aftermath: only faint broken cyan arcs, dim cracks and a few settling particles.

Style: polished 16-bit Japanese fantasy action RPG pixel-art VFX, crisp hard pixel clusters, limited cohesive palette, top-down gameplay view, readable at small scale. The effect must look heavy and earthy rather than like a clean magical spell. Use cyan only as a crystal-energy accent. Keep the outer shockwave circular and centered, with irregular broken edges.

No creature, no character, no weapons, no floor tile, no full ground patch, no scenery, no cast shadow, no health bars, no text, no labels, no numbers, no grid lines, no borders, no frame boxes, no smoke cloud that hides the center. Do not crop or overlap the six effects.

Place all effects over one perfectly flat, uniform, fully opaque #ff00ff chroma-key background with no gradient, lighting variation or texture. Do not use magenta or pink in the effects.

