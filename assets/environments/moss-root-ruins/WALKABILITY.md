# 第1層の通行判定

ゲームが使用する床マスクは `moss-root-ruins-walkability-v2.rle.json`（内容 version 5）です。
背景 `moss-root-ruins-background-v2.png` と同じ 1295×1214 の原寸座標で、
ユーザーの2026-10-06赤線 `docs/references/moss-root-walk-boundary-red-v3.png` から
`moss-root-ruins-walkability-red-v3.png` を生成します。旧赤線 v1/v2 と旧二値マスク v1 は履歴用です。

静的な床は新赤線の内側です。唯一の例外は北出口の y=0〜60 で、旧マスクの狭い通路
`moss-root-ruins-north-exit-v2.json` だけを継承します。旧青橋306 pxの修正を新マスクへ
重ねて加えません。根の開閉と右クリスタル石台は床とは別の物体判定です。

再生成: `npm run generate:moss-mask`。確認: `npm run qa:moss-mask`。
全体重ね図と新旧差分図は `docs/screenshots/layer1-redline-v3-*.png` を参照してください。
