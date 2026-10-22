# PDF Search Highlight

Chrome 標準の PDF ビューアでは、検索でヒットしても該当箇所がページ上のどこか分かりにくいことがあります。
この拡張は、Web 上の `.pdf` を同梱の [pdf.js](https://github.com/mozilla/pdf.js) ビューアで開き、検索ヒットを次のように強調します。

- 全ヒット: 蛍光イエロー
- 現在のヒット: 赤枠。ヒットを切り替えるたびに 3 回点滅し、その後は赤枠だけが残る
- OS の「視覚効果を減らす」がオンなら点滅しない
- 検索バーの「すべて強調表示」は最初からオン

## インストール(パッケージ化されていない拡張)

1. Chrome で `chrome://extensions` を開き、右上の「デベロッパー モード」をオンにする
2. 「パッケージ化されていない拡張機能を読み込む」で、このフォルダ(`manifest.json` があるフォルダ)を選ぶ
3. Web 上の `.pdf` を開く。ビューアの URL が `chrome-extension://…/pdfjs/web/viewer.html?file=…` になれば成功
4. `Ctrl+F` で検索する

## 権限について

| 権限 | 理由 |
| --- | --- |
| `declarativeNetRequest` | `.pdf` への移動を、同梱のビューアへの移動に置き換えるため |
| `http://*/*`, `https://*/*` | どのサイトの PDF でも転送し、ビューアからその PDF を取得するため。権限を絞ると、許可していないサイトの PDF が転送されなくなる |

PDF の内容を外部サーバーへ送る処理はありません。取得した PDF は、ビューア内で表示するためだけに使われます。

## 構成

| パス | 役割 |
| --- | --- |
| `detect.js` | **判定**: どの URL を転送するか。将来 Content-Type で判定するときは、ここを差し替える |
| `rules.js` | **転送**: 判定した URL をビューアへ移動させるルールを作る |
| `background.js` | 起動のたびにルールを登録する(読み込み先によって拡張 ID が変わるため、動的ルールにしている) |
| `viewer-extra/custom.css` | ハイライトの見た目(色、赤枠、点滅) |
| `viewer-extra/custom.js` | 「すべて強調表示」を初期オンにする |
| `pdfjs/` | pdf.js の公式配布ビルド(6.4.299)。LICENSE は Apache 2.0 |
| `scripts/patch-pdfjs.mjs` | `pdfjs/` に当てる最小パッチ(何度実行しても同じ結果) |

## pdf.js 本体への変更

`pdfjs/` には、次の **3 か所だけ** パッチを当てています。`scripts/patch-pdfjs.mjs` が自動で当てます。

1. `viewer.html`: `custom.css` を読み込む 1 行
2. `viewer.html`: `custom.js` を読み込む 1 行
3. `viewer.mjs`: オリジンチェックの許可リストに、拡張自身のオリジンを加える 1 か所

3 が必要な理由: pdf.js は、ビューアと異なるオリジンの PDF を `?file=` で渡されると「file origin does not match viewer's」で開くことを拒否します(公式ビューアを同梱する場合の仕様です)。拡張のビューアは `chrome-extension://…` で、PDF は別のサイトにあるため、このチェックを通す必要があります。

## pdf.js を更新するには

1. [Releases](https://github.com/mozilla/pdf.js/releases) から `pdfjs-X.Y.Z-dist.zip` をダウンロードして展開する
2. `pdfjs/` を、展開した中身(`LICENSE`、`build/`、`web/`)で置き換える。`.map` ファイルとサンプル PDF は不要
3. `npm run patch` を実行する。目印が見つからないというエラーが出たら、pdf.js の構造が変わっているので、パッチの目印を直す
4. `viewer-extra/custom.css` の冒頭コメントにあるクラス名(`.highlight`、`.selected`、`.begin`、`.middle`、`.end`)が、新しい版でも使われているか確認する

## テスト

```
npm test           # 判定と転送ルールの単体テスト(Node.js 22 以降)
npm run test:e2e   # 拡張を読み込んだ Chromium での E2E(要 Playwright)
```

E2E は `npm i -D playwright && npx playwright install chromium` のあとに実行します。
`test/fixtures/sample.pdf` は `node test/fixtures/make-sample-pdf.mjs` で再生成できます。

## 既知の制限

- 転送の対象は、URL が `.pdf` で終わるもの(`?dl=1` のようなクエリ、`#page=3` のようなフラグメントは可)です。`/download?id=123` のような、拡張子のない PDF は転送されません
- URL に `&` を含む PDF(`a.pdf?x=1&y=2`)は転送されず、Chrome 標準ビューアで開きます。`?file=` パラメータが壊れるためです
- ログインが必要な PDF、ローカルファイル(`file://`)は対象外です
- 標準ビューアに戻す切り替え機能はありません。困ったときは、拡張を一時的に無効にしてください
- pdf.js 6.x は新しいブラウザ機能(`Promise.try`、`Uint8Array.prototype.toHex` など)を使います。古い Chrome では動かない可能性があるので、最新の安定版を使ってください
- 転送の対象は、メインフレーム(タブ全体で PDF を開いたとき)のみです。ページに埋め込まれた PDF は対象外です

## ライセンス

同梱の pdf.js は Apache License 2.0(`pdfjs/LICENSE`)です。この拡張自身のコードのライセンスは未定です。
