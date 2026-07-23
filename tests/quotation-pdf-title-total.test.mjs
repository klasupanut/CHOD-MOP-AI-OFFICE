import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bundleUrl = new URL(
  "../quotation-app-dist/assets/index-Bvr2xpFw.js",
  import.meta.url,
);

test("Quotation PDF titles show totals in the TOTAL (THB.) column", async () => {
  const bundle = await readFile(bundleUrl, "utf8");

  assert.doesNotMatch(bundle, /work-title-total-/);
  assert.match(bundle, /quotation-title-total-/);
  assert.match(bundle, /x\.parentTitleId===S\.itemId/);
  assert.match(bundle, /Number\(x\.quotationTotal\)/);
  assert.match(
    bundle,
    /colSpan:4,className:"border border-slate-400 px-2 py-2\.5 text-left"/,
  );
});

