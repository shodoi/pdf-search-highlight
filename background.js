import { buildRedirectRules, RULE_IDS } from "./rules.js";

// 拡張 ID は「パッケージ化されていない拡張」では読み込み先によって変わるため、
// 静的ルールではなく動的ルールとして、起動のたびに登録し直す。
async function installRules() {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: RULE_IDS,
      addRules: buildRedirectRules(chrome.runtime.id),
    });
  } catch (error) {
    console.error("[pdf-search-highlight] リダイレクトルールの登録に失敗しました", error);
  }
}

chrome.runtime.onInstalled.addListener(installRules);
chrome.runtime.onStartup.addListener(installRules);
