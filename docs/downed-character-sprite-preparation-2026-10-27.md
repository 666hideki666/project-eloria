# 戦闘不能スプライト：承認絵から48px素材への調整

状態：2026-10-27、実装・技術検証済み。採用する絵はカイルv2、ナディv1、メルv1。原版の承認とゲーム内での見た目の最終評価は区別する。

## 素材と接地

- 既存の透明背景PNGを使用。新たな生成や描き直し・色変更・透過マスク処理は行っていない。原版、歩行シート、攻撃シートは上書きしていない。
- `scripts/prepare-downed-sprites.py` は、原版のほぼ不可視な alpha=1 のキャンバスノイズを範囲検索時だけ除外し、alpha>=2 の内容外接矩形へ4px余白を加えて**矩形クロップ**する。その内側の元RGBAは保持し、NEARESTで縮小、透明な48×48枠へコピーする。生成原版の全キャンバスを48pxまで縮めない。
- 座標・原版SHA256・クロップ・縮尺・配置は `assets/sprites/characters/downed-preparation-v1.json`。再現コマンド：`python3 scripts/prepare-downed-sprites.py`（Pillow使用）。

| キャラ | 承認原版 | 内容の縮小先 | 48px枠内の配置 | 出力 |
| --- | --- | --- | --- | --- |
| カイル | `kyle-downed-concept-v2.png` | 44×18 | (2,18) | `assets/sprites/characters/kyle/kyle-downed-48px-v1.png` |
| ナディ | `nadi-downed-concept-v1.png` | 42×22 | (3,14) | `assets/sprites/characters/nadi/nadi-downed-48px-v1.png` |
| メル | `mel-downed-concept-v1.png` | 42×26 | (3,10) | `assets/sprites/characters/mel/mel-downed-48px-v1.png` |

共通の接地点アンカーはフレーム座標(24,32)。既存の表示倍率0.75を使い、足元 `pos` から描画矩形(-18,-24,36,36)を配置する。絵の最下部は足元から約3ワールドpx下までになり、伏せた身体と手・杖を地面に置く。読み込み済みの専用絵には幅14・高さ3・Yオフセット0の影を用いる。失敗・読込中の従来簡易表示は従来の影を保つ。

## 描画・ルール

- `downedCharacterSprites.ts` に３枚のURLと48px枠の接地定数を定義。世界の `meru` は素材名 `mel` に対応する。
- `CharacterSpriteRenderer` が各絵を独立して先読みし、48×48の寸法を検証。戦闘不能時はこの１枚を表示し、向きによる反転・上下動・攻撃アニメーション・被ダメージ点滅を加えない。平滑化は無効。復活したフレームから従来の待機／歩行／攻撃描画へ戻る。
- 素材が未読込・失敗・寸法不正なら従来の矩形表示へフォールバック。通常シートの失敗とは独立し、戦闘不能絵だけの失敗でも生存時のシートを表示できる。破棄時は新しい画像のイベントハンドラも解除する。
- 足元Yによる前後順を使用。位置・当たり判定・移動・HP/MP・HUD・蘇生ルールは変更していない。倒れたキャラにはバリア描画を追加しない。

## 検証

- 新６テスト：３人各々の独立読込・接地矩形・時間でポーズを変えないこと・復活して歩行シートに戻ること・位置不変・読込中／エラー／大判寸法の拒否・通常絵との独立性・破棄。
- 開発版：PC1600×900、横スマホ844×390／667×375、iPad相当1024×768。製品版：PC1600×900、横スマホ667×375。各キャラを既存 `damageCharacter` で戦闘不能にし、１人ずつ／３人同時・実際のgameover遷移を確認。既存 `restorePartyFully` で回復し、専用絵が残らず通常シートへ戻ることを確認。
- 既存立ち絵と48pxの倒れ絵を並べて縮尺を確認し、背景上の画面とCanvas単体画像を目視。Canvas drawImageの実呼び出しでも使用画像・寸法・平滑化無効・不透明度・足元Y順を確認。製品版のインライン画像も含め、専用絵のsrcだけを不正PNGへ置換して実読込エラーを起こし、簡易表示と通常絵の復帰を確認した。
- 記録：`docs/qa/downed-character-sprites-2026-10-27.json`、`docs/qa/downed-character-sprites-visual-2026-10-27.json`。画面：`docs/screenshots/eloria-downed-*.png`。全員同時の画面は既存gameoverダイアログが身体を覆うため、Canvas単体記録 `eloria-downed-4174-desktop-all-gameover-canvas.png` 等も保存した。
- 検証はミュートの隔離Chrome。祭壇の既存背景上へ検証用に配置し、描画確認中は世界更新を止めている。手動で全戦闘を完走したものではない。**実機・Safari/WebKit・聴感・ユーザーによるゲーム内見た目の最終評価は未確認**。
