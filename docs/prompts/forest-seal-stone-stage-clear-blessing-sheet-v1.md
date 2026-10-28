# 森の封印石・ステージクリア祝福エフェクト v1

## 生成方法

- Built-in ImageGen（追加のAPI課金なし）
- 参照画像:
  - `assets/items/key-items/forest-seal-stone-formation-sheet-v1.png`
  - `assets/effects/bosses/velgran/velgran-awakening-overlay-effect-sheet-v1.png`
  - `assets/environments/bosses/velgran/velgran-sealing-altar-v1.png`
- 生成時背景: フラットな `#ff00ff`
- 生成後、クロマキー除去スクリプトでRGBA透過素材へ変換

## 最終プロンプト

Create a production-ready 16-bit fantasy JRPG pixel-art sprite sheet for PROJECT ELORIA.

Use case: stylized-concept
Asset type: transparent stage-clear blessing effect placed behind the Forest Seal Stone
Primary request: a ceremonial ancient forest-and-crystal blessing animation that appears when the player obtains the Forest Seal Stone after defeating Velgran.
Input images: use the Forest Seal Stone only as a scale, color, and center-placement reference; use the awakening overlay as the visual-effects reference; use the altar as the ancient rune language and circular composition reference.

OUTPUT LAYOUT:
- Exactly 1536 x 1024 pixels.
- Strict 2 rows x 3 columns, exactly 6 equal 512 x 512 cells.
- Read frames left-to-right on top row, then left-to-right on bottom row.
- Perfectly flat solid #ff00ff chroma-key background in every empty area.
- Do not use magenta in the effect.
- No grid lines, borders, labels, text, logos, UI, floor, altar, characters, boss, item, or cast shadows.
- Crisp hard-edged pixel art matching the references. No smooth vector gradients, no blurry fog, no painterly rendering.

IMPORTANT LAYERING:
- This sheet contains ONLY the blessing/background effect.
- Do NOT draw the Forest Seal Stone itself.
- Keep a clear empty central vertical area roughly 170 px tall x 130 px wide where the separate seal-stone sprite will be layered.
- The effect must surround and frame that empty center without covering it.
- All frames use exactly the same center anchor.

VISUAL DESIGN:
A sacred circular forest seal made from thin cyan rune lines, small diamond-shaped crystal sparks, restrained pale-gold star glints, moss-green leaves, and delicate curling brown root-vine motifs.
The rune design should echo the circular geometry and diamond markings of Velgran's altar, but remain airy and magical.
It is a triumphant yet mysterious first-dungeon completion effect, not a combat explosion.
Palette: luminous cyan and turquoise, pale blue-white highlights, restrained warm gold, olive/moss leaves, subtle brown root accents.

SIX-FRAME ANIMATION:
1. First response: four tiny cyan points and a few moss-green motes appear around the empty center; very faint broken rune arcs begin to glow.
2. Seal tracing: thin cyan arcs draw a partial circle around the empty center; small diamond runes illuminate one by one; two delicate root-vine curls rise from the lower sides.
3. Blessing opens: the circular rune becomes complete and slightly larger; pale-gold glints and several leaves begin spiraling upward; keep the center clear.
4. Stage-clear peak: the brightest ceremonial frame. Two concentric cyan rune circles, four cardinal diamond marks, a restrained halo of crystal sparks, gold glints, leaves, and elegant root curls create a full sacred wreath. Bright but never a solid white disk; center remains empty and readable.
5. Release: the outer circle expands and breaks into drifting rune segments; leaves and tiny crystal motes rise outward while the inner ring begins fading.
6. Quiet completion: most light has dispersed; only a thin lower arc, a few cyan sparkles, two drifting leaves, and a subtle gold glint remain, leaving the center fully clear.

ANIMATION REQUIREMENTS:
- Continuous readable progression: appear -> trace -> open -> peak -> release -> settle.
- Effect diameter about 300–390 px within each 512 px cell.
- Keep every visible pixel well inside the cell edges with generous padding.
- Individual rune arcs and particles must not touch or cross cell boundaries.
- No full-screen flash, no attack impact, no giant energy beam, no portal tunnel, no fire, no lightning strike.
- No readable text or letters.
- Avoid excessive particles; maintain a premium, composed 16-bit game look.
- Every frame must be clearly distinct but belong to the same animation.

