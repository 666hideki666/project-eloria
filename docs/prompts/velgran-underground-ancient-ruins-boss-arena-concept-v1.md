# ヴェルグラン戦・地下古代遺跡大広間コンセプト v1

## 目的

森を探索して洞窟へ入り、遺跡の最深部へ進んだ先に現れる、森晶獣ヴェルグランのボス戦大広間の正式コンセプト。高所や屋外ではなく、巨大な地下空洞に築かれた古代遺跡として設計する。

## 生成方式

- Built-in ImageGen
- 既存の環境・ボス・祭壇画像を参照した新規生成
- 外部APIキーおよび追加API課金なし

## 参照画像

- `assets/concepts/environments/crystal-dungeon-01/crystal-altar-guardian-battle-v1.png`
  - 地下結晶遺跡とボス戦の雰囲気
- `assets/concepts/monsters/guardians/forest-crystal-guardian-pixel-concept-v1.png`
  - ヴェルグランの確定デザイン
- `assets/environments/bosses/velgran/velgran-sealing-altar-v1.png`
  - 円形祭壇、根、結晶柱、床紋様の基準
- `assets/concepts/environments/moss-root-ruins/moss-root-ruins-production-map-concept-v2.png`
  - 苔根遺跡全体の建築・水・結晶表現

## 最終生成プロンプト

```text
Use case: stylized-concept
Asset type: full-screen environment concept and level-layout reference for a top-down action RPG boss arena
Primary request: Create the definitive environment concept for the Forest Crystal Beast Velgran boss arena: a vast open ancient ruin built inside the deepest chamber of an underground forest cave. The player has traveled from the forest into progressively deeper ruins; this must feel like the final hidden chamber, not a mountaintop, not outdoors, and not a sky arena.
Input images: Image 1 is the atmosphere and battle-context reference for the underground crystal ruin and Velgran fight. Image 2 is the exact design reference for Velgran: preserve its massive quadrupedal stone-and-root body, moss, wooden antlers, armor plates, and glowing cyan chest crystal. Image 3 is the exact design reference for the circular sealing altar, root-covered ancient stonework, crystal pillars, rune circles, and palette. Image 4 is the reference for the broader moss-root ruin architecture, pathways, water-darkness, cyan crystals, and 16-bit top-down environment style.
Scene/backdrop: an enormous natural cavern at the absolute deepest point of the dungeon. The cavern ceiling is high but visible in darkness through hanging roots, stalactites, broken stone arches, and distant cyan crystal seams. Ancient masonry has been built into the cave walls and partly swallowed by roots.
Subject: a spacious circular battle floor occupying most of the composition, formed from cracked ancient stone rings and faint cyan runes. At the far/top center stands a slightly raised root-bound sealing altar where Velgran lies dormant or crouches before awakening. At the bottom center is a single wide stone entrance corridor from the previous dungeon layer, clearly showing how the party enters. Four broken crystal pylons and collapsed columns frame the arena edges without blocking movement. Thick roots and rock walls create an unmistakable natural outer boundary.
Style/medium: highly polished 16-bit-era Japanese fantasy RPG pixel art, top-down three-quarter perspective, crisp intentional pixel clusters, limited 1990s console palette, richly detailed but readable as a playable arena. Match the references rather than using smooth modern illustration.
Composition/framing: wide landscape view showing the entire chamber and its navigation. Arena center must remain open and uncluttered for three playable characters and a large boss. Entrance at bottom, dormant boss and sealing altar at top, readable circular movement routes around the boss. Use strong depth: dark cave perimeter, brighter rune-lit central floor. Include the three heroes only as very small scale-reference figures standing together just inside the bottom entrance, facing the dormant boss. Do not show active attacks or battle effects.
Lighting/mood: solemn, ancient, subterranean, mysterious, and climactic. Cyan crystals and altar runes provide the main light; subtle warm gold moss highlights keep the forest identity. The room should feel suddenly huge after narrow cave corridors.
Color palette: deep charcoal cave shadows, olive and moss green, weathered brown-gray stone, cyan and turquoise crystal light, tiny restrained warm-gold accents.
Materials/textures: cracked stone rings, worn carvings, moss, exposed roots, damp rock, old banners reduced to tatters, crystal seams, scattered rubble only near the edges.
Constraints: no open sky, no clouds, no cliffs, no mountaintop, no daylight, no lava, no snow, no modern architecture. Preserve Velgran's established design and make the environment the primary subject. Keep the central combat area wide and free of obstacles. Outer walls and roots must clearly communicate collision boundaries. No sealed combat gate across the entrance, no UI, no HUD, no text, no labels, no watermark, no sprite-sheet grid, no panel layout. One coherent full scene only.
```

## 出力

- `assets/concepts/environments/crystal-dungeon-01/velgran-underground-ancient-ruins-boss-arena-concept-v1.png`
- 1536 × 1024 RGB PNG
- コード実装なし
