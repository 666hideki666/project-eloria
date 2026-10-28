# Codex向け追加指示：ウツロボウ専用攻撃「仮面呪波」を導入

Project Eloriaのウツロボウへ、専用攻撃「仮面呪波」のスプライトと円形攻撃を追加してください。

攻撃の流れは「身体を縮める → 両手を持ち上げて溜める → 仮面を突き出す → 石仮面の紋様から呪波を放つ → 布と両手が戻る」です。

モスプルンの跳躍、ルミバネとガラクロウの突進とは異なり、ウツロボウはその場に停止して周囲へ短い円形攻撃を放ちます。

## 使用素材

- 画像：`assets/sprites/enemies/utsurobou/attacks/utsurobou-mask-curse-wave-48px-v1.png`
- 設定：`assets/sprites/enemies/utsurobou/attacks/utsurobou-mask-curse-wave-48px-v1.json`
- 基本画像：`assets/sprites/enemies/utsurobou/utsurobou-idle-drift-48px-v1.png`

攻撃画像は横6列×縦4行、1コマ48×48px、全体288×192pxの透過PNGです。各行は`down`、`up`、`left`、`right`の順です。

予兆開始時に保存した`enemy.attackDirection`から行を決め、攻撃終了まで固定してください。

## 1. 既存の敵アクション基盤を再利用

これまでに追加した次の仕組みをそのまま使用します。

- `EnemyActionSpriteConfig`
- `createEnemyActionSpriteConfig()`
- `windup`、`attack`、`recover`フェーズ
- アクション画像の非同期ロード
- 基本画像へのフォールバック
- `enemy.stateAge`による非ループ再生
- `enemyActionQa`開発用確認

ウツロボウ専用の画像ローダーや描画クラスは追加しないでください。

## 2. アクション登録

`enemySpriteConfig.ts`へPNGとJSONを読み込みます。

```ts
export const UTSUROBOU_MASK_CURSE_WAVE_SPRITE =
  createEnemyActionSpriteConfig(
    utsurobouMaskCurseWaveSpriteUrl,
    utsurobouMaskCurseWaveFrameData,
  );

export const UTSUROBOU_SPRITE: EnemySpriteConfig = {
  ...createEnemySpriteConfig(utsurobouSpriteUrl, utsurobouFrameData),
  actions: {
    maskCurseWave: UTSUROBOU_MASK_CURSE_WAVE_SPRITE,
  },
};
```

基本画像と同じ`drawScale: 0.8`、`anchor: { x: 0.5, y: 0.92 }`を使います。

## 3. フェーズ

### `windup`：0.72秒

- フレーム0：身体を縮め、仮面の光を弱める、0.32秒
- フレーム1：両手を持ち上げて溜める、0.40秒

既存の`basicMelee.windupDuration: 0.72`と一致させます。

### `attack`：0.34秒

- フレーム2：両手と仮面を前へ出す、0.08秒
- フレーム3：布が最大に広がり、呪波を放つ、0.10秒
- フレーム4：反動で身体が戻り始める、0.16秒

### `recover`：0.72秒

- フレーム4：反動の余韻、0.18秒
- フレーム5：通常の浮遊姿勢へ戻る、0.54秒

## 4. 攻撃判定を仮面発光コマへ同期

ウツロボウだけ、`beginEnemyAttack()`での即時近接判定を停止します。

- ウツロボウの`attack`時間を0.34秒にする。
- 攻撃開始時に前進させない。
- `updateEnemyAttack()`で`stateAge >= 0.08`となった瞬間に一度だけ専用の円形判定を生成する。
- 判定後も0.34秒までは`attack`を継続し、反動フレームを表示する。
- `enemy.attackConnected`を今回の判定生成済みフラグとして使用して構わない。

## 5. 円形攻撃

ウツロボウ自身を中心とする円形攻撃です。

- 中心：`enemy.pos`
- 半径：46px
- ダメージ：既存の16
- ノックバック：20
- 1回の攻撃につき判定1回
- 攻撃中の移動速度：0

予兆0.72秒の間に円の外へ逃げられる、チュートリアル向けの攻撃にしてください。

共有の`performMeleeEnemyStrike()`を変更して他の敵まで円形攻撃にしないでください。ウツロボウ専用ヘルパーを追加します。

`config.ts`へ専用定数を追加してください。

