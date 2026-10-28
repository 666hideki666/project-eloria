# 森の封印石 章末イラスト生成記録 v1

2026-10-24、imagegenスキルに従い、組み込み画像生成ツールで作成。プロローグ絵と既存のボス／封印石素材を参照し、横長の非ドット絵ファンタジーイラストとして３枚を採用。最終場面は封印石を杖と誤認させる初稿を採用せず、対象物だけ修正した画像を使う。以下が**採用画像の最終プロンプトセット**。

## 1 戦闘後

保存先：`assets/concepts/epilogue/eloria-epilogue-guardian-after-battle-v1.png`

```text
Use case: illustration-story. Asset type: first full-screen illustrated story scene for the widescreen 16:9 cinematic epilogue of fantasy game ELORIA. Reference image 1 (the village conversation): preserve the established three protagonists' identity, faces, hair and costumes, and its richly painted non-pixel fantasy illustration finish. Reference image 2 (pixel boss-clear storyboard): preserve Velgran's identity and the underground circular stone altar with teal crystals and roots, but translate them into the same detailed painterly illustration medium as reference 1, not enlarged pixel art. Scene: the battle has just ended. A huge living forest guardian with mossy stone body, branch antlers and a cyan chest crystal kneels, exhausted but alive, on an ancient underground stone arena. Beyond him, the seal stone on the northern dais still pulses irregularly with blue light. The three young heroes, silver-gray-haired Kyle in rusty red tunic and blue scarf, auburn ponytailed Nadi in green with purple scarf and moon-ring blade, and short dark-blue-haired Meru in blue robe and orange scarf with crystal staff, stand together in the foreground observing with concern, not triumph. Mood: quiet, empathetic, unresolved magic; dark mossy gold and deep teal with concentrated cyan pulses. Composition: cinematic wide landscape, clear central figures and altar, lower 20 percent kept relatively uncluttered for externally rendered two-line Japanese subtitles. No text, no lettering, no logos, no HUD, no speech balloons, no borders, no gore, no boss death. High-quality polished hand-painted fantasy illustration, dramatic but restrained lighting.
```

参照：`assets/concepts/prologue/eloria-prologue-village-conversation-v1.png`、`assets/concepts/environments/crystal-dungeon-01/velgran-boss-clear-storyboard-v1.png`。

## 2 メルの語りかけ

保存先：`assets/concepts/epilogue/eloria-epilogue-meru-speaks-to-stone-v1.png`

```text
Use case: illustration-story. Asset type: second full-screen illustrated story scene for the widescreen 16:9 cinematic epilogue of fantasy game ELORIA, continuing directly from reference image 1 (the newly illustrated boss aftermath). References: image 1 is the preceding scene and locks the underground altar's architecture, painterly finish, color palette and characters; image 2 locks Meru's established face, short dark-blue hair, blue robe, orange scarf and staff; image 3 shows the actual Forest Seal Stone design, an elongated cyan crystal wrapped by living brown-gold roots in an oval frame, to render as detailed fantasy painting rather than pixel sheet. Primary scene: at the northern stone dais, Meru stands close to the waist-high seal stone, lowers her crescent-topped crystal staff and gently touches the root-wrapped cyan crystal with one open hand, speaking to it with quiet empathy; her eyes and face are visible in a three-quarter view, not replaced by a generic blonde or an adult woman. The stone's disturbed blue pulses are starting to soften. In the deep background, the living moss-and-stone guardian Velgran rests peacefully, and Kyle and Nadi keep respectful distance, secondary and small. Emphasis on intimate human connection rather than triumph or magical attack. High-end richly painted anime-fantasy illustration, same visual language as reference 1 and 2, cinematic soft teal light on Meru's face, ancient cave gloom, delicate roots. Landscape 16:9; reserve a relatively calm darker lower 20 percent for separately rendered two-line Japanese subtitles. No text, no labels, no HUD, no speech balloons, no borders, no sprite sheet, no pixel art, no weapon use, no dead monster, no additional characters.
```

参照：画像1、`assets/concepts/prologue/eloria-prologue-village-conversation-v1.png`、`assets/items/key-items/forest-seal-stone-formation-sheet-v1.png`。

## 3 託された封印石（採用した修正版）

保存先：`assets/concepts/epilogue/eloria-epilogue-seal-stone-entrusted-v1.png`

```text
Use case: precise-object-edit. Edit target: reference image 1, the illustrated final scene with Velgran bowing to Meru, Kyle and Nadi. Keep every person's face, costume, posture, the living guardian anatomy, underground altar, painterly fantasy illustration finish, framing, lighting and 16:9 landscape composition unchanged. Change only the object in Meru's hands and the moment of transfer: she is NOT holding her staff or a wand here. Replace the slender crystal-tipped object in her two hands with the distinct Forest Seal Stone from reference image 2: one palm-sized elongated cyan diamond crystal wrapped in an oval lattice of living golden-brown roots. Meru clearly receives and cradles this one small root-wrapped seal stone with both open hands as the guardian gently bows and entrusts it. Do not add extra crystals in her hands. The guardian's chest crystal and other ambient cave crystals remain where they are. Calm magical glow; no text, UI, border, speech balloon, pixel art, extra people, duplicate arms or distorted hands.
```

参照：不採用の３枚目初稿、`assets/items/key-items/forest-seal-stone-formation-sheet-v1.png`。初稿は `$CODEX_HOME/generated_images` に保持し、プロジェクトにはコピーしていない。
