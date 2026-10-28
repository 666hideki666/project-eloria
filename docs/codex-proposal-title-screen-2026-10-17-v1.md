# 実装指示案：ELORIA スタート画面 v1

## 状態・承認境界

2026-10-17作成の旧指示案。2026-10-18に配置見本を採用後、STARTからイラスト付き序章を経て森へ入る方針へ改訂した。**実装承認と実装・技術検証結果は後続の `docs/codex-proposal-title-and-prologue-2026-10-18-v1.md` を正とする。** 本書の5・6項のSTART直行仕様は実装しない。採用背景・ロゴと旧提案の履歴として保持。推奨モデル：**Sol High**。

## 確定している素材と今回の見本

- 背景（採用済み）：`assets/concepts/title/project-eloria-title-key-art-v2.png`。３人の後ろ姿・森・古代遺跡・晶石洞窟の構図を維持。
- ロゴ（2026-10-17 採用済み）：`assets/concepts/title/eloria-title-logo-transparent-v4.png`。大きめの石刻文字に苔・蔓。文字は **ELORIA のみ**。`PROJECT`、金色、強い発光、ギラつきは不可。
- 採用済みの配置見本：`assets/concepts/title/eloria-title-screen-ui-preview-v1.png`。画像生成による合成イメージであり、実装用の完成背景画像ではない。実装では採用済み背景と透過ロゴを別レイヤーで使用し、ボタン類は HTML/CSS の実操作要素にする。

## 提案する画面

1. 通常の `stage` 起動は、プレイ画面の上に現在の説明カードや開発用層選択画面を最初から出さず、まず専用の全画面タイトルを表示する。背景は画面いっぱい、ロゴは上部中央の暗い樹冠に大きめに配置する。背景を引き伸ばさず、横スマホ・iPad の比率差による端のトリミングでもロゴ、３人、洞窟をできるだけ見せる。安全領域と横画面の短い高さに対応する。
2. 下中央（３人の体を隠さない道の上）に主操作 `START`、その下に小さく「冒険を始める」。暗い半透明の石板を思わせる低い横長ボタン、細い青緑の輪郭、控えめなホバー・フォーカス・押下演出。金属光沢・強いグロー・点滅は禁止。タップしやすい寸法と明確なキーボードフォーカスを確保する。
3. 右上に小さな `全画面` 切替を置く。既存の Fullscreen API と `fullscreenchange`／`fullscreenerror` に従い、非対応・失敗時は通常表示で続行可能。ユーザーの操作なしで全画面化しない。
4. **開発環境でだけ**右下に控えめな `DEV WARP` を出す。押すと既存の開始層一覧（古の森、第１〜第３層、守護者戦）を開く。選択時は既存の `startDevelopmentLayer` を利用し、正しい部屋・敵・入場タイトル・BGMを保つ。製品ビルドではボタンも選択パネルも存在しない。旧式の全面 DEV 層選択画面はタイトルの前面に自動表示しない。
5. 【要改訂・実装禁止】旧案では、`START` から古の森のスポーンと既存の中央入場タイトル「序章／古の森」へ直行するとした。2026-10-18にユーザーが START 後のイラスト付き序章を希望したため、統合指示書で `START → 序章演出 → 古の森` に改める。タイトル中にゲーム内 HUD、移動・攻撃、旧イントロ説明カードを表示しない方針は維持する。
6. 【要改訂・実装禁止】旧案の「オープニングは追加せず直接森へ」は現在の希望と矛盾する。序章の３場面の試作・仮台詞は `docs/storyboard-eloria-prologue-v1.md` を参照。ユーザーの絵コンテ確認と実装承認前に旧案どおり実装しない。
7. タイトルで新しい曲は追加しない。初回操作より前にブラウザの音声制約を回避して自動再生しない。古の森開始後の既存曲「星巡る古の森」とミュート・音量状態を維持する。画面を閉じた後に隠れたタブ／プレイヤーから曲が残ることのないよう、既存の可視状態処理も維持する。

## 実装時の調査・保護点

- 起動と旧 DEV 選択：`src/main.ts` の `mountDevLayerSelector` と `stageQa`／`autoStartQa` 分岐。通常起動だけ新タイトルを通し、既存の QA 直行 URL、テスト、自動開始、`mode=arena` を不用意に壊さない。
- 世界の開始状態：`src/game/GameWorld.ts` の `intro`→`playing` と `startDevelopmentLayer`。ゲーム内の進行・マップ・当たり判定は変更しない。
- 旧イントロオーバーレイ：`src/ui/OverlayController.ts`、`index.html`、`src/style.css`。旧 `PROJECT ELORIA` 文言の通常タイトル露出をなくす。ただしポーズ等の汎用オーバーレイは維持する。ブラウザタブの `<title>` も製品名 `ELORIA` に揃える。
- 採用画像を単純に１枚絵へ焼き込まない。ロゴの縮尺・配置と実ボタンをレスポンシブに調整できるレイヤー構成にする。

## 検証・完了条件

- 通常起動でタイトルが先に見え、START 前にキャラが動かず、HUD・旧説明カード・旧 DEV 全面パネルが出ない。ロゴは `ELORIA` のみで、背景の３人は別人にならない。
- START をマウス・タップ・キーボードで押せ、１回だけ古の森に入り、入場タイトル・BGM・操作が正常。全画面ボタンの成功・非対応・失敗時も確認。
- DEV WARP は開発時のみ機能し、全層を選べる。通常 START と QA URL の直行経路を壊さない。製品ビルドでは開発ボタンがない。
- PC 16:9、横スマホ、iPad 4:3相当、ブラウザ通常表示／全画面で、ロゴ・START・人物・洞窟が読め、ボタンは安全領域から外れない。動き軽減設定とキーボードフォーカスも確認。
- `npm run typecheck`、`npm test`、`npm run build` と実画面確認を実施し、結果・スクリーンショットを報告。検証で開いたブラウザ／サーバーを閉じ、BGMを残さない。

## 見本を作った画像生成プロンプト

組み込み imagegen を使用。Image 1 は採用済み背景（編集対象）、Image 2 は採用済み透過ロゴ（挿入素材）。

> Use case: compositing / ui-mockup. Asset type: polished landscape title-screen design mockup for the fantasy adventure game ELORIA. Image 1: approved title background, EDIT TARGET; preserve its complete 16:9 framing, forest, ruins, great tree, crystalline cave, waterfalls, and the three canonical adventurers in the lower-left with their precise identities/costumes. Image 2: approved transparent ELORIA logo, INSERT ASSET; preserve its exact six letters E L O R I A, matte weathered pale stone, moss and curling vines without redesign. Place logo large across upper-middle canopy, centered, approximately 55% image width. Add one elegant highly usable START control near lower center on the foreground path, below and to the right of the adventurers, no overlap with bodies: a long but low charcoal translucent stone-like button with fine muted pale blue-green edge, quiet subtle depth, text exactly 'START' in large clean serif and small Japanese '冒険を始める' below; restrained, no glowing neon or gold. Add tiny discreet '全画面' control at top-right and tiny subdued 'DEV WARP' at bottom-right, clearly secondary, both clear of artwork focal points. This should look like a shippable console RPG title UI over painterly artwork, NOT a screenshot of a browser, no tab bar, no invented extra menus or labels. Keep game background as unchanged as possible. No PROJECT, no extra title text, no glitter, no gold, no added characters. Mockup only; UI elements will be built separately in code.