```ts
export const UTSUROBOU_MASK_CURSE_WAVE = {
  attackDuration: 0.34,
  impactTime: 0.08,
  attackSpeedRatio: 0,
  radius: 46,
  knockback: 20,
  impactRing: {
    life: 0.32,
    size: 42,
    color: "#75ddd2",
  },
  sparkCount: 6,
} as const;
```

ウツロボウのHP70、ダメージ16、クールダウン2.2秒は変更しません。

## 6. 予兆表示

既存の攻撃予兆に加えて、`windup`中は足元へ薄い円を表示してください。

- 半径は時間とともに30pxから46pxへ広がる。
- 線幅1〜2px
- 色：`#75ddd2`
- 透明度：0.18から0.42
- 点滅させず、ゆっくり明るくする。

これは当たり判定範囲をプレイヤーへ伝える表示です。画像へ描き込まず、Renderer側で生成してください。

## 7. 呪波エフェクト

命中イベントと同じ瞬間に既存エフェクトだけを使用します。

- `impactRing`を2個
  - 1個目：大きさ42px、寿命0.32秒、色`#75ddd2`
  - 2個目：大きさ30px、寿命0.24秒、色`#b5f3e7`
- `spark`を6個
  - 円周方向へ飛ばす。
  - 水色と薄紫を交互にする。
- `wind`を2個
  - 左右へ短く流し、布が広がった反動を示す。

新しいエフェクト種類や大きな画面揺れは追加しません。

## 8. 石仮面の向き

- `down`：石仮面を正面から表示
- `up`：仮面を完全に隠し、フードの背面だけ表示
- `left`：左向きの仮面側面
- `right`：右向きの仮面側面

行のミラー生成や、背面への仮面追加をしないでください。

## 9. 影

ウツロボウは浮遊敵です。現在の小さな浮遊影を維持します。

- 攻撃中も本体から少し離す。
- `windup`でわずかに縮める。
- 呪波の瞬間だけ横幅を約10pxへ広げる。
- イワウロコの接地影を流用しない。

## 10. 確認用アリーナ

現在のモスプルン、ガラクロウ、ウツロボウの3体構成をそのまま維持してください。ウツロボウの位置や他2体の専用攻撃を削除・変更しません。

## 11. フォールバック

攻撃画像が`loading`または`failed`の場合：

- 基本のウツロボウ画像を表示
- 予兆円を維持
- 停止、0.08秒の円形判定、ダメージ、攻撃範囲は正式画像と同一
- 画像ロード失敗で攻撃を停止しない

## 12. 開発用QA

```text
?enemyActionQa=maskCurseWave&enemySpriteQaKind=utsurobou&enemySpriteQa=down
?enemyActionQa=maskCurseWave&enemySpriteQaKind=utsurobou&enemySpriteQa=up
?enemyActionQa=maskCurseWave&enemySpriteQaKind=utsurobou&enemySpriteQa=left
?enemyActionQa=maskCurseWave&enemySpriteQaKind=utsurobou&enemySpriteQa=right&enemyActionQaPhase=attack
```

固定フレーム0〜5も`enemyActionQaFrame`で確認してください。

## 13. テスト

最低限、次を確認してください。

- 攻撃画像が288×192、48×48の24コマとして読み込まれる。
- 正面、背面、左右の仮面表示が正しい。
- `windup`0.72秒、`attack`0.34秒、`recover`0.72秒。
- 攻撃開始0.08秒、フレーム3の開始時に判定が一度だけ発生する。
- 攻撃中、ウツロボウが前進しない。
- 判定後も反動フレームまで再生される。
- 半径46pxの外にいるキャラクターはダメージを受けない。
- ダメージ16、HP70、クールダウン2.2秒が変わっていない。
- 背面に石仮面が表示されない。
- モスプルン、ガラクロウ、ルミバネ、イワウロコの実装が変わっていない。

最後に実行してください。

```bash
npm test
npm run build
```

## 完了条件

- ウツロボウが停止して両手と布を広げ、仮面の発光と同時に円形呪波を放つ。
- 予兆円を見て、プレイヤーが範囲外へ逃げられる。
- 攻撃1回につき判定は1回だけ。
- 石仮面の4方向表現が正しい。
- モスプルン、ガラクロウ、他の敵とプレイヤー操作に意図しない変更がない。
