# 第3層・門解除石碑の素材差し替え指示 v1

2026-09-30、ユーザーは西側・東側の新しい石碑デザインを確認し、「これで完璧だから組み込みの実装お願い」と承認した。本書の対象は**第3層の2つの解除装置の見た目と、その見た目に必要な接地・描画順の整合**。既存の赤線歩行域、門の解錠条件、敵・戦闘・進行仕様を変更しない。

## 入力素材と現状

- 背景: `assets/concepts/environments/spirit-cloth-stonescale-depths/spirit-cloth-stonescale-depths-full-map-concept-v2.png`
- 西側「霊灯」: `assets/concepts/environments/spirit-cloth-stonescale-depths/landmarks/spirit-lamp-stele-concept-v1.png`
- 東側「石楔」: `assets/concepts/environments/spirit-cloth-stonescale-depths/landmarks/stone-wedge-stele-concept-v1.png`
- 両素材は内蔵 image_gen で生成した 1205×1306 px の透過RGBA原画。生成プロンプトは `docs/prompts/spirit-cloth-stonescale-gate-stele-concepts-v1.md`。
- 現在の簡素な矩形描画は `src/render/stages/SpiritClothStonescaleDepthsRenderer.ts` の `drawSpiritLamp` / `drawStoneWedge`。配置は `src/stage/maps/spiritClothStonescaleDepthsMap.ts` の `spiritLamp: source(205,250)`、`stoneWedge: source(1430,230)`。装置の接地コライダーは同ファイルの `DEPTHS_SOLID_PROPS`。
- `src/render/Renderer.ts` の `drawActors` は y ソート済み。第2層の `lightwingCrystalDepthObjects` が前後関係の実装例。

## 実装要件

1. 西・東それぞれの矩形プレースホルダーを承認済み透過素材に置き換える。元画像を勝手に別デザインへ変更しない。画像の縦横比を保ち、アルファを維持し、既存の背景と同じピクセルアート表示特性（補間なし）で描く。原画には透明余白がある可能性があるため、見た目の本体・底面を基準に拡大率と配置を決める。単に 1205×1306 全体を指定サイズへ押し込んで極端に細く・低解像度にしない。
2. 石碑の底面が各円形広場の床に接地し、キャラや背景柱との相対サイズが自然になること。画像はワールド座標で描く。既存の `spiritLamp` / `stoneWedge` 座標と相互作用範囲を尊重し、必要な微調整だけ行う。最終表示寸法は実画面を見て決め、巨大な石碑で広場を塞がない。
3. 立体物としての描画順を正す。キャラが石碑の後ろ（画面上側）へ回ったときは石碑の上部がキャラを隠し、手前（画面下側）ではキャラが石碑の前に出る。固定背景レイヤーに焼き込むだけにしない。第2層の深度付きオブジェクト方式を参考に、足元 y を基準に y ソートする。敵や同行キャラとの前後関係も自然にする。
4. `spiritLampActivated` / `stoneWedgeActivated` の未起動・起動状態が区別できるよう、原画の意匠を保ちつつ光の強さ・色・小さなエフェクトで演出する。両方とも常時「解錠済み」に見える強い発光のままにしない。ギミック反応、対話、中央門が2/2後に開く条件とタイミングは維持する。
5. 石碑の可視の**接地部分だけ**に衝突を合わせる。上に伸びる柱・炎・結晶で通行を不自然に妨げない一方、足元をすり抜けさせない。既存の赤線静的マスクと中央門の衝突領域は変更しない。物体の周囲から E で調べられることを確認する。

## 受け入れ確認

- 西・東両方の未起動、起動後、キャラの手前・奥の各スクリーンショットを同じ倍率で確認し、背景と調和していること。必要なら比較用に旧スクリーンショット `docs/screenshots/layer3-redline-runtime-spirit-lamp-v1.png` / `layer3-redline-runtime-stone-wedge-v1.png` を見る。
- 実操作で各石碑の周囲へ到達し、足元に衝突し、手前・奥の視覚的前後関係が成立し、E操作でそれぞれ起動できること。2つ起動後に中央門を通れ、未解除のまま通れないこと。既存の第3層歩行境界を越えられないこと。
- `npm run typecheck`、`npm test`、`npm run build` を実行し、結果と未確認事項を報告する。
- 検証で音の鳴るブラウザタブや開発サーバーを起動した場合、作業完了時に閉じる。既存のユーザー起動プロセスを勝手に終了しない。

## 作業分担

この文書と画像は `work | エロリア2` で作成済み。コード変更は、ユーザーの上記承認に基づき `コード実装 | エロリア2` で実行する。推奨モデルは Sol High。
