# Codex向け追加指示：ガラクロウの浮遊待機・飛行スプライトを導入

Project Eloriaへ、結晶羽を持つ大型の飛行敵「ガラクロウ」を正式な敵種別として追加してください。

今回は待機・飛行移動の正式スプライト化までを対象にします。専用の急降下攻撃、被弾、撃破、風や羽根のエフェクトは次の作業へ分離し、既存の敵AIや戦闘基盤を大きく作り直さないでください。

## 使用素材

- 画像：`assets/sprites/enemies/garacrow/garacrow-idle-flight-48px-v1.png`
- 設定：`assets/sprites/enemies/garacrow/garacrow-idle-flight-48px-v1.json`
- 採用コンセプト：`assets/concepts/monsters/garacrow-pixel-concept-v1.png`

画像は横6列×縦4行、1コマ48×48px、全体288×192pxの透過PNGです。

行の向き：

1. `down`：正面
2. `up`：背面
3. `left`：左向き
4. `right`：右向き

各行は全コマ同じ方向です。左右反転で代用せず、JSONに指定された行を使用してください。

## 1. 敵種別と暫定戦闘値

`EnemyKind`へ`"garacrow"`を追加してください。

専用の急降下攻撃を作るまで、次の暫定値を使用します。

```ts
garacrow: {
  name: "ガラクロウ",
  hp: 88,
  armor: 0,
  archetype: "basicMelee",
  radius: 15,
  damage: 22,
  attackCooldown: 2.1,
  exp: 20,
}
```

ルミバネより大きく、耐久と一撃が少し強い敵です。

既存の`spacing`は攻撃位置と現在の近接判定が噛み合わないため、この段階では使わないでください。後で専用の急降下攻撃を実装するときに、ガラクロウ用挙動へ置き換えます。

## 2. 現在の3体構成

現在の敵数3体は維持し、1体目だけをガラクロウへ変更してください。

```ts
createEnemy(1, "garacrow", 425, 132, wave),
createEnemy(2, "lumibane", 485, 244, wave),
createEnemy(3, "utsurobou", 505, 178, wave),
```

確認用アリーナは次の3種類になります。

- ガラクロウ
- ルミバネ
- ウツロボウ

敵ID、座標、合計数は変更しません。モスプルンとイワウロコの型、設定、描画処理は後で使うため削除しないでください。

## 3. 既存の敵スプライト基盤を再利用

`src/render/enemySpriteConfig.ts`へ画像とJSONを読み込み、既存の`createEnemySpriteConfig()`で設定を作成してください。

```ts
export const GARACROW_SPRITE = createEnemySpriteConfig(
  garacrowSpriteUrl,
  garacrowFrameData,
);
```

`ENEMY_SPRITE_CONFIGS`へ追加します。

```ts
garacrow: GARACROW_SPRITE,
```

モスプルン、ルミバネ、ウツロボウと同じ`EnemySpriteRenderer`、方向解決、フレーム選択、敵ID由来の位相ずらしを再利用してください。ガラクロウ専用の画像ローダーや別アニメーションクラスは作らないでください。

## 4. アニメーション

JSONのクリップをそのまま読み込みます。

### `idle`

- コマ：`0 → 1 → 2 → 1`
- 時間：`0.22 → 0.18 → 0.22 → 0.18`秒
- ループ：あり

### `move`

- コマ：`2 → 3 → 4 → 5`
- 各0.10秒
- ループ：あり

ガラクロウはルミバネより遅く重い羽ばたきに見せます。アニメ速度は表示専用とし、移動速度、攻撃間隔、当たり判定へ連動させないでください。

`resolveEnemySpriteClip()`は既存処理を使います。

- `approach`、`reposition`、`recover`、実際に巡回移動中：`move`
- 停止中、予兆中、攻撃中、ノックバック中：`idle`

## 5. 描画

`Renderer.drawEnemy()`へ`garacrow`分岐を追加し、次の順で描画してください。

1. 飛行影
2. ガラクロウ本体
3. 既存のHPバー

