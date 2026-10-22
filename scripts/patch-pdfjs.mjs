// 同梱の pdf.js に、この拡張が必要とする最小限のパッチを当てる。
// pdf.js を更新したら (pdfjs/ を差し替えたら) もう一度実行する。何度実行しても結果は同じ。
//
//   viewer.html : 追加スタイルと追加スクリプトを読み込む 2 行
//   viewer.mjs  : 他サイトの PDF を開けるように、オリジンチェックを拡張自身のオリジンで通す 1 か所
//
// 変更箇所の目印が見つからないときは、pdf.js の構造が変わっているので失敗として終了する。
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webDir = join(dirname(fileURLToPath(import.meta.url)), "..", "pdfjs", "web");

function patchFile(file, edits) {
  const path = join(webDir, file);
  let text = readFileSync(path, "utf8");
  for (const { name, done, anchor, replacement } of edits) {
    if (text.includes(done)) {
      console.log(`  - ${file}: ${name} (適用済み)`);
      continue;
    }
    if (!text.includes(anchor)) {
      console.error(`  ! ${file}: ${name}: 目印が見つかりません。pdf.js の構造が変わった可能性があります。`);
      process.exitCode = 1;
      continue;
    }
    text = text.replace(anchor, replacement);
    console.log(`  + ${file}: ${name}`);
  }
  writeFileSync(path, text);
}

patchFile("viewer.html", [
  {
    name: "追加スタイルの読み込み",
    done: "viewer-extra/custom.css",
    anchor: '<link rel="stylesheet" href="viewer.css" />',
    replacement:
      '<link rel="stylesheet" href="viewer.css" />\n    <link rel="stylesheet" href="../../viewer-extra/custom.css" />',
  },
  {
    name: "追加スクリプトの読み込み",
    done: "viewer-extra/custom.js",
    anchor: '<script src="viewer.mjs" type="module"></script>',
    replacement:
      '<script src="viewer.mjs" type="module"></script>\n  <script src="../../viewer-extra/custom.js" type="module"></script>',
  },
]);

patchFile("viewer.mjs", [
  {
    name: "オリジンチェックを拡張自身のオリジンで通す",
    done: '"https://mozilla.github.io", window.location.origin]',
    anchor: '"https://mozilla.github.io"]);',
    replacement: '"https://mozilla.github.io", window.location.origin]);',
  },
]);
