# Codex向け追加指示：ルミバネ専用攻撃「光羽突進」を導入

Project Eloriaのルミバネへ、専用攻撃「光羽突進」のスプライトと着弾同期処理を追加してください。

攻撃の流れは「翼を開いて警戒 → 身体を引いて溜める → 細い姿で高速突進 → 翼を広げてブレーキ → 浮遊姿勢へ戻る」です。

## 使用素材

- 画像：`assets/sprites/enemies/lumibane/attacks/lumibane-luminous-dash-48px-v1.png`
- 設定：`assets/sprites/enemies/lumibane/attacks/lumibane-luminous-dash-48px-v1.json`
- 基本画像：`assets/sprites/enemies/lumibane/lumibane-idle-flight-48px-v2.png`

攻撃画像は横6列×縦4行、1コマ48×48px、全体288×192pxの透過PNGです。

各行：

1. `down`
2. `up`
3. `left`
4. `right`

攻撃予兆開始時に保存した`enemy.attackDirection`から行を決め、攻撃終了まで固定してください。

## 1. モスプルンで作った基盤を再利用

モスプルンの「苔跳びプレス」で追加した次の仕組みをそのまま使用します。

- `EnemyActionSpriteConfig`
- `createEnemyActionSpriteConfig()`
- `windup`、`attack`、`recover`フェーズ
- アクション画像の非同期ロード
- 基本画像へのフォールバック
- `enemy.stateAge`による非ループ再生
- `enemyActionQa`開発用確認

ルミバネ専用の画像ローダーや描画クラスを追加しないでください。

## 2. アクション登録

`enemySpriteConfig.ts`へPNGとJSONを読み込みます。

```ts
export const LUMIBANE_LUMINOUS_DASH_SPRITE =
  createEnemyActionSpriteConfig(
    lumibaneLuminousDashSpriteUrl,
    lumibaneLuminousDashFrameData,
  );
```

`LUMIBANE_SPRITE`の`actions`へ登録してください。

```ts
actions: {
  luminousDash: LUMIBANE_LUMINOUS_DASH_SPRITE,
},
```

攻撃画像：

- `drawScale: 0.72`
- `anchor: { x: 0.5, y: 0.86 }`

基本画像と同じ表示倍率と浮遊基準を使います。

## 3. フェーズ

### `windup`：0.45秒

- フレーム0：翼を高く開いて警戒、0.20秒
- フレーム1：翼を畳み、身体を引く、0.25秒

既存の`swarm.windupDuration: 0.45`と一致させます。

### `attack`：0.24秒

- フレーム2：突進開始、0.05秒
- フレーム3：細くまとまった攻撃姿勢、0.07秒
- フレーム4：翼を大きく開くブレーキ、0.12秒

### `recover`：0.42秒

- フレーム4：ブレーキの余韻、0.12秒
- フレーム5：通常の浮遊姿勢へ戻る、0.30秒

既存の`swarm.recoverDuration: 0.42`と一致させます。

## 4. 攻撃判定を突進コマへ同期

現在はモスプルン以外の非`heavyCharge`敵が、`beginEnemyAttack()`で即座に近接判定を生成します。ルミバネだけは突進フレームと一致させてください。

### 攻撃開始

- ルミバネの`attack`時間を0.24秒にする。
- `beginEnemyAttack()`ではルミバネの`performMeleeEnemyStrike()`をまだ呼ばない。
- `attackDirection`は予兆開始時の値を維持し、攻撃開始時に再計算しない。
- モスプルンと他の敵の処理は変更しない。

### 命中イベント

`updateEnemyAttack()`で次を満たした瞬間に、一度だけ既存の近接判定を生成します。

- `enemy.kind === "lumibane"`
- `enemy.stateAge >= 0.05`
- その攻撃でイベント未生成

`enemy.attackConnected`をルミバネでは「今回の突進判定を生成済み」の印として利用して構いません。イベント生成後は従来どおり`recover`へ入り、フレーム4と5でブレーキを見せます。

ダメージ12、半径10、クールダウン1.5秒は変更しないでください。

