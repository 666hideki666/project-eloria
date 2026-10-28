# 森の封印石・形成アニメーション v1

## 生成方法

- Built-in ImageGen（追加のAPI課金なし）
- 参照画像:
  - `assets/effects/bosses/velgran/velgran-defeat-crystal-shatter-effect-sheet-v1.png`
  - `assets/sprites/bosses/velgran/velgran-defeat-collapse-sheet-v1.png`
  - `assets/sprites/bosses/velgran/velgran-stagger-core-exposed-sheet-v1.png`
- 生成時背景: フラットな `#ff00ff`
- 生成後、クロマキー除去スクリプトでRGBA透過素材へ変換

## 最終プロンプト

Create a production-ready 16-bit fantasy JRPG pixel-art sprite sheet for PROJECT ELORIA.

Use case: stylized-concept
Asset type: key story item formation and floating animation
Primary request: the Forest Seal Stone (森の封印石) forming from Velgran's shattered cyan chest crystal after the boss is defeated.
Input images: reference the cyan crystal color, vine-and-root ornament, pixel density, lighting, and shattering style from the provided Velgran assets. Do not include Velgran's body.

OUTPUT:
- Exactly 1536 x 1024 pixels.
- Strict 2 rows x 3 columns sprite sheet, exactly 6 equal 512 x 512 cells.
- Frames read left-to-right across the top row, then left-to-right across the bottom row.
- Perfectly flat solid #ff00ff chroma-key background throughout every empty pixel.
- Do not use magenta in the subject.
- No grid lines, labels, text, borders, UI, floor, altar, boss body, player characters, or cast shadows.
- Crisp hard-edged pixel art, consistent with the provided 16-bit assets. No smooth vector art, no blur, no painterly texture.

ITEM DESIGN:
A unique palm-sized magical key item called the Forest Seal Stone.
- Main core: faceted vertical diamond/seed-shaped crystal, luminous cyan and turquoise, matching Velgran's chest core.
- Outer frame: a small elegant oval wreath of dark brown living roots and bronze-gold vine filigree wrapping around the crystal without hiding it.
- Small moss-green leaves and two tiny bud-like tips at the upper sides, clearly communicating forest magic.
- A small ancient stone cap/base with one subtle cyan rune line.
- Symmetrical enough to read as a sacred seal, but organic rather than mechanical.
- It must not look like a sword, ordinary healing crystal, generic blue diamond, crown, necklace, or modern icon.
- Final completed item should occupy about 150–190 px tall and 110–150 px wide in each 512 px cell.
- Keep the item and formation effect centered on exactly the same anchor point in all six cells.

SIX-FRAME FORMATION SEQUENCE:
1. Aftermath: several small cyan crystal fragments and tiny white-blue sparkles hover loosely around an empty center. Faint brown vine threads begin appearing beneath them.
2. Gathering: fragments spiral inward in a compact circular motion; thin root-vines rise and form the beginning of an oval frame. A soft cyan glow concentrates at the center.
3. Core forming: crystal shards connect into an incomplete vertical diamond/seed crystal with visible seams; the root-and-bronze frame curls around it. A few particles remain in motion.
4. Seal completed: fully formed Forest Seal Stone with bright cyan central core, root wreath, bronze vine details, moss leaves, and small stone base. A brief star-shaped glint appears on the crystal.
5. Sacred pulse: the completed item floats slightly higher; one restrained cyan ring and several tiny forest-green motes pulse outward. Keep the item fully visible and unchanged.
6. Idle hover: completed item settles slightly lower, with a gentle cyan glow and two or three tiny sparkles/leaves. This frame should also work as the main collectible sprite.

ANIMATION REQUIREMENTS:
- The same fragments must plausibly gather and become the final item.
- No explosive attack, no large combat blast, no screen-filling rays.
- Cyan light is vivid but contained.
- Maintain consistent size and center anchor between completed frames 4–6.
- Generous empty padding around all artwork in every cell.
- Every cell must be visually distinct and clearly advance the same continuous formation action.

PALETTE:
Cyan, turquoise and pale blue-white crystal highlights; warm dark brown roots; muted bronze-gold filigree; moss and olive-green leaves; a little gray stone. Match the existing Velgran asset palette and pixel scale.

