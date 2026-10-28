# Codex向け追加指示：モスプルン専用攻撃「苔跳びプレス」を導入

Project Eloriaのモスプルンへ、専用攻撃スプライトと着地同期の攻撃処理を追加してください。

攻撃の流れは「縮んで予兆 → 跳び上がる → 体当たり着地 → 柔らかく戻る」です。モスプルンの可愛さを残しながら、プレイヤーが予兆と回避タイミングを理解できる攻撃にします。

## 使用素材

- 画像：`assets/sprites/enemies/moss-plun/attacks/moss-plun-jump-slam-48px-v1.png`
- 設定：`assets/sprites/enemies/moss-plun/attacks/moss-plun-jump-slam-48px-v1.json`
- 基本画像：`assets/sprites/enemies/moss-plun/moss-plun-idle-hop-48px-v1.png`

攻撃画像は横6列×縦4行、1コマ48×48px、全体288×192pxの透過PNGです。

方向：

1. `down`
2. `up`
3. `left`
4. `right`

各行は全コマ同じ方向です。攻撃予兆開始時に保存した`enemy.attackDirection`から行を決め、攻撃中に別方向へ切り替えないでください。

## 1. 敵アクションスプライト基盤

今後ルミバネ、ガラクロウ、ウツロボウ、イワウロコにも専用攻撃を追加できるよう、既存の`EnemySpriteRenderer`を小さく拡張してください。

モスプルン専用の描画クラスを新設せず、次を扱える汎用構造にします。

- 基本画像：`idle`、`move`
- 任意の攻撃画像：`windup`、`attack`、`recover`
- 攻撃画像がない敵は従来の基本画像へフォールバック
- 攻撃画像のロード失敗時も基本画像で戦闘継続

型の例：

```ts
type EnemyActionSpritePhase = "windup" | "attack" | "recover";

interface EnemyActionSpriteConfig {
  imageUrl: string;
  directions: Record<SpriteDirection, EnemyDirectionFrames>;
  phases: Record<EnemyActionSpritePhase, EnemySpriteClipConfig>;
  drawScale: number;
  anchor: { x: number; y: number };
  hitEvent?: {
    phase: EnemyActionSpritePhase;
    frameWithinDirection: number;
    timeSeconds: number;
  };
}
```

既存のキャラクター用アクション画像ローダーを参考にして構いませんが、プレイヤーの`CharacterActionKind`へ敵の行動を混ぜないでください。

## 2. モスプルンのアクション登録

`enemySpriteConfig.ts`へ攻撃PNGとJSONを読み込み、`mossPlun`の任意アクションとして`jumpSlam`を登録してください。

基本画像の設定、描画倍率、方向オフセット、ロード状態を壊さないでください。

攻撃画像：

- `drawScale: 0.8`
- `anchor: { x: 0.5, y: 0.92 }`

基本画像と同じ大きさと接地点を使用します。

## 3. フェーズとフレーム

JSONの時間を使用します。

### `windup`：0.72秒

- フレーム0：少し縮む、0.30秒
- フレーム1：最大まで低く潰れる、0.42秒

### `attack`：0.36秒

- フレーム2：縦に伸びて跳び出す、0.08秒
- フレーム3：丸くなった空中頂点、0.10秒
- フレーム4：幅広く潰れた着地、0.18秒

### `recover`：0.72秒

- フレーム4：着地の余韻、0.16秒
- フレーム5：柔らかく形を戻す、0.56秒

`enemy.stateAge`は`setEnemyState()`でフェーズごとに0へ戻るため、各フェーズの経過時間として使用できます。ワールド時刻だけから攻撃フレームを選ばず、同じ攻撃を毎回フレーム0から再生してください。

攻撃画像の縦移動は画像内に作画済みです。描画側で追加のジャンプY座標やサイン波を重ねないでください。

## 4. 攻撃判定を着地へ同期

現在の`beginEnemyAttack()`は`basicMelee`の判定を攻撃開始直後に生成します。モスプルンだけは、着地フレームより前にダメージが発生しないよう変更してください。

### モスプルンの開始

- `windup`終了時に`attack`へ入る。
- モスプルンの`attack`時間だけ0.36秒にする。
- `beginEnemyAttack()`ではモスプルンの近接判定をまだ生成しない。
- 他の敵の既存処理は変更しない。

### 着地イベント

`updateEnemyAttack()`で、次をすべて満たした瞬間に一度だけ既存の`performMeleeEnemyStrike(enemy)`を呼びます。

- `enemy.kind === "mossPlun"`
- `enemy.aiState === "attack"`
- `enemy.stateAge >= 0.18`
- その攻撃でまだ着地判定を生成していない

