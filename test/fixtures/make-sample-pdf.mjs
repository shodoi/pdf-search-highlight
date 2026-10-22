// E2E テスト用の最小 PDF を生成する: node test/fixtures/make-sample-pdf.mjs
// 検索語 "needle" が 4 回(1 行目に 2 回、2〜3 行目に 1 回ずつ)含まれる。
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const lines = [
  "needle in a haystack, and another needle here.",
  "Second line with a needle in the middle of the sentence.",
  "Third line: the quick brown fox jumps over the lazy dog, then needle.",
];

const content =
  "BT\n/F1 16 Tf\n72 720 Td\n20 TL\n" +
  lines.map((l) => `(${l.replace(/[()\\]/g, "\\$&")}) Tj T*`).join("\n") +
  "\nET";

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
];

let out = "%PDF-1.4\n";
const offsets = [];
objects.forEach((body, i) => {
  offsets.push(Buffer.byteLength(out));
  out += `${i + 1} 0 obj\n${body}\nendobj\n`;
});
const xrefAt = Buffer.byteLength(out);
out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;

writeFileSync(join(dirname(fileURLToPath(import.meta.url)), "sample.pdf"), out, "latin1");
