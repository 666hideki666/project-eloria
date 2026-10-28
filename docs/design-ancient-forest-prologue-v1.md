# 古の森：第１章への導入案 v1

状態：古の森の赤線歩行・第１層への接続・縮尺調整は実装と技術検証済み。2026-10-14、ユーザーが縮尺を「いい感じ」と確認。第１層から森への復路は `docs/codex-proposal-layer1-south-exit-to-ancient-forest-2026-10-14-v1.md` にて**提案中・未承認**。

## 物語の流れ

1. 何らかの理由・思いでカイル、ナディ、メルの３人が集まる。具体的なきっかけは未確定。「森の異変」はユーザーが挙げた有力案。
2. ゲーム開始後にオープニングムービーを流す。ムービーの内容・長さは未確定。
3. 古の森から操作可能なゲームが始まる。古の森は第１章への導入・チュートリアルとして、広すぎないマップにする。
4. 森には村へ戻る道と、奥の洞窟へ向かう道がある。開始直後に村へ戻ろうとすると「奥の洞窟を探索しよう」といった趣旨の案内が出て、現段階では村への帰路を進めない。文言・演出は今後決める。
5. ３人で奥の洞窟へ入ると第１層「苔根の遺構」へ進み、既存の第１章の流れに接続する。
6. 第１章を終えて洞窟から古の森へ出た後、村への道を通って帰る。

この流れは、古の森が物語の始まりと第１章終了後の帰路を兼ねることを意味する。ただし３人の出会い、森の異変の正体、ムービー内容、帰村後の展開は決まっていない。先回りして設定を固定しない。

## 背景画像

- ユーザー参考図：`/Users/katouhideki/Desktop/star-circling-forest-overview-v1.png`。雰囲気の参考であり、現在の枝道・遺構・広さをそのまま写す指示ではない。
- 同じ世界観の比較資料：`assets/environments/moss-root-ruins/moss-root-ruins-background-v2.png`。
- 赤線と一致する背景：`assets/concepts/environments/star-circling-forest-intro-map-redline-base-v1.png`（1536×1024）。ユーザーは当初の画像に赤線を描いた。左上の道は赤線内で終わる袋小路として扱う。
- ユーザー赤線：`docs/references/star-circling-forest-intro-walk-boundary-red-v1.png`。確認用の仮重ね図：`docs/screenshots/ancient-forest-redline-walkability-review-draft-v1.png`。
- 後から作った `assets/concepts/environments/star-circling-forest-intro-map-concept-v2.png` は今回の赤線画像と背景が一致しないため、赤線歩行マスクのベースには**使わない**。比較用に保持する。
- 画像にキャラクター、敵、UI、文字、ワープ、赤線、通路上のギミック用クリスタルは描かない。洞窟は上を歩くことになるアーチではなく、岩壁に開いた入口として描く。
- imagegen built-in で、参考図と第１層背景を画風の参照として新規構図を生成し、左上の余分な枝道だけを改稿した。使用した要点プロンプト：`compact ancient fantasy forest prologue map, high oblique 16-bit-inspired pixel art compatible with moss-root ruins, exactly two obvious exits (bottom village road and top dark cave), generous readable central ground, no characters/UI/text/redlines, no arch or overpass, no extra exit`。

## 次の手順

1. `docs/codex-proposal-ancient-forest-redline-to-layer1-2026-10-09-v1.md` をユーザーに提示し、実装承認を得る。
2. 承認後に別タスクで赤線マスク、森の歩行、村道の初期制限、洞窟から第１層への遷移を実装・検証する。
3. オープニングムービー、章クリア後の洞窟から森への帰還と村ルート解放、帰村後の物語は次工程で決める。

歩行マスクの方法は `docs/map-walkability-redline-handoff.md` とルートの `AGENTS.md` に従う。