## 5. 突進速度

通常の接近速度と差を出すため、ルミバネの`attack`中だけ次を使用してください。

```ts
attackSpeedRatio: 1.65
```

これはルミバネ専用定数へ置き、共有`swarm.attackSpeedRatio`を変更しないでください。

- `windup`中は停止
- `attack`中は`enemy.attackDirection`へ直進
- `recover`は既存の後退・再配置処理

壁へ当たった場合は従来どおり安全に攻撃を終了します。画面外へ出ないよう、既存の`clampToArena()`を維持してください。

## 6. 影

ルミバネは飛行敵なので、影は本体から少し離れた現在の浮遊位置を維持します。イワウロコの接地修正を流用しないでください。

目安：

- `windup`：横8px、縦2px
- 突進：進行方向へわずかに細長くする
- ブレーキ：横10px、縦2px
- 透明度：現在の約0.22

影を本体へ密着させず、ジャンプや上下ボブも追加しません。

## 7. 突進エフェクト

命中イベントと同じ瞬間に、既存エフェクトだけを使用します。

- `impactRing`を1個
  - 大きさ：約15px
  - 寿命：約0.18秒
  - 色：`#8df4e5`
- `wind`を2個
  - 攻撃方向へ細く流す
  - 色：`#65dccc`
- `spark`を2〜3個
  - 小さな水色

新しいエフェクト種類や画面揺れは追加しません。ルミバネ本体より派手にならない軽い閃光にしてください。

## 8. 確認用アリーナ

モスプルンを残したまま、ルミバネを通常プレイでも確認できる構成へ変更してください。

```ts
createEnemy(1, "mossPlun", 425, 132, wave),
createEnemy(2, "lumibane", 485, 244, wave),
createEnemy(3, "utsurobou", 505, 178, wave),
```

モスプルンの可愛いホップと「苔跳びプレス」は維持します。

イワウロコは確認画面から外れますが、正式画像、接地修正、戦闘設定、フォールバック、QA機能を削除しないでください。

## 9. フォールバック

攻撃画像が`loading`または`failed`の場合：

- 基本のルミバネ画像を表示
- 既存の予兆表示を維持
- 突進速度、0.05秒の判定、ダメージは正式画像と同一
- 画像ロード失敗で攻撃を停止しない

## 10. 開発用QA

既存のQAをそのまま使います。

```text
?enemyActionQa=luminousDash&enemySpriteQaKind=lumibane&enemySpriteQa=down
?enemyActionQa=luminousDash&enemySpriteQaKind=lumibane&enemySpriteQa=left
?enemyActionQa=luminousDash&enemySpriteQaKind=lumibane&enemySpriteQa=right&enemyActionQaPhase=attack
```

固定フレーム0〜5も既存の`enemyActionQaFrame`で確認してください。

## 11. テスト

最低限、次を確認してください。

- 攻撃画像が288×192、48×48の24コマとして読み込まれる。
- 4方向が正しい。
- `windup`0.45秒、`attack`0.24秒、`recover`0.42秒。
- 攻撃方向が予兆開始後に変わらない。
- ダメージ判定は攻撃開始0.05秒、フレーム3の開始時に一度だけ。
- 予兆中とフレーム2開始時にはまだダメージが発生しない。
- ルミバネだけ突進速度比1.65を使う。
- ルミバネのHP42、ダメージ12、半径10、クールダウン1.5秒が変わっていない。
- 画像ロード失敗時も攻撃処理が同じ。
- モスプルンの通常ホップと専用攻撃が変わっていない。
- イワウロコを含む他の敵実装が削除されていない。

最後に実行してください。

```bash
npm test
npm run build
```

## 完了条件

- ルミバネが翼を畳んでから素早く突進し、翼を開いて止まる。
- 予兆、突進姿勢、ダメージ、軽い閃光が同期する。
- 攻撃1回につき判定は1回だけ。
- モスプルンが確認画面に残り、可愛いホップと攻撃を続ける。
- 他の敵とプレイヤー操作に意図しない変更がない。
