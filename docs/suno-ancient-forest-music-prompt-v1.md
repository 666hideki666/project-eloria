# Suno用「古の森」フィールドBGMプロンプト v1

状態：**試作用の提案**（2026-10-15）。音源生成・採用・ゲーム組み込みは未実施。既存の探索曲「森晶遺跡の静寂」、戦闘曲「晶界を駆ける」と音色を揃える。

## 曲の狙い

- 仮題：「星巡る古の森」／英語表示案：*The Ancient Forest of Circling Stars*。
- 導入部で３人が最初に歩く森。木漏れ日と小鳥の生命感があるが、奥の洞窟へ近づくほど古代の記憶と小さな異変を感じる。怖くも牧歌的すぎもしない。
- 既存曲と同じ16-bit風サンプルオーケストラ、木管、ハープ、柔らかな弦、控えめな木の打楽器、晶石のベル。戦闘曲ほど速くせず、遺構の探索曲より開放的。
- 長時間の散策を邪魔しない中程度の旋律密度、自然なループ感。歌・語り・壮大な映画予告風の音は不要。

## SunoのStyle欄／主プロンプト

Instrumentalを選んで以下を入力する。英語の詳細指定を使う場合、同じ文をStyle欄に入れるだけでもよい。

```text
Original instrumental 1990s 16-bit-inspired fantasy JRPG field theme for an ancient enchanted forest at the beginning of an adventure. Warm dappled sunlight, gentle curiosity, living woodland, and a faint mystery leading toward an old crystal cave. Use the same cohesive sample-based orchestral palette as a forest-and-crystal RPG soundtrack: expressive flute and oboe, soft strings, harp arpeggios, delicate crystalline bells, warm rounded bass, and very light wooden percussion. A memorable but unhurried original melody, around 84 BPM in 4/4, mostly gentle minor/Dorian colors with hopeful major glints. Spacious arrangement with room for footsteps and game effects, subtle modern depth while retaining clear retro-console character. Very faint, occasional natural birdsong far in the background, never loud or rhythmic. Evolve gently and return to the opening motif for a seamless exploration-loop feeling; no dramatic ending or fade-out. No vocals, lyrics, speech, heavy drums, EDM, trailer impacts, horror drones, dominant guitar, 8-bit square-wave lead, or imitation of existing game music.
```

鳥の声が不自然・過剰になった生成結果では、主プロンプトから `Very faint, occasional natural birdsong far in the background, never loud or rhythmic.` を外して音楽だけを生成する。鳥声は別の環境音素材にする。

## 小鳥の環境音を別に作る場合

Suno Soundsの「Loop」で、以下を独立した環境音として試作する。音楽と分離すれば、小鳥の音量・頻度・場面別の有無を後で調整できる。これは**制作案**であり、まだゲームに組み込まない。

```text
Peaceful ancient forest ambience loop: a few small wild birds chirping softly at irregular intervals, distant leaves rustling in a light breeze, very subtle woodland air. Natural and spacious, no music, no melody, no human voices, no loud insects, no continuous birdsong, no abrupt cuts, suitable under a gentle fantasy game field theme.
```

参考：`docs/suno-battle-music-prompt.md`、`assets/audio/music/README.md`。Suno Soundsの環境音・Loop作成については [Suno公式ヘルプ](https://help.suno.com/en/articles/10625537) を参照。
