import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../budget-utilize-app-dist/app.js", import.meta.url), "utf8");
const routeSource = await readFile(new URL("../src/app/api/budget-utilize-app/[...path]/route.ts", import.meta.url), "utf8");

test("person summary metadata resolves to the guarded source project row", () => {
  assert.match(appSource, /function personSummarySourceMetadata\(task\)/);
  assert.match(appSource, /sourceRowMap\.get\(`\$\{metadata\.gid\}:\$\{metadata\.rowNumber\}`\)/);
  assert.doesNotMatch(appSource, /if \(hasPersonSummarySyncMetadata\(task\)\) return;/);
});

test("person summary delete sends its selected summary identity", () => {
  assert.match(appSource, /summaryGid: task\.sourceGroup === "person" \? task\.gid : ""/);
  assert.match(appSource, /summaryRowNumber: task\.sourceGroup === "person" \? task\.rowNumber : 0/);
});

test("budget delete preserves row numbering and clears only validated ranges", () => {
  assert.match(routeSource, /sheetsFetch\("\/values:batchClear"/);
  assert.match(routeSource, /findPersonSummaryRows\(gid, rowNumber, item\)/);
  assert.match(routeSource, /validateSelectedSummaryRow\(payload, gid, item\)/);
  assert.doesNotMatch(routeSource, /deleteDimension/);
});
