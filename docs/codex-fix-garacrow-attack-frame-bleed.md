# Codex向け修正指示：ガラクロウ攻撃時の羽断片を除去

ガラクロウの専用攻撃「黒翼急襲」で、翼を広げた際に本体の左側へ別フレームの羽断片が表示される問題を修正してください。

原因は、v1スプライトシート内で大きく開いた翼が48×48pxのセル境界を越え、隣接フレームへ混入していたことです。描画処理やエフェクトの問題ではありません。

## 修正版素材

- 画像：`assets/sprites/enemies/garacrow/attacks/garacrow-dive-strike-48px-v2.png`
- 設定：`assets/sprites/enemies/garacrow/attacks/garacrow-dive-strike-48px-v2.json`

v2では24体を個別に分離して各48×48pxセル内へ収めています。全セルの外周1pxは完全透過で、隣接フレームの断片はありません。

## 修正内容

`enemySpriteConfig.ts`のガラクロウ攻撃画像とJSONのimportだけをv2へ変更してください。

```ts
import garacrowDiveStrikeSpriteUrl from
  "../../assets/sprites/enemies/garacrow/attacks/garacrow-dive-strike-48px-v2.png?url";
import garacrowDiveStrikeFrameData from
  "../../assets/sprites/enemies/garacrow/attacks/garacrow-dive-strike-48px-v2.json";
```

変数名、`diveStrike`アクションID、`GARACROW_DIVE_STRIKE_SPRITE`の登録方法は変更不要です。

## 変更しないもの

- 「黒翼急襲」の予兆、急降下、命中、急制動のタイミング
- ダメージ22
- 攻撃判定半径30px
- 攻撃速度比1.35
- ノックバック46
- 影、エフェクト、AI
- モスプルンを含む確認用アリーナ構成
- v1以外の敵・キャラクター素材

v1ファイルは削除せず残してください。

## QA

固定フレームを4方向すべて確認します。

```text
?enemyActionQa=diveStrike&enemySpriteQaKind=garacrow&enemySpriteQa=down
?enemyActionQa=diveStrike&enemySpriteQaKind=garacrow&enemySpriteQa=up
?enemyActionQa=diveStrike&enemySpriteQaKind=garacrow&enemySpriteQa=left
?enemyActionQa=diveStrike&enemySpriteQaKind=garacrow&enemySpriteQa=right
```

特に`enemyActionQaFrame=0`、`1`、`4`で翼を大きく開いた姿勢を確認してください。

## テスト

```bash
npm test
npm run build
```

## 完了条件

- 攻撃中、ガラクロウ本体から離れた位置に羽の断片が表示されない。
- 隣接フレームの一部が混ざらない。
- 大きく翼を広げるシルエットと攻撃アニメーションは維持される。
- 攻撃性能、タイミング、他の敵の表示に変化がない。
