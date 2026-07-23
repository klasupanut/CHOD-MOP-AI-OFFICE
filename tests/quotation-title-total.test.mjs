import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bundleUrl = new URL(
  "../quotation-app-dist/assets/index-Bvr2xpFw.js",
  import.meta.url,
);

test("New Quotation titles show the total of their own items", async () => {
  const bundle = await readFile(bundleUrl, "utf8");

  assert.match(bundle, /work-title-total-/);
  assert.match(bundle, /U\.parentTitleId===h\.itemId/);
  assert.match(bundle, /Number\(U\.sellingTotal\)/);
  assert.match(bundle, /children:"Title Total"/);
});

