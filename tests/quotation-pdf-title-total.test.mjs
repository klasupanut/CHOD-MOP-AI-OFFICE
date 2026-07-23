import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Quotation PDF titles show totals in the TOTAL (THB.) column", async () => {
  const indexUrl = new URL("../quotation-app-dist/index.html", import.meta.url);
  const html = await readFile(indexUrl, "utf8");
  const activeBundleName = html.match(
    /<script[^>]+src="\/assets\/(index-[^?"/]+\.js)/,
  )?.[1];

  assert.ok(activeBundleName, "index.html must reference an active JS bundle");

  const bundleUrl = new URL(
    `../quotation-app-dist/assets/${activeBundleName}`,
    import.meta.url,
  );
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
