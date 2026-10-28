# Codex向け追加指示：ガラクロウ専用攻撃「黒翼急襲」を導入

Project Eloriaのガラクロウへ、専用攻撃「黒翼急襲」のスプライトと着弾同期処理を追加してください。

攻撃の流れは「翼を高く広げて威嚇 → 身体を引く → 翼を畳んで急降下 → くちばしで一撃 → 大翼で急制動 → 重い浮遊姿勢へ戻る」です。ルミバネの高速突進より遅く、攻撃範囲と重量感を一段大きく見せます。

## 使用素材

- 画像：`assets/sprites/enemies/garacrow/attacks/garacrow-dive-strike-48px-v1.png`
- 設定：`assets/sprites/enemies/garacrow/attacks/garacrow-dive-strike-48px-v1.json`
- 基本画像：`assets/sprites/enemies/garacrow/garacrow-idle-flight-48px-v1.png`

攻撃画像は横6列×縦4行、1コマ48×48px、全体288×192pxの透過PNGです。各行は`down`、`up`、`left`、`right`の順です。

予兆開始時に保存した`enemy.attackDirection`から行を決め、攻撃終了まで固定してください。

## 1. 既存の敵アクション基盤を再利用

モスプルンとルミバネで追加済みの次の仕組みをそのまま使用します。

- `EnemyActionSpriteConfig`
- `createEnemyActionSpriteConfig()`
- `windup`、`attack`、`recover`フェーズ
- アクション画像の非同期ロード
- 基本画像へのフォールバック
- `enemy.stateAge`による非ループ再生
- `enemyActionQa`開発用確認

ガラクロウ専用の画像ローダーや描画クラスは追加しないでください。

## 2. アクション登録

`enemySpriteConfig.ts`へPNGとJSONを読み込みます。

```ts
export const GARACROW_DIVE_STRIKE_SPRITE =
  createEnemyActionSpriteConfig(
    garacrowDiveStrikeSpriteUrl,
    garacrowDiveStrikeFrameData,
  );

export const GARACROW_SPRITE: EnemySpriteConfig = {
  ...createEnemySpriteConfig(garacrowSpriteUrl, garacrowFrameData),
  actions: {
    diveStrike: GARACROW_DIVE_STRIKE_SPRITE,
  },
};
```

攻撃画像は基本画像と同じ`drawScale: 0.92`、`anchor: { x: 0.5, y: 0.88 }`を使います。

## 3. フェーズ

### `windup`：0.72秒

- フレーム0：翼を高く広げて威嚇、0.34秒
- フレーム1：身体を引き、翼を畳み始める、0.38秒

既存の`basicMelee.windupDuration: 0.72`と一致させます。

### `attack`：0.34秒

- フレーム2：翼を畳んで急降下開始、0.08秒
- フレーム3：くちばしを突き出す命中姿勢、0.10秒
- フレーム4：大きく翼を開く急制動、0.16秒

### `recover`：0.72秒

- フレーム4：急制動の余韻、0.18秒
- フレーム5：重い浮遊姿勢へ戻る、0.54秒

既存の`basicMelee.recoverDuration: 0.72`と一致させます。

## 4. 攻撃判定をくちばしのコマへ同期

ガラクロウだけ、攻撃開始直後の即時近接判定を停止します。

### 攻撃開始

- ガラクロウの`attack`時間を0.34秒にする。
- `beginEnemyAttack()`ではガラクロウの`performMeleeEnemyStrike()`をまだ呼ばない。
- 予兆開始時に保存した`attackDirection`を維持し、攻撃開始時に再計算しない。
- モスプルン、ルミバネ、その他の敵の処理は変更しない。

### 命中イベント

`updateEnemyAttack()`で次を満たした瞬間に一度だけガラクロウの攻撃判定を生成します。

- `enemy.kind === "garacrow"`
- `enemy.stateAge >= 0.08`
- その攻撃でイベント未生成

`enemy.attackConnected`を「今回の急襲判定を生成済み」の印として使用して構いません。ただし命中イベント後も0.34秒までは`attack`を継続し、フレーム4の急制動を表示してください。壁に当たった場合だけ安全に早期終了します。

## 5. ガラクロウ専用の判定

既存ダメージ22とクールダウン2.1秒は維持します。大柄な攻撃として、ルミバネより一回り広い次の判定にしてください。

- 判定中心：`enemy.pos + attackDirection * 18px`
- 判定半径：30px
- ノックバック：46
- 1回の攻撃につき1回だけ

