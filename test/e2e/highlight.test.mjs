// E2E テスト(仕様書 Testing Decisions のとおり、テストの境界はここ 1 か所)。
// 拡張を読み込んだ Chromium で、ローカルサーバーが配信する PDF を開き、ビューアの状態を検証する。
//
// 実行: npm i -D playwright && npx playwright install chromium && npm run test:e2e
// ※ この E2E は、作成した環境(ブラウザの取得が許可されていない)では実行できていません。
//    初回の実行で、起動オプションやセレクタの調整が必要になる可能性があります。
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const samplePdf = readFileSync(join(root, "test", "fixtures", "sample.pdf"));

let server;
let base;
let context;
let extensionId;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

before(async () => {
  server = http.createServer((req, res) => {
    if (req.url.split(/[?#]/)[0].endsWith(".pdf")) {
      res.writeHead(200, { "content-type": "application/pdf" });
      res.end(samplePdf);
    } else {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<p>plain page</p>");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  context = await chromium.launchPersistentContext("", {
    channel: "chromium", // 新しい headless モード。拡張を読み込むために必要
    args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
  });

  let [worker] = context.serviceWorkers();
  worker ??= await context.waitForEvent("serviceworker");
  extensionId = new URL(worker.url()).host;

  // 動的ルールの登録が終わるまで待つ
  for (let i = 0; i < 50; i++) {
    const count = await worker.evaluate(
      async () => (await chrome.declarativeNetRequest.getDynamicRules()).length,
    );
    if (count > 0) break;
    await sleep(100);
  }
});

after(async () => {
  await context?.close();
  server?.close();
});

async function openViewerAndSearch(page, query) {
  await page.goto(`${base}/sample.pdf`);
  await page.waitForURL((url) =>
    url.href.startsWith(`chrome-extension://${extensionId}/pdfjs/web/viewer.html`),
  );
  await page.waitForSelector(".textLayer span");
  await page.keyboard.press("Control+f");
  await page.keyboard.type(query);
  await page.keyboard.press("Enter");
  await page.waitForSelector(".textLayer .highlight.selected");
}

const styleOf = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const s = getComputedStyle(el);
    return {
      background: s.backgroundColor,
      outlineStyle: s.outlineStyle,
      outlineColor: s.outlineColor,
      animations: el.getAnimations().length,
    };
  }, selector);

test(".pdf で終わる URL は自前のビューアへ転送され、そうでない URL は転送されない", async () => {
  const page = await context.newPage();
  await page.goto(`${base}/page.html`);
  assert.equal(page.url(), `${base}/page.html`);
  await page.goto(`${base}/sample.pdf`);
  await page.waitForURL((url) => url.protocol === "chrome-extension:");
  assert.match(page.url(), /\/pdfjs\/web\/viewer\.html\?file=/);
  await page.close();
});

test("検索すると、全ヒットが蛍光イエロー、現在のヒットが赤枠になる", async () => {
  const page = await context.newPage();
  await openViewerAndSearch(page, "needle");

  assert.equal(await page.isChecked("#findHighlightAll"), true, "「すべて強調表示」が初期オン");
  assert.ok((await page.locator(".textLayer .highlight").count()) >= 4, "全ヒットが強調される");
  assert.equal(await page.locator(".textLayer .highlight.selected").count(), 1, "現在のヒットは 1 つ");

  const all = await styleOf(page, ".textLayer .highlight:not(.selected)");
  assert.match(all.background, /255, 235, 59/);

  const current = await styleOf(page, ".textLayer .highlight.selected");
  assert.match(current.background, /255, 235, 59/);
  assert.equal(current.outlineStyle, "solid");
  await page.close();
});

test("現在のヒットは切り替え直後に点滅し、その後は赤枠のみが固定で残る", async () => {
  const page = await context.newPage();
  await openViewerAndSearch(page, "needle");
  await page.keyboard.press("Enter"); // 次のヒットへ
  await page.waitForSelector(".textLayer .highlight.selected");

  assert.ok((await styleOf(page, ".textLayer .highlight.selected")).animations > 0, "点滅中");
  await sleep(1800); // 0.4 秒 x 3 回 + 余裕
  const settled = await styleOf(page, ".textLayer .highlight.selected");
  assert.equal(settled.animations, 0, "点滅は止まる");
  assert.equal(settled.outlineStyle, "solid");
  assert.equal(settled.outlineColor, "rgb(229, 57, 53)", "赤枠は残る");
  await page.close();
});

test("「視覚効果を減らす」がオンなら点滅しない", async () => {
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openViewerAndSearch(page, "needle");
  await page.keyboard.press("Enter");
  await page.waitForSelector(".textLayer .highlight.selected");
  const current = await styleOf(page, ".textLayer .highlight.selected");
  assert.equal(current.animations, 0);
  assert.equal(current.outlineStyle, "solid");
  await page.close();
});
