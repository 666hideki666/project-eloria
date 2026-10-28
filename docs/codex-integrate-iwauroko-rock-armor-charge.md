# Codex向け追加指示：イワウロコ専用攻撃「岩甲突進」を導入

Project Eloriaのイワウロコへ、専用攻撃「岩甲突進」のスプライトを追加してください。

攻撃の流れは「四肢を踏ん張る → 頭部の岩鱗を低く構える → 地面を這うように突進 → 頭部から激突 → 前脚で制動 → 重い通常姿勢へ戻る」です。

既存の`heavyCharge`による移動、接触判定、ダメージ処理は完成しているため、今回はその挙動へ専用アニメーションを同期します。

## 使用素材

- 画像：`assets/sprites/enemies/iwauroko/attacks/iwauroko-rock-armor-charge-48px-v2.png`
- 設定：`assets/sprites/enemies/iwauroko/attacks/iwauroko-rock-armor-charge-48px-v2.json`
- 基本画像：`assets/sprites/enemies/iwauroko/iwauroko-idle-crawl-48px-v1.png`

攻撃画像は横6列×縦4行、1コマ48×48px、全体288×192pxの透過PNGです。各行は`down`、`up`、`left`、`right`の順です。

## 1. 既存の敵アクション基盤を再利用

- `EnemyActionSpriteConfig`
- `createEnemyActionSpriteConfig()`
- `windup`、`attack`、`recover`フェーズ
- アクション画像の非同期ロード
- 基本画像へのフォールバック
- `enemy.stateAge`による非ループ再生
- `enemyActionQa`

新しい画像ローダーやイワウロコ専用描画クラスは追加しないでください。

## 2. アクション登録

`enemySpriteConfig.ts`へPNGとJSONを読み込みます。

```ts
export const IWAUROKO_ROCK_ARMOR_CHARGE_SPRITE =
  createEnemyActionSpriteConfig(
    iwaUrokoRockArmorChargeSpriteUrl,
    iwaUrokoRockArmorChargeFrameData,
  );

export const IWAUROKO_SPRITE: EnemySpriteConfig = {
  ...createEnemySpriteConfig(iwaurokoSpriteUrl, iwaurokoFrameData),
  actions: {
    rockArmorCharge: IWAUROKO_ROCK_ARMOR_CHARGE_SPRITE,
  },
};
```

基本画像と同じ`drawScale: 0.94`、`anchor: { x: 0.5, y: 0.82 }`を使用します。

## 3. フェーズ

既存`heavyCharge`の時間と一致させます。

### `windup`：1.15秒

- フレーム0：四肢を広く踏ん張る、0.55秒
- フレーム1：頭部をさらに低く構えて溜める、0.60秒

### `attack`：0.42秒

- フレーム2：低い姿勢で突進、0.20秒
- フレーム3：岩鱗を正面へ向けた激突姿勢、0.22秒

### `recover`：1.30秒

- フレーム4：前脚と尾で制動する、0.30秒
- フレーム5：通常の重い姿勢へ戻る、1.00秒

壁またはキャラクターへ接触して攻撃が早く終了した場合は、すぐ`recover`へ入りフレーム4から再生してください。

## 4. 攻撃方向

`windup`開始時に確定した`enemy.attackDirection`を、攻撃と回復が終わるまで維持します。

- `down`は全コマ正面向き
- `up`は全コマ背面向き
- `left`は全コマ左向き
- `right`は全コマ右向き

正面・背面の途中で横向きへ切り替えたり、左右行を実行時ミラーで生成したりしないでください。

## 5. 既存の接触判定を維持

この攻撃は固定時刻の`hitEvent`ではなく、現在の`heavyCharge`接触判定を使います。

- 突進時間：0.42秒
- 突進速度比：2.15
- キャラクターとの接触条件：既存の半径計算
- ダメージ：30
- 攻撃クールダウン：2.7秒
- 1回の突進で1キャラクターへ1回だけ
- 壁へ接触したら回復へ移行

`performMeleeEnemyStrike()`や新しい円形判定は呼ばないでください。HP132、岩鱗値42、経験値28も変更しません。

