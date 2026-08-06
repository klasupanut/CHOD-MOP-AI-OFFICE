import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = fs.readFileSync(
  path.join(root, "quotation-app-dist", "assets", "index-HmUxnN6T.js"),
  "utf8",
);
const indexHtml = fs.readFileSync(
  path.join(root, "quotation-app-dist", "index.html"),
  "utf8",
);

test("quotation summary labels span quantities and unit-price columns", () => {
  assert.match(
    bundle,
    /children:\[i\.jsx\("td",\{colSpan:2,className:"border border-transparent"\}\),i\.jsx\("td",\{colSpan:2,className:"whitespace-nowrap border border-slate-300 px-2 py-1\.5 text-right text-\[10px\]",children:"SUB TOTAL"\}\)/,
  );
  assert.match(
    bundle,
    /i\.jsx\("td",\{colSpan:2,className:"border border-transparent"\}\),i\.jsx\("td",\{colSpan:2,className:"whitespace-nowrap border border-slate-300 px-2 py-1\.5 text-right text-\[10px\]",children:S\}\)/,
  );
  assert.match(
    bundle,
    /colSpan:2,className:"whitespace-nowrap border-y border-slate-700 px-2 py-2 text-right text-\[11px\]",children:"GRAND TOTAL"/,
  );
});

test("signature labels have a fixed gap below the optional note box", () => {
  assert.match(
    bundle,
    /data-testid":"signature-section",className:"mt-auto grid grid-cols-2 gap-\[22mm\] pb-\[8mm\] pt-\[6mm\] text-center text-\[12px\]"/,
  );
});

test("quotation asset cache key is refreshed for PDF spacing", () => {
  assert.match(indexHtml, /index-HmUxnN6T\.js\?v=20260806-pdf-summary-spacing/);
});
