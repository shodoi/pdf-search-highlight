import { test } from "node:test";
import assert from "node:assert/strict";
import { isPdfUrl, PDF_URL_PATTERN } from "../../detect.js";

test("転送する URL", () => {
  for (const url of [
    "https://example.com/a.pdf",
    "http://example.com/dir/sub/b.pdf",
    "https://example.com/C.PDF",
    "https://example.com/a.pdf?dl=1",
    "https://example.com/a.pdf?v=1&x=2".replace("&x=2", ""),
    "https://example.com/a.pdf#page=3",
    "https://example.com/a.pdf?dl=1#search=foo",
    "http://127.0.0.1:8080/sample.pdf",
  ]) {
    assert.equal(isPdfUrl(url), true, url);
  }
});

test("転送しない URL(Chrome 標準ビューアにフォールバックする)", () => {
  for (const url of [
    "https://example.com/a.pdfx",
    "https://example.com/a.pdf.html",
    "https://example.com/a?file=b.pdf",
    "https://example.com/download?id=123",
    "ftp://example.com/a.pdf",
    "file:///tmp/a.pdf",
    "chrome-extension://abc/pdfjs/web/viewer.html?file=https://example.com/a.pdf",
    // 既知の制限: "&" を含む URL は ?file= パラメータを壊すため対象外
    "https://example.com/a.pdf?x=1&y=2",
  ]) {
    assert.equal(isPdfUrl(url), false, url);
  }
});

test("グループ1は PDF の URL、グループ2はフラグメント", () => {
  const m = new RegExp(PDF_URL_PATTERN, "i").exec("https://example.com/a.pdf?dl=1#page=3");
  assert.equal(m[1], "https://example.com/a.pdf?dl=1");
  assert.equal(m[2], "#page=3");
  const m2 = new RegExp(PDF_URL_PATTERN, "i").exec("https://example.com/a.pdf");
  assert.equal(m2[1], "https://example.com/a.pdf");
  assert.equal(m2[2], undefined);
});

test("RE2 で使えない構文(先読み・後読み・後方参照)を含まない", () => {
  assert.doesNotMatch(PDF_URL_PATTERN, /\(\?[=!<]/);
  assert.doesNotMatch(PDF_URL_PATTERN, /\\[1-9]/);
});
