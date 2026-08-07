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

test("quotation PDF exports split content into fixed A4 page clones", () => {
  assert.match(bundle, /chodPdfBuildPages=/);
  assert.match(bundle, /data-pdf-page/);
  assert.match(bundle, /width:"210mm",height:"297mm"/);
  assert.match(bundle, /replaceChildren\(\.\.\.f\.map\(v=>v\.cloneNode\(!0\)\),\.\.\.C\.map\(v=>v\.cloneNode\(!0\)\)\)/);
  assert.match(bundle, /x\.addPage\("a4","portrait"\)/);
});

test("each page is cloned from the full preview and only table rows are paginated", () => {
  assert.match(bundle, /chodPdfStylePage\(o\.cloneNode\(!0\)\)/);
  assert.match(bundle, /const u=o\.querySelector\("tbody"\)/);
  assert.match(bundle, /const N=Array\.from\(u\.children\)/);
  assert.match(bundle, /,x=N\.slice\(0,v\),S=N\.slice\(v\)/);
  assert.match(bundle, /if\(E\(T,S\)\)O\.push\(M\(T,S\)\)/);
});

test("standard, internal-verified and customer-signed exports share pagination", () => {
  assert.equal(
    (bundle.match(/chodPdfRenderDocument\(o,f,u,N\)/g) ?? []).length,
    2,
  );
  assert.match(bundle, /C\.internalVerified\?Ke\.uploadInternalVerifiedPdf\(k\):Ke\.uploadPdf\(k\)/);
  assert.match(bundle, /filename:`\$\{hc\(chodQuotationReference\(f,!0\)\)\}-\$\{hc\(f\.client\|\|"Client"\)\}-\$\{hc\(f\.date\)\}-SIGNED\.pdf`/);
});

test("legacy whole-document one-page scaling is removed", () => {
  assert.doesNotMatch(bundle, /Math\.min\(k\/x\.width,297\/x\.height\)/);
  assert.doesNotMatch(bundle, /Math\.min\(210\/x\.width,297\/x\.height\)/);
});

test("quotation bundle cache key identifies pagination release", () => {
  assert.match(indexHtml, /index-HmUxnN6T\.js\?v=20260807-pdf-pagination/);
});