共有の`performMeleeEnemyStrike()`を直接変更して他の敵まで広げないでください。小さな専用ヘルパー、または引数付きの共通ヘルパーでガラクロウだけへ適用します。

## 6. 急降下速度

ガラクロウ専用定数を`config.ts`へ追加してください。

```ts
export const GARACROW_DIVE_STRIKE = {
  attackDuration: 0.34,
  impactTime: 0.08,
  attackSpeedRatio: 1.35,
  impactRadius: 30,
  impactOffset: 18,
  knockback: 46,
  impactRing: {
    life: 0.24,
    size: 22,
    color: "#65cfc4",
  },
  windCount: 3,
  sparkCount: 3,
} as const;
```

- `windup`中は停止
- `attack`中は`enemy.attackDirection`へ直進
- `recover`は既存の後退・再配置処理
- 画面外へ出ないよう既存の`clampToArena()`を維持

共有`basicMelee.attackSpeedRatio`は変更しません。

## 7. 影

ガラクロウは大型飛行敵です。現在の浮遊位置を維持し、イワウロコの接地修正は流用しないでください。

- 予兆：横12px、縦3px
- 急降下：進行方向へ少し長く、横14px前後
- 急制動：横16px、縦3px
- 透明度：現在の約0.24

本体へ影を密着させたり、表示上の追加ジャンプを重ねたりしないでください。

## 8. 急襲エフェクト

命中イベントと同じ瞬間に、既存エフェクトだけを使用します。

- `impactRing`を1個
  - 大きさ：約22px
  - 寿命：約0.24秒
  - 色：`#65cfc4`
- `wind`を3個
  - 翼が空気を切る太めの流れ
  - 色：`#4d9f9a`と`#72d9cf`
- `spark`を3個
  - 結晶羽を思わせる小さな水色

新しいエフェクト種類は追加しません。画面揺れを使う場合も`triggerImpact(1)`程度のごく小さい強さに留めてください。

## 9. 確認用アリーナ

モスプルンを必ず残し、ガラクロウを確認できる構成へ変更してください。

```ts
createEnemy(1, "mossPlun", 425, 132, wave),
createEnemy(2, "garacrow", 485, 244, wave),
createEnemy(3, "utsurobou", 505, 178, wave),
```

ルミバネは確認画面から外れても、正式画像、「光羽突進」、戦闘設定、フォールバック、QA機能を削除しないでください。モスプルンの可愛いホップと「苔跳びプレス」も維持します。

## 10. フォールバック

攻撃画像が`loading`または`failed`の場合：

- 基本のガラクロウ画像を表示
- 既存の予兆表示を維持
- 急降下速度、0.08秒の判定、ダメージ、判定範囲は正式画像と同一
- 画像ロード失敗で攻撃を停止しない

## 11. 開発用QA

既存QAをそのまま使います。

```text
?enemyActionQa=diveStrike&enemySpriteQaKind=garacrow&enemySpriteQa=down
?enemyActionQa=diveStrike&enemySpriteQaKind=garacrow&enemySpriteQa=left
?enemyActionQa=diveStrike&enemySpriteQaKind=garacrow&enemySpriteQa=right&enemyActionQaPhase=attack
```

固定フレーム0〜5も既存の`enemyActionQaFrame`で確認してください。

## 12. テスト

最低限、次を確認してください。

- 攻撃画像が288×192、48×48の24コマとして読み込まれる。
- 4方向が正しい。
- `windup`0.72秒、`attack`0.34秒、`recover`0.72秒。
- 攻撃方向が予兆開始後に変わらない。
- ダメージ判定は攻撃開始0.08秒、フレーム3の開始時に一度だけ。
- 判定後も急制動フレームまで再生し、二重ダメージが起きない。
- ガラクロウだけ速度比1.35、半径30、オフセット18、ノックバック46を使う。
- ガラクロウのHP88、ダメージ22、半径15、クールダウン2.1秒が変わっていない。
- 壁衝突時と画像ロード失敗時も安全に攻撃が完了する。
- モスプルンとルミバネの専用攻撃が変わっていない。
- ウツロボウとイワウロコを含む他の敵実装が削除されていない。

最後に実行してください。

```bash
npm test
npm run build
```

## 完了条件

- ガラクロウが大翼で威嚇してから、翼を畳んで重く急降下する。
- くちばしの命中姿勢、判定、風と結晶羽のエフェクトが同期する。
- 攻撃1回につき判定は1回だけ。
- ルミバネより遅く、広く、重い攻撃として遊び分けられる。
- モスプルンが確認画面に残り、可愛いホップと攻撃を続ける。
- 他の敵とプレイヤー操作に意図しない変更がない。
