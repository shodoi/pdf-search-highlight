// pdf.js ビューアに追加で読み込むスクリプト。
// 検索バーの「すべて強調表示」を、最初からオンにする。
// 検索バーはイベント発火時に checkbox の checked を読むため、初期化後にオンにすれば足りる。
(async () => {
  const app = window.PDFViewerApplication;
  if (!app) {
    return;
  }
  await app.initializedPromise;
  const checkbox = document.getElementById("findHighlightAll");
  if (checkbox) {
    checkbox.checked = true;
  }
})();
