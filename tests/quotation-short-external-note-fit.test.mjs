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

test("one or two short external-note lines use compact A4 spacing", () => {
  assert.match(
    bundle,
    /chodCompactExternalNote=!!chodExternalNote&&chodExternalNote\.split\(\/\\r\?\\n\/\)\.length<=2&&chodExternalNote\.length<=240/,
  );
  assert.match(
    bundle,
    /paddingTop:chodCompactExternalNote\?"7mm":"11mm",paddingBottom:chodCompactExternalNote\?"7mm":"11mm"/,
  );
  assert.match(
    bundle,
    /"data-compact-note":chodCompactExternalNote\?"true":"false"/,
  );
  assert.match(
    bundle,
    /chodCompactExternalNote\?"mt-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1 text-\[10px\] leading-tight text-slate-700"/,
  );
  assert.match(
    bundle,
    /paddingTop:chodCompactExternalNote\?"5mm":"8mm",paddingBottom:"4mm"/,
  );
});

test("long external notes keep the standard readable layout", () => {
  assert.match(
    bundle,
    /:"mt-4 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2\.5 text-\[11px\] text-slate-700"/,
  );
  assert.match(bundle, /chodExternalNote\?i\.jsxs\("section"/);
});

test("quotation cache key identifies the short-note fit release", () => {
  assert.match(
    indexHtml,
    /index-HmUxnN6T\.js\?v=20260924-short-external-note-fit/,
  );
});