## 6. 接地

イワウロコは全コマで地面に接しています。

- `anchor.y`は0.82を維持
- 影は現在の接地影を維持
- 腹と前脚が影へ少し重なる位置
- 突進中も上下ボブ、ジャンプ、浮遊補正を追加しない
- `drawScale`変更による浮き上がりを起こさない

## 7. 岩鱗破壊時

このアクションシートは岩鱗が残っている姿だけを収録しています。

`enemy.armor === 0`では、現在の`resolveIwaUrokoRenderMode()`と破壊後フォールバックを優先してください。

- 岩鱗あり：専用「岩甲突進」画像
- 岩鱗なし：既存の破壊後フォールバック

岩鱗が壊れた状態で、完全な岩甲画像へ戻さないでください。破壊後の専用シートは今回は作りません。

## 8. 突進エフェクト

既存の`heavyCharge`の砂埃を維持し、次だけ調整してください。

- `windup`終盤：前脚の左右へ小さな`dust`を各1個
- 突進中：後方へ短い`dust`を最大3個
- 壁またはキャラクターへ接触：既存の回復開始時の砂埃8個
- 色：現在の`#78866a`と`#b6a86e`

新しいエフェクト種類、岩の飛散物、大きな画面揺れは追加しません。エフェクトで本体を隠さないでください。

## 9. 確認用アリーナ

モスプルンを残し、イワウロコを通常プレイでも確認できる構成へ変更してください。

```ts
createEnemy(1, "mossPlun", 425, 132, wave),
createEnemy(2, "iwaUroko", 485, 244, wave),
createEnemy(3, "utsurobou", 505, 178, wave),
```

ガラクロウは確認画面から外れても、v2攻撃画像、「黒翼急襲」、AI、フォールバック、QA機能を削除しないでください。モスプルンの可愛いホップも維持します。

## 10. フォールバック

岩鱗が残っていて、攻撃画像が`loading`または`failed`の場合：

- 基本のイワウロコ画像で既存`heavyCharge`を表示
- 突進速度、接触判定、ダメージは正式画像と同一
- 画像ロード失敗で突進を停止しない

岩鱗がゼロの場合は、画像ロード状態にかかわらず破壊後フォールバックを使います。

## 11. 開発用QA

```text
?enemyActionQa=rockArmorCharge&enemySpriteQaKind=iwaUroko&enemySpriteQa=down
?enemyActionQa=rockArmorCharge&enemySpriteQaKind=iwaUroko&enemySpriteQa=up
?enemyActionQa=rockArmorCharge&enemySpriteQaKind=iwaUroko&enemySpriteQa=left
?enemyActionQa=rockArmorCharge&enemySpriteQaKind=iwaUroko&enemySpriteQa=right&enemyActionQaPhase=attack
```

固定フレーム0〜5も`enemyActionQaFrame`で確認してください。

## 12. テスト

最低限、次を確認してください。

- 攻撃画像が288×192、48×48の24コマとして読み込まれる。
- 4方向が全フェーズで固定される。
- `windup`1.15秒、`attack`0.42秒、`recover`1.30秒。
- 攻撃方向が予兆開始後に変わらない。
- 突進速度比2.15と既存の物理接触判定が変わっていない。
- 接触または壁衝突時、制動フレームから回復する。
- イワウロコが全コマで接地している。
- 岩鱗ゼロでは破壊後フォールバックを使う。
- HP132、岩鱗42、ダメージ30、クールダウン2.7秒、経験値28が変わっていない。
- モスプルン、ガラクロウ、ルミバネ、ウツロボウの専用攻撃が変わっていない。

最後に実行してください。

```bash
npm test
npm run build
```

## 完了条件

- イワウロコが頭部の岩鱗を低く構え、地面を這うように重く突進する。
- 予兆、突進、接触、制動が既存の`heavyCharge`挙動と同期する。
- 接地したまま動き、宙に浮いて見えない。
- 岩鱗破壊後の表示が完全な岩甲姿へ戻らない。
- モスプルンが確認画面に残り、他の敵とプレイヤー操作に意図しない変更がない。
