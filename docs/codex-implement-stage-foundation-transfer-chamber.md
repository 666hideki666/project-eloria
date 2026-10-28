# Codex向け実装指示：ステージ基盤と第1エリア「転送の間」

> **旧基盤の記録**：この指示書で作成した転送の間の描画、調査、探索中の1人表示は維持する。ただし「1部屋＝1画面」の固定画面方式は2026-08-11に廃止し、今後は`docs/codex-implement-scrolling-layer1-moss-root-ruins.md`の連続スクロール方式を正とする。

## 実行設定

- 推奨モデル：`GPT-5.6 Terra`
- 推論レベル：`High`
- `Ultra`への変更：不要
- 理由：既存の戦闘を保存したまま、ゲーム状態・衝突・描画・HUDへ部屋の概念を追加する中規模実装だから。

Project Eloriaへ、森の遺跡第1ステージの入口となる「転送の間」を実装してください。

今回はステージ全体を一度に作らず、次の2点だけを完成させます。

1. 後から8部屋へ拡張できる固定画面式の部屋システム
2. 敵のいない第1エリア「転送の間」を歩ける状態

既存の戦闘アリーナ、3キャラクター、敵AI、攻撃、音、HUD、QA機能を壊さないでください。

## 参照資料

- ステージ仕様：`docs/game-design-first-stage.md`
- 背景コンセプト：`assets/concepts/environments/crystal-dungeon-01/transfer-chamber-moss-corridor-v1.png`

コンセプト画像は世界観・色・配置の参考です。ゲーム背景として直接切り抜いたり、画像を上書きしたりしないでください。今回はCanvas描画で実装します。

## 1. 固定画面式を採用

第1ステージは、昔の見下ろし型アクションアドベンチャーのように「1部屋＝1画面」で構成します。

- Canvas内部解像度：現在の640×360を維持
- スクロールカメラ：今回は追加しない
- 部屋の端へ到達すると次の部屋へ切り替わる設計にする
- 今回は次の部屋へまだ遷移せず、北側出口を閉じた状態にする

大きなワールド座標、カメラクラス、タイルマップライブラリ、外部マップエディタは追加しません。

## 2. ステージと部屋の型

新しいファイルを作成します。

```text
src/stage/types.ts
src/stage/roomDefinitions.ts
src/stage/roomCollision.ts
```

最低限、次の型を用意してください。

```ts
export type StageId = "forestRuins01";

export type RoomId =
  | "transferChamber"
  | "mossCorridor"
  | "luminousGarden"
  | "brokenBridge"
  | "spiritClothHall"
  | "stoneScalePassage"
  | "guardianAntechamber"
  | "crystalAltar";

export interface RectBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CircleObstacle {
  kind: "circle";
  x: number;
  y: number;
  radius: number;
}

export interface RectObstacle extends RectBounds {
  kind: "rect";
}

export type RoomObstacle = CircleObstacle | RectObstacle;

export interface StageRoomDefinition {
  id: RoomId;
  name: string;
  bounds: RectBounds;
  spawn: { x: number; y: number };
  obstacles: readonly RoomObstacle[];
  exits: readonly {
    direction: "north" | "south" | "west" | "east";
    target: RoomId | null;
    locked: boolean;
  }[];
}
```

将来の部屋で使わない抽象化を先回りして増やさないでください。今回は敵スポーン、宝箱、イベントスクリプトを型へ入れません。

## 3. 転送の間の定義

`roomDefinitions.ts`へ`transferChamber`だけを正式登録します。他7部屋は`RoomId`に含めますが、空の仮実装を作りません。

推奨値：

```ts
export const TRANSFER_CHAMBER: StageRoomDefinition = {
  id: "transferChamber",
  name: "晶界・転送の間",
  bounds: {
    left: 58,
    top: 58,
    right: 582,
    bottom: 318,
  },
  spawn: { x: 320, y: 258 },
  obstacles: [
    { kind: "circle", x: 320, y: 214, radius: 23 },
    { kind: "rect", left: 58, top: 58, right: 246, bottom: 105 },
    { kind: "rect", left: 394, top: 58, right: 582, bottom: 105 }
  ],
  exits: [
    {
      direction: "north",
      target: "mossCorridor",
      locked: true
    }
  ]
};
```

中央の円形障害物は転送クリスタルの台座です。上側中央の通路幅は約148px確保します。

## 4. 汎用衝突処理

現在の`clampToArena()`をステージ全体の衝突処理へ直接改造しないでください。既存戦闘モードを守るため、`roomCollision.ts`へ別の純粋関数を追加します。

```ts
export function resolveRoomMovement(
  previous: Vec2,
  desired: Vec2,
  radius: number,
  room: StageRoomDefinition,
): Vec2
```

要件：

- 部屋外周からキャラクター半径分だけ内側へ制限する。
- 長方形・円形障害物へ侵入しない。
- X軸とY軸を別々に解決し、壁沿いに滑れるようにする。
- 高速ノックバックでも障害物を大きくすり抜けない。
- NaNや無限ループを起こさない。
- 操作キャラクターと後方2人の全員へ適用する。
- 敵がいない今回の部屋では敵衝突処理を呼ばない。

汎用物理エンジンや依存パッケージは追加しません。

## 5. GameWorldへモードを追加

既存テストと戦闘試作を維持するため、`GameWorld`へ明示的な実行モードを追加してください。

```ts
export type GameMode = "stage" | "arena";
```

`WorldOptions`：

```ts
interface WorldOptions {
  initialPhase?: GamePhase;
  random?: () => number;
  debugAi?: boolean;
  mode?: GameMode;
  initialRoomId?: RoomId;
}
```

方針：

