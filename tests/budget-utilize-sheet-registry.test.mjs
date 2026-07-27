import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const registryFiles = [
  "../budget-utilize-app-dist/app.js",
  "../src/lib/budget-utilize/budget-utilize-data.ts",
  "../src/app/api/budget-utilize-app/[...path]/route.ts",
  "../scripts/verify-budget-sheet-mapping.mjs",
];

const sources = await Promise.all(
  registryFiles.map(async (relativePath) => ({
    relativePath,
    source: await readFile(new URL(relativePath, import.meta.url), "utf8"),
  })),
);

test("CHODBIZ SAI4 uses the current Google Sheet gid in every registry", () => {
  for (const { relativePath, source } of sources) {
    assert.match(
      source,
      /1042125038/,
      `${relativePath} must use the current CHODBIZ SAI4 gid`,
    );
    assert.doesNotMatch(
      source,
      /603834483/,
      `${relativePath} must not retain the deleted CHODBIZ SAI4 gid`,
    );
  }
});
