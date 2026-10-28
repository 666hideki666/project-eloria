# 第1層・根の解除クリスタル高品質化：画像案と実装指示 v1

## 状態と承認ゲート

2026-09-28、ユーザーは第2層のクリスタルの品質を評価し、第1層の根の解除クリスタルも同程度の品質にしたいと依頼した。本書は `work | エロリア2` で作成した**画像案と実装指示**であり、まだゲームコードは変更していない。画像案をユーザーに提示し、見た目と本書の実装範囲について**明示承認を受けてから** `コード実装 | エロリア2` で実装する。推奨モデルは **Sol High**。

## 画像案

- 新規透過PNG：`assets/concepts/environments/moss-root-ruins/landmarks/moss-root-unlock-crystal-concept-v1.png`（1254×1254、RGBA）。現時点ではコンセプト素材であり、ゲームには未接続。
- 品質の参照：`assets/environments/lightwing-crystal-cavern/lightwing-unlock-crystal-v1.png`。結晶面の複数段の陰影、発光の階層、石台の立体感、輪郭の読みやすさを合わせる。
- 環境の参照：`assets/environments/moss-root-ruins/moss-root-ruins-background-v2.png`。第1層の苔・古い灰色石・青緑の光に合わせ、第2層の青い晶洞クリスタルと色で区別する。
- 制作方法：組み込みの `image_gen` ツール。透過背景を指定した。使用した最終プロンプトは次のとおり。

> Use case: stylized-concept. Asset type: transparent-background game prop sprite for Project Eloria, a premium 2D pixel-art top-down oblique action RPG. Input image 1 is the stylistic and structural reference: a luminous blue crystal cluster on a carved stone altar. Input image 2 is the moss-root ruins environment reference: its warm gray ancient stone, green moss, teal light, and 3/4 overhead viewing angle. Create a new FIRST-LAYER puzzle crystal asset with the level of detail, crisp pixel-art faceting, layered crystal depth, luminous highlights and dimensional stone base quality of input image 1, but adapted to input image 2: a large central sea-green/turquoise crystal with a few smaller shards, restrained mint highlights, and a weathered warm gray stone altar with modest moss around the edges. Keep a compact, readable silhouette and a low, solid base suitable for standing on the circular platform at the map's right-side plaza. The crystal must feel embedded in the same fantasy ruins, not a blue sci-fi device. Three-quarter overhead oblique angle matching the game map. Single centered object only, fully visible with generous transparent padding around all sides, genuinely transparent background, no scenery, no ground plane, no characters, no letters, no UI, no watermark. Deliberate crisp pixel clusters and controlled retro-game shading, not blurry painting or smooth 3D. Preserve strong hierarchy of one primary crystal and small side shards. This is a concept asset for user approval, not a full map replacement.

## 現状と変更範囲

- 第1層の主クリスタルは `src/render/stages/MossRootRuinsRenderer.ts` の `drawTransferCrystal()` で小さな図形を組み合わせて描画している。第2層の専用画像素材と比べると、面の陰影と台座の情報量が少ない。
- 主クリスタルの場所は `MOSS_ROOT_RUINS.crystal`（元背景の画像座標 x=1160,y=525）。根の解除は第1層に1個だけある既存仕掛けであり、場所・到達ルート・操作距離・根の動作は変えない。
- 既存の `MOSS_ROOT_SOLID_PROPS[0]` が台座の足元判定を担う。新素材を現行の石台中心に合わせ、**見た目の足元とコライダーを原寸で照合**する。素材に合わせて床の赤線歩行マスクを広げない。見た目の台座が既存の判定を超えて大きくなる場合は、歩行ルートを潰さない小さな局所コライダー調整だけを検討し、差分と理由を報告する。
- 現行の深度描画 `mossRootCrystalDepthY()` を維持し、キャラが奥を通ると結晶の後ろに隠れ、手前を通るとキャラが前に来る。`drawRootGateLightPath()` の解除時の光路・活性化状態・未活性の視認性は残す。

## 実装時の具体案

1. ユーザーが画像案を承認したら、コンセプトPNGを制作素材として版管理できる場所に**新規ファイル名で**配置する。元の第2層素材や第1層背景は上書きしない。
2. 第2層と同様、透過素材を `imageSmoothingEnabled=false` で表示する。まずゲーム内でおおむね110×125ワールドpxを基準にし、画像の透明余白を考慮して石台の実際の幅・高さ・足元位置を第1層右広場に合わせる。数値を固定したままの盲目的な流用はしない。石台が広場からはみ出す・キャラを隠し過ぎる場合は縮尺だけ調整し、クリスタルの座標や赤線を動かさない。
3. 古い `drawTransferCrystal()` の図形を二重に残さず、新素材への置き換えを行う。ロード失敗時は現行描画をフォールバックとして使えるようにする。未活性時と解除後で色・光の変化は控えめにし、画像の細部をつぶさない。根へ流れる演出は既存のタイミングを維持する。
4. 主クリスタル以外の小さな背景装飾晶石 `drawCrystalCluster()`、第2層のクリスタル、根の障害物、回復・戦闘・歩行マスクは変更しない。

## 確認項目

- 第1層右広場のゲーム画面を未活性・解除演出中・解除後で比較し、新素材が背景の色調と視点になじむ。石台の足元が既存の広場とコライダーに一致する。
- キャラが石台へ入り込まず、周囲を歩いて `E` で操作できる。後ろに回るとクリスタルに隠れ、手前では前に表示される。
- 解除前の根は通れず、クリスタル操作後だけ通れる。進行フラグと既存演出を維持する。
- 第1層の赤線歩行範囲と第2層全体に差分がない。関連テスト、型チェック、ビルド、ブラウザでの実操作を確認する。検証用ブラウザ・サーバーは終了して音楽を残さない。
