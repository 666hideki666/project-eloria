# Project Eloria Music

ゲーム内BGMの保存場所です。

## プロローグ曲

- 曲名：森が呼ぶ、その前に
- 用途：序章６枚のイラストを通じて継続・ループ再生。タイトル曲から暗転中に切り替え、森へ進む際は森曲へ約1秒でクロスフェードする。
- ユーザー提供原本：`/Users/katouhideki/Desktop/森が呼ぶ、その前に.mp3`（原本を保持）
- 組み込みファイル：`prologue-before-forest-calls-v1.mp3`
- 143.6秒、48kHzステレオMP3、3,368,084バイト、埋め込み画像を含む。
- 2026-10-21に実装承認。加工・再エンコードなしのコピー。
- 原本と配置ファイルのSHA-256：`467e97e13758ca24ebfdbdcc51056252a790b5dbf477c34ae21b205e1d0d7c69`

## タイトル曲

- 曲名：星影の序曲
- 用途：タイトル画面専用のループBGM。STARTでフェードアウトし、暗転中にプロローグ曲へ切り替わる。
- ユーザー提供原本：`/Users/katouhideki/Desktop/星影の序曲.mp3`（原本を保持）
- 組み込みファイル：`title-starshadow-prelude-v1.mp3`
- 長さ：約153.2秒、48 kHzステレオMP3（埋め込み画像を含む）
- 2026-10-20採用。再エンコード・音量加工なしのコピー。
- 原本と組み込みファイルのSHA-256：`5a0f9be3ce6da96adbf8c1bce4e331354cbc538532797459bc2014343e9cad07`

## 古の森・探索曲

- 曲名：星巡る古の森
- 用途：古の森の非戦闘時専用BGM。洞窟から第１層へ進むと既存探索曲へ切り替わる。
- ユーザー提供原本：`/Users/katouhideki/Desktop/星巡る古の森.mp3`（原本を保持）
- 組み込みファイル：`field-star-circling-forest-v1.mp3`
- 長さ：約193.4秒、48 kHzステレオMP3
- 2026-10-15採用。再エンコード・音量加工なしのコピー。別の鳥声環境音は追加しない。
- 原本と組み込みファイルのSHA-256：`ee38219dc7f6f4f6da5df208e31370e365077f14560726cf0f8964ffbe28c4d0`

## 最初のバトル曲

- 曲名：晶界を駆ける
- Sunoから保存する原本：`battle-crystal-realm-v1.mp3`
- 将来の高音質マスター：`battle-crystal-realm-v1.wav`
- Webゲーム組み込み用：`battle-crystal-realm-v1.ogg`

## 森の遺跡・探索曲

- 曲名：森晶遺跡の静寂
- Sunoから保存した原本：`exploration-forest-crystal-ruins-v1.mp3`
- 用途：転送の間を含む、非戦闘時の森の遺跡探索BGM
- 長さ：約3分20秒
- 音声：ステレオ、48kHz MP3

同じ曲を作り直す場合は、既存ファイルを上書きせず、末尾を`v2`、`v3`と増やします。

## 命名ルール

- 半角英数字とハイフンを使用する。
- 空白や日本語をファイル名に含めない。
- 用途、曲名の短縮形、バージョン番号の順にする。
- Sunoからダウンロードした原本は削除せず保持する。
- ゲーム用に変換した音源は、原本とは別ファイルで保存する。

例：

- `battle-crystal-realm-v1.mp3`
- `battle-crystal-realm-v2.mp3`
- `boss-velgran-v1.mp3`
- `field-star-circling-forest-v1.mp3`
