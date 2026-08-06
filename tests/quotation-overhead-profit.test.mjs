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

test("quotation preview combines overhead and profit into one 10% row", () => {
  assert.match(
    bundle,
    /x=\[\["SUB TOTAL",o\.subTotal\],\["OVERHEAD PROFIT 10%",we\(Number\(o\.overheadAmount\|\|0\)\+Number\(o\.profitAmount\|\|0\)\)\],\["TOTAL AMOUNT",o\.totalAmount\]/,
  );
  assert.doesNotMatch(
    bundle,
    /\[`OVERHEAD \$\{o\.overheadPercent\}%`,o\.overheadAmount\],\[`PROFIT \$\{o\.profitPercent\}%`,o\.profitAmount\]/,
  );
});

test("combined row preserves the existing 5% plus 5% financial total", () => {
  assert.match(
    bundle,
    /ee=we\(oe\*\(5\/100\)\),he=we\(oe\*\(5\/100\)\),le=we\(Z\.selling\+ee\+he\)/,
  );
  assert.match(bundle, /overheadPercent:5,profitPercent:5/);
});

test("discount THB label stays on one line and total emphasis remains correct", () => {
  assert.match(
    bundle,
    /className:"whitespace-nowrap border border-slate-300 px-2 py-1\.5 text-right text-\[10px\]",children:S/,
  );
  assert.match(bundle, /className:m===1\|\|m===3\?"font-bold":""/);
  assert.match(bundle, /"DISCOUNT \(THB\.\)"/);
});

test("quotation asset cache key is refreshed", () => {
  assert.match(indexHtml, /index-HmUxnN6T\.js\?v=20260806-overhead-profit-10/);
});
