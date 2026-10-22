// 転送: 判定済みの URL を、同梱の pdf.js ビューアへリダイレクトする。
import { PDF_URL_PATTERN } from "./detect.js";

export const REDIRECT_RULE_ID = 1;
export const RULE_IDS = [REDIRECT_RULE_ID];

export function buildRedirectRules(extensionId) {
  const viewer = `chrome-extension://${extensionId}/pdfjs/web/viewer.html`;
  return [
    {
      id: REDIRECT_RULE_ID,
      priority: 1,
      action: {
        type: "redirect",
        // \1 = PDF の URL、\2 = フラグメント(#page=3 など。無ければ空)
        redirect: { regexSubstitution: `${viewer}?file=\\1\\2` },
      },
      condition: {
        regexFilter: PDF_URL_PATTERN,
        isUrlFilterCaseSensitive: false,
        resourceTypes: ["main_frame"],
      },
    },
  ];
}
