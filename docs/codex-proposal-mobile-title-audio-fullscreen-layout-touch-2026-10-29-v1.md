# 実装指示案 v1：タイトル音楽・スマホ全画面・左右余白・連打ズーム

状態：**2026-10-30 ユーザー承認済み・実装／ローカル技術検証済み。2026-10-31公開・公開Chromium検証済み（実機未検証）**。対象はユーザーの実機iPhone Chrome横向きスクリーンショット `IMG_6711.PNG`、`IMG_6712.PNG`、`IMG_6713.PNG`。実装先は `コード実装 | エロリア2`、推奨モデルは **Sol High**。

## 実装前の要望と調査

1. タイトル曲はPC・スマホとも初期設定をONにし、ユーザーが任意にOFF/ONできるようにする。現状は `OpeningController.playTitleMusic()` が初回自動再生に失敗したとき `stopMusic()` で再生希望まで消すため、その後の最初の操作で自然に鳴らない。音声付き自動再生はブラウザ側に制限されるので、初回無操作の音出しは保証できない。
2. iPhone ChromeではタイトルのFullscreen APIボタンが「非対応」。iPhoneブラウザ内でタブ・URL欄をページ側から消すことはできない。ホーム画面から独立表示するWebアプリ（standalone）を用意し、対応環境では従来のFullscreen APIを残す。
3. 実機横向きでゲーム画像の左右余白が大きく異なり、HUDが左の余白に出ている。`style.css` ではタッチ時のbody safe-area padding、`.page-shell` の幅、`.field-shell` の `100vw` と `dvh` による16:9指定が重なる。どの指定が実機の差を生んだかはまだ確定していない。
4. J連打でブラウザの拡大が起きる。Jボタンにはすでに `touch-action:none` と `pointerdown.preventDefault()` があるため、単純な未設定とは断定しない。実機上で `visualViewport.scale`、タップ座標、横スクロール量を確認し、ゲーム操作によるページのダブルタップズームを防ぐ。

## 実装範囲

### タイトル音楽

- タイトル表示時にタイトル曲の**再生希望をON**とし、過去に明示ミュートした設定は尊重する。自動再生が許可された環境では即座にフェードイン。拒否された環境では再生希望を保持し、最初のタップ・クリック・キー入力のユーザー操作で開始する。音が鳴らないことを「音楽OFF」と誤表示しない。
- タイトルボタンは再生中／再生待ち／ユーザーOFFを区別。既定ONの状態で音楽ボタンを押したら確実にOFF、再度押したらON。キャプチャ段階の音声アンロックと後続clickの二重解釈を防ぐ。`aria-pressed` と文言を同期する。
- 音楽OFFはユーザーの操作後のみ保存し、画面遷移・タイトル復帰・再読込でも尊重。自動再生拒否をミュート設定として永続化しない。序章・森への既存クロスフェードは維持する。

### iPhone全画面相当

- `manifest.webmanifest` と `index.html` の参照・iOS用メタ情報を用意し、GitHub Pagesのサブパス `/project-eloria/` でアイコン・起動URLが正しく解決するようにする。ホーム画面起動は `display:standalone` を第一候補とし、画面は安全領域まで広げ、操作ボタンはノッチ・ホームインジケーターに重ねない。
- `requestFullscreen` が有効なPC・Android・対応iPadでは現行ボタンを維持。iPhoneブラウザでは無効ボタンだけを見せず、「全画面で遊ぶには共有→ホーム画面に追加→追加したアイコンから起動」の短い案内を表示。`display-mode:standalone` または `navigator.standalone` で案内を消す。Webページからホーム画面への追加を自動実行しない。
- Chromeタブ内で真の全画面にできると誤案内しない。ホーム画面版とChromeタブ版は保存領域が分かれる可能性があるため、将来セーブデータが入る際は別途扱う。

### 横向きレイアウト

- ゲーム映像は現在の16:9・640×360論理キャンバスを維持し、`visualViewport`/CSS viewportの**可視領域の中心**へ配置。body全体のsafe-area paddingと内側の`100vw`固定幅を併用しない。画面外周の余白は左右同量を原則とし、safe-areaはHUD・操作ボタンの内側余白に使う。
- 画面回転・URLバーの高さ変化・ホーム画面standalone・Fullscreen API出入りで再計算。左右余白の測定は `getBoundingClientRect()` の左右距離で行い、ノッチによる表示可能領域差がある場合はその差を明記する。HUDやJ/K/L/交代を映像の外へはみ出させない。
- 背景画像の引き伸ばし、キャラとマップの縮尺、歩行マスク、カメラのゲーム内座標は変更しない。

### 連打ズーム

- J/K/L/交代・仮想スティック等のゲーム操作領域ではブラウザジェスチャーを局所的に抑止し、連打・長押し・複数指・`pointercancel` でもゲーム入力が確実に解除されるようにする。既存の `touch-action:none` だけでは防げなかった理由を実機で確認し、必要な場合だけ非passiveの `touchend` 等で対象コントロールに限定して二重タップの既定動作を抑止する。
- ページ全体に `user-scalable=no` や一律 `touch-action:none` は指定しない。文字を拡大するアクセシビリティ操作は保ち、ゲーム外の選択・メニュー操作を壊さない。誤拡大からの復帰を自動リロードで処理しない。