既存の`enemy.attackConnected`を、非`heavyCharge`のモスプルンでは「今回の着地イベントを生成済み」の印として利用して構いません。着地判定を生成したら`true`にし、同一攻撃中に二重生成しないでください。

着地後は従来の`recover`へ移行します。ダメージ、ノックバック、攻撃クールダウンは現在のモスプルン設定を維持してください。

## 5. 攻撃中の移動

攻撃方向は`enemy.attackDirection`へ固定します。

- `windup`中：ワールド座標を動かさない。
- `attack`中：既存`basicMelee.attackSpeedRatio`で前方へ短く移動する。
- `recover`中：既存の後退処理を維持する。

画像内の上昇は見た目だけです。空中フレームでも当たり判定半径12を変更せず、無敵や高度判定を追加しないでください。

## 6. 影

モスプルン本体のワールド座標は攻撃中も地面の基準点です。影はその座標へ残し、画像内のジャンプだけで高さを表現します。

段階別の目安：

- `windup`：横13〜15px、縦4px
- `attack`フレーム2：横11px、縦3px
- 空中頂点フレーム3：横8px、縦2px、少し薄くする
- 着地フレーム4：横17px、縦4px
- `recover`：通常の横13px、縦4pxへ戻す

影は必ず本体より先に描画します。影そのものを上下移動させず、本体の真下へ維持してください。

## 7. 着地エフェクト

着地判定を生成した同じ瞬間に、既存のエフェクトプールを使って次を一度だけ出してください。

- 地面側の`impactRing`を1個
  - 大きさ：約24px
  - 寿命：約0.28秒
  - 色：`#b8d86a`
  - `layer: "back"`
- `leaf`を3〜4個
  - 小さく外側へ飛ぶ
  - 緑と黄緑
- `dust`を3〜4個
  - 地面に沿って短く広がる

新しいエフェクト種類は追加しないでください。画面全体の揺れや強いフラッシュは不要です。最初の基本敵なので、可愛く軽い衝撃に留めます。

## 8. 攻撃予兆

既存のオレンジ色予兆表示と0.72秒の猶予を維持してください。

モスプルン本体が縮む作画と予兆円が同時に見えることで、プレイヤーが回避タイミングを理解できます。予兆円を消したり、時間を短くしたりしないでください。

## 9. フォールバック

攻撃画像が`loading`または`failed`の場合：

- 基本のモスプルン画像を表示する。
- 既存の予兆用`squash`を維持する。
- 着地時刻とダメージ判定は正式画像の有無にかかわらず同じ。
- 画像ロード失敗で攻撃処理を停止しない。

## 10. 開発用QA

既存の敵QAへ、モスプルンの攻撃を固定再生できる開発用パラメータを追加してください。

例：

```text
?enemyActionQa=jumpSlam&enemySpriteQaKind=mossPlun&enemySpriteQa=down
?enemyActionQa=jumpSlam&enemySpriteQaKind=mossPlun&enemySpriteQa=left
```

可能なら次の固定確認も用意してください。

- `enemyActionQaPhase=windup`
- `enemyActionQaPhase=attack`
- `enemyActionQaPhase=recover`
- `enemyActionQaFrame=0`〜`5`

すべて`import.meta.env.DEV`内に限定してください。

## 11. テスト

最低限、次を追加または更新してください。

- 攻撃画像が288×192、48×48の24コマとして読み込まれる。
- 4方向の行が正しく選ばれる。
- `windup`、`attack`、`recover`のフレーム時間がJSONどおり。
- 攻撃方向が予兆開始後に変わらない。
- ダメージは着地フレーム4の開始時に一度だけ発生する。
- 予兆終了時や空中頂点ではまだダメージが発生しない。
- 画像ロード失敗時も同じ着地時刻で攻撃判定が出る。
- モスプルンのHP58、ダメージ18、半径12、クールダウン1.8秒が変わっていない。
- モスプルンの通常ホップと接地影が攻撃外では従来どおり。
- 他の敵の攻撃タイミング、AI、描画が変わっていない。

最後に次を実行してください。

```bash
npm test
npm run build
```

## 完了条件

- モスプルンが縮んでから跳び、着地して柔らかく戻る。
- 予兆を見て回避できる。
- 着地絵、ダメージ、衝撃波、葉と土埃が同じ瞬間に発生する。
- 攻撃1回につきダメージ判定は1回だけ。
- 可愛さを保ちつつ、攻撃として明確に読める。
- 通常ホップ、モスプルン以外の敵、プレイヤー側に意図しない変更がない。
