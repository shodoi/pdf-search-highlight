import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRedirectRules, RULE_IDS } from "../../rules.js";
import { PDF_URL_PATTERN } from "../../detect.js";

test("リダイレクトルールの形", () => {
  const rules = buildRedirectRules("abcdefghijklmnopabcdefghijklmnop");
  assert.equal(rules.length, 1);
  const [rule] = rules;
  assert.deepEqual(RULE_IDS, [rule.id]);
  assert.equal(rule.action.type, "redirect");
  assert.equal(rule.condition.regexFilter, PDF_URL_PATTERN);
  assert.deepEqual(rule.condition.resourceTypes, ["main_frame"]);
  assert.equal(rule.condition.isUrlFilterCaseSensitive, false);
});

test("置換先は拡張のビューアで、PDF の URL とフラグメントを引き継ぐ", () => {
  const id = "abcdefghijklmnopabcdefghijklmnop";
  const [rule] = buildRedirectRules(id);
  const sub = rule.action.redirect.regexSubstitution;
  assert.equal(sub, `chrome-extension://${id}/pdfjs/web/viewer.html?file=\\1\\2`);

  // regexSubstitution を JS で再現して、実際の転送先 URL を確認する(RE2 とこの範囲の構文は同じ)
  const url = "https://example.com/dir/a.pdf?dl=1#page=3";
  const m = new RegExp(rule.condition.regexFilter, "i").exec(url);
  const result = sub.replace(/\\(\d)/g, (_, n) => m[Number(n)] ?? "");
  assert.equal(result, `chrome-extension://${id}/pdfjs/web/viewer.html?file=https://example.com/dir/a.pdf?dl=1#page=3`);
});

test("置換先自体は転送対象にならない(リダイレクトのループが起きない)", () => {
  const [rule] = buildRedirectRules("abcdefghijklmnopabcdefghijklmnop");
  const target = "chrome-extension://abcdefghijklmnopabcdefghijklmnop/pdfjs/web/viewer.html?file=https://example.com/a.pdf";
  assert.equal(new RegExp(rule.condition.regexFilter, "i").test(target), false);
});
