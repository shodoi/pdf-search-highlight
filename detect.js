// 判定: どの URL を pdf.js ビューアへ転送するか。
// 将来 Content-Type による判定を足すときは、このファイルだけを差し替える。
//
// declarativeNetRequest の regexFilter は RE2 構文。先読み・後読みは使わない。
// グループ1 = PDF の URL(フラグメントを除く)、グループ2 = フラグメント(あれば)。
// "&" を含む URL は pdf.js の ?file= パラメータを壊すため、あえてマッチさせず
// Chrome 標準ビューアにフォールバックさせる。
export const PDF_URL_PATTERN = String.raw`^(https?://[^?#&]*\.pdf(?:\?[^#&]*)?)(#.*)?$`;

const PDF_URL_RE = new RegExp(PDF_URL_PATTERN, "i");

export function isPdfUrl(url) {
  return PDF_URL_RE.test(url);
}