- `GameWorld`単体のデフォルトは`arena`のままにし、既存テストを壊さない。
- ブラウザの通常起動では`main.ts`から`mode: "stage"`を渡す。
- URLが`?mode=arena`の場合だけ従来の戦闘アリーナで起動する。
- ステージモードの初期部屋は`transferChamber`。
- ステージモード開始時は敵配列を空にする。
- ステージモードでは敵が0体でも自動的に`cleared`へ移行しない。
- `snapshot`へ`mode`、`stageId`、`roomId`、`roomName`を追加する。

## 6. 初期位置と陣形

転送の間では3人を次へ配置します。

- カイル：`{ x: 320, y: 258 }`
- ナディ：カイルの左後方
- メル：カイルの右後方
- 全員が北を向く

既存の`resetPartyPositions()`を無理に共用せず、部屋スポーン用の小さな関数を分離して構いません。

キャラクター交代時に現在位置が飛ばない仕様、後方陣形、追従速度は維持します。

## 7. 転送の間の描画

`Renderer`へ部屋背景描画を追加します。巨大な条件分岐にせず、次のファイルへ分離してください。

```text
src/render/rooms/TransferChamberRenderer.ts
```

描画順：

1. 暗い晶界の背景
2. 石床
3. 円形の転送紋
4. 中央の小型クリスタルと石台
5. 苔・根・崩れた壁
6. 壁際の青緑色の小結晶
7. 北側の閉じた石門
8. 影、キャラクター、前景装飾

見た目：

- 16ビット風の限定パレット
- 現在の暗緑、青緑、石灰色、苔色を継承
- 床は18〜24px程度の不規則な石ブロック
- 中央転送紋は現在の試練の環より少し小さくする
- クリスタルは淡い水色でゆっくり明滅
- 北側中央に次の部屋へ続く門を明確に見せる
- 外側は暗くし、歩ける場所と壁を視覚的に区別する

コンセプト画像をCanvasへ貼り付けないでください。乱数描画は毎フレーム変化させず、既存`hash2d()`または固定値を使います。

## 8. 入口演出

通常起動時のオーバーレイをステージ用に変更します。

```text
キッカー：FOREST RUINS 01
タイトル：晶界・転送の間
本文：森の封印石を求め、カイルたちはクリスタルの記憶空間へ降り立った。
ボタン：探索開始 E
ヒント：WASD 移動 ・ Space 交代 ・ E 調べる
```

`?mode=arena`では現在の「FIRST COMBAT TEST／晶界・試練の環」を維持します。

## 9. 中央クリスタルの調査

中央台座から36px以内で`E`を押すと、一度だけ短いメッセージを表示します。

```text
「クリスタルの奥から、森の鼓動が聞こえる……」
```

今回はアイテム取得、回復、ワープ、会話ウィンドウの選択肢を追加しません。既存のバナーまたは小さなメッセージ表示を再利用します。

離れている時に`E`を押しても何も起きません。

## 10. 北門

北側中央に閉じた門を置きます。

- プレイヤーは門を越えられない。
- 近づくと小さく「苔の回廊へ」と表示する。
- `E`を押すと「道を覆う根が、かすかに脈打っている。」と表示する。
- 今回は開門・画面暗転・部屋遷移を実装しない。

次のタスクで`mossCorridor`への遷移を追加します。

## 11. HUD

ステージモード：

- AREA表示を`晶界・転送の間`へ変更する。
- `TRIAL`を表示しない。
- 敵がいないため`ENEMY 0/0`も表示しない。
- 右側のBGMとポーズは維持する。
- 3人のHP・MPとアクション欄は維持する。

アリーナモード：

- 現在のAREA、TRIAL、ENEMY表示を変更しない。

## 12. 音

今回は新しいBGMや効果音を追加しません。

- 現在のBGMをそのまま再生してよい。
- 移動、攻撃、交代、ポーズの音を壊さない。
- 後から探索BGMへ差し替えられるよう、ステージ名を音声クラスへ直接埋め込まない。

## 13. QA

開発用URL：

```text
/?stageQa=transferChamber&autoStartQa=1
/?mode=arena
```

`stageQa=transferChamber`ではオーバーレイを省略して探索状態で開始し、次をdatasetへ出してください。

```text
data-game-mode="stage"
data-stage-id="forestRuins01"
data-room-id="transferChamber"
data-room-name="晶界・転送の間"
```

既存のキャラクター・敵・エフェクトQAパラメータは削除しません。

## 14. テスト

最低限、次を追加・確認してください。

### 部屋定義

- 転送の間のID、名前、スポーン、北出口が正しい。
- 北出口は`mossCorridor`を指すが`locked: true`。

### 衝突

- 外壁を越えない。
- 中央クリスタル台座へ侵入しない。
- 北側左右の壁へ侵入しない。
- 壁へ斜め入力しても滑れる。
- 操作キャラを交代しても全員が部屋内にいる。

### 状態

- ステージモードは敵0体でも`playing`を維持する。
- アリーナモードは従来どおり敵全滅で`cleared`になる。
- 既存の`GameWorld`テストはアリーナモードとして動く。

### 調査

- 台座付近の`E`でメッセージが出る。
- 離れた場所の`E`では出ない。
- 北門付近の`E`で門のメッセージが出る。

最後に実行してください。

```bash
npm test
npm run build
```

## 完了条件

- 通常起動すると「晶界・転送の間」から始まる。
- 敵がいない状態で3人を操作・交代しながら部屋を歩ける。
- 外壁、中央台座、閉じた北門をすり抜けない。
- 中央クリスタルと北門を`E`で調べられる。
- 固定画面の遺跡として、歩ける場所と壁が明確に見える。
- `?mode=arena`で現在の戦闘試作をそのまま遊べる。
- 既存の戦闘、スプライト、音、HUD、QA、テストに意図しない変更がない。