影の初期値：

- 中心：敵座標の下約7px
- 横半径：14px
- 縦半径：3px
- 色：`rgba(0, 5, 8, 0.3)`

ルミバネより大きな影にしますが、本体へ重なるほど上へ置かないでください。翼の上下に合わせた影の変化は最大でも5%程度に留めます。

JSONの初期値：

- `drawScale: 0.92`
- `anchor: { x: 0.5, y: 0.88 }`

実機で必要な場合は描画倍率だけ`0.88〜0.98`の範囲で微調整して構いません。半径15の当たり判定は見た目調整のために変更しないでください。

画像ロード失敗時には、ガラクロウと判別できる簡易フォールバックを表示してください。敵種別ごとの明示的な分岐を保ち、イワウロコ用フォールバックへ落とさないでください。

簡易フォールバック：

- 濃紺の胴体
- 広い左右の翼
- 琥珀色の目
- 青緑の結晶羽を示す小さな点

## 6. HPバー

大きく上へ伸びる翼にHPバーが重ならない位置へ置いてください。

- 幅：30〜32px
- 基準：敵座標から上へ約43px

翼を上げたコマでも、HPバーが目や結晶羽を隠さないことを確認します。既存敵のHPバー位置は変更しないでください。

## 7. 開発用スプライト確認

ルミバネ導入時に一般化した`enemySpriteQaKind`を再利用します。

例：

```text
?enemySpriteQa=down&enemySpriteQaClip=idle&enemySpriteQaKind=garacrow
?enemySpriteQa=up&enemySpriteQaClip=move&enemySpriteQaKind=garacrow
?enemySpriteQa=left&enemySpriteQaClip=move&enemySpriteQaKind=garacrow
?enemySpriteQa=right&enemySpriteQaClip=move&enemySpriteQaKind=garacrow
```

確認対象：

- 正面では両目と正面のくちばしが見える。
- 背面では目が見えない。
- 左右でくちばしの向きが正しい。
- 各行の途中で別方向へ回転しない。
- 翼を大きく上下しても胴体の世界座標が跳ねない。
- 青緑の結晶羽とオリーブ色の肩羽が残る。
- ルミバネより一回り大きく見える。

## 8. 今回は実装しないもの

- 専用の急降下攻撃
- 攻撃専用スプライト
- 風圧、軌跡、散る羽根
- 被弾モーション
- 撃破・落下モーション
- 飛行高度による近接攻撃無効
- 新しい遠距離攻撃

現在の通常攻撃、予兆、被弾フラッシュ、ノックバックを維持してください。攻撃・被弾中は専用素材ができるまで既存表示へ安全にフォールバックさせます。

## 9. テスト

最低限、次を追加または更新してください。

- `EnemyKind`と`ENEMY_TUNING`にガラクロウが存在する。
- 暫定HP88、ダメージ22、経験値20、半径15、クールダウン2.1秒が使われる。
- 現在の敵ID1が座標425・132のガラクロウになる。
- 敵数は3体のまま。
- 画像寸法が288×192で、48×48の24コマとして読める。
- 4方向の行と`idle`・`move`クリップがJSONどおり解決される。
- `enemySpriteQaKind=garacrow`で単体確認できる。
- ロード失敗時もゲームが停止せず、ガラクロウ用フォールバックが表示される。
- モスプルン、ルミバネ、ウツロボウ、イワウロコの既存設定が変わっていない。

最後に次を実行してください。

```bash
npm test
npm run build
```

既存スクリプトに個別テストコマンドがある場合は、それも実行してください。

## 完了条件

- 現在の1体目が正式なガラクロウ画像で表示される。
- 正面・背面・左右の飛行方向が正しい。
- 待機中と移動中で重い羽ばたきが自然に切り替わる。
- ガラクロウはルミバネより大きな飛行敵として読みやすい。
- 影とHPバーが本体へ重ならない。
- 現在の敵数、プレイヤー操作、既存敵スプライトに意図しない変更がない。