## 検証・完了条件

- 型検査・全テスト・製品ビルド通過。音楽は初回訪問／自動再生許可／拒否／手動OFF後の再訪／START・戻る・スキップを確認し、各場面で音楽ボタンの文言・状態・実再生を照合する。
- PC Chrome通常／Fullscreen、Android Chrome（可能なら実機）、iPhone Chrome横向きタブ／ホーム画面standalone、iPhone Safari、iPad相当で、タイトル→序章→森、回転、URLバーの変化、ノッチの左右方向を確認。iPhone実機なしでエミュレーションだけなら未検証と記録する。
- 画面幅・高さ・`visualViewport.scale/offsetLeft` とゲーム映像矩形を記録し、Jを20回以上連打してもページ拡大・横スクロール・入力の取りこぼしが起きないことを確認。HUD・操作ボタンのタッチ可能性と視認性も目視。
- 実装結果と未確認項目を `docs/project-handoff.md` に反映する。公開URLでの確認はプッシュとPages更新が必要なので、ローカル検証と公開確認を区別する。

## 根拠

- 現行コード：`src/ui/OpeningController.ts`、`src/audio/AudioManager.ts`、`src/input/InputController.ts`、`src/style.css`、`index.html`。
- [Chromeの自動再生ポリシー](https://developer.chrome.com/blog/autoplay/)、[WebKitのホーム画面Webアプリ](https://webkit.org/blog/13878/)、[WebKitのiOS 26 Webアプリ動作](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)、[iPhoneでのFullscreen API要望](https://bugs.webkit.org/show_bug.cgi?id=206854)、[Chrome iOSのホーム画面追加手順](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DiOS&hl=en)、[touch-action仕様](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action)。

## 2026-10-30 実装結果と残る確認

- タイトルの自動再生拒否で再生希望を消さず、最初の操作で再試行するよう修正。音楽ボタンはミュート設定を基準にし、初期ON／操作待ち／明示OFFを区別し、保存設定・Mキー・通常の場面遷移と同期する。
- 相対scope／start_urlのmanifest、Pagesサブパスに対応する参照とiOSメタ情報、既存HUD絵を再利用したアイコンを追加。非対応iPhoneのホーム画面起動案内と２方式のstandalone判定を追加し、対応Fullscreen APIは保持した。
- 残存していたcombat-layoutのflex-endを検証環境で確認して解消。body safe-area paddingを外し、可視領域の幅・高さ・offsetへ中央配置し、安全余白をHUD／操作に限定。640×360・ゲーム内座標と移動／背景／キャラ縮尺は変えていない。
- 局所的なtouchend／dblclick等の抑止と、複数指・capture喪失・cancel／blurの解除を実装。文字やメニューの拡大を一律禁止せず、会話パネルのピンチを許可する。実機の元の拡大経路は未確定。
- 型検査・全437テスト（28ファイル）・buildが通過。音楽４条件、表示／操作８条件、DEV開始と可視領域offset模擬、タイトル復帰の再読込、manifest／起動URL／アイコン、縦向き状態パネルを確認。タッチ７条件で各J24回の入力・解除・scale不変を確認した。
- 検証はミュートの隔離Chromium。iOS／Safari名のケースはUA・API有無・standalone分岐の模擬で、実機やWebKitの検証ではない。インストール・実際のstandalone起動・実機ノッチやURLバー・実機の連打ズーム・聴感は未確認。厳密な条件と記録は `docs/project-handoff.md` の2026-10-30節と `docs/qa/mobile-*-2026-10-30.json`。
- 検証用ブラウザー／4174・4175を終了。ゲーム素材等351保護ファイルは不変。**このローカル検証時点では未commit／未pushで公開Pagesに未反映だった**。現在の公開状態は下記、実機確認は引き続き未実施。

## 2026-10-31 公開結果

- ユーザーの「プッシュお願い！」で公開を明示承認。前回スマホ修正と今回の序章・誤拡大対策を `86b698f598fd4e05bf035e6717b590cb5e529132` として既存mainへ通常pushし、Pages build／deployが成功。ローカルとActionsの型検査・全441テスト・buildが通過。
- 公開JS／CSSを含む７ファイルがローカルbuildとSHA256一致。公開844×390 Chromiumタッチ模擬で音楽ON・明示OFFの再読込保持、序章04／05全幅と字幕、森の中央配置、J内・外側・余白の各24回、ポーズ復帰を確認。J24入力到達、外側48タップの攻撃入力0、scale=1・横スクロールなし・押下解除。manifest／アイコンも照合。実機iPhone／WebKit、実ホーム画面起動とOSのジェスチャーは未確認。
- [公開ゲーム](https://666hideki666.github.io/project-eloria/)、[Pages実行](https://github.com/666hideki666/project-eloria/actions/runs/41177919545)。詳細は引き継ぎ冒頭と `docs/qa/mobile-pages-{publication,http,live}-2026-10-31.json`。
