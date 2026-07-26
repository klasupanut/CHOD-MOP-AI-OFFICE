import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const embeddedApp = await readFile(
  new URL("../budget-utilize-app-dist/app.js", import.meta.url),
  "utf8",
);
const embeddedHtml = await readFile(
  new URL("../budget-utilize-app-dist/index.html", import.meta.url),
  "utf8",
);
const embeddedStyles = await readFile(
  new URL("../budget-utilize-app-dist/styles.css", import.meta.url),
  "utf8",
);
const moduleFrame = await readFile(
  new URL("../src/components/projects/BudgetUtilizeModuleFrame.tsx", import.meta.url),
  "utf8",
);

test("work list is paginated and becomes readable cards on tablet and mobile", () => {
  assert.match(embeddedApp, /const tablePageSize = 24;/);
  assert.match(embeddedApp, /data-label="รายการ"/);
  assert.match(embeddedApp, /data-label="งบประมาณ"/);
  assert.match(embeddedStyles, /@media screen and \(max-width: 820px\)[\s\S]*?tbody tr\s*\{[\s\S]*?grid-template-columns: repeat\(2,/);
  assert.match(embeddedStyles, /tbody td::before\s*\{[\s\S]*?content: attr\(data-label\)/);
});

test("project dialog has modal semantics, escape support and focus restoration", () => {
  assert.match(embeddedHtml, /role="dialog"/);
  assert.match(embeddedHtml, /aria-modal="true"/);
  assert.match(embeddedHtml, /aria-labelledby="newProjectDialogTitle"/);
  assert.match(embeddedApp, /function handleProjectModalKeyboard\(event\)/);
  assert.match(embeddedApp, /event\.key === "Escape"/);
  assert.match(embeddedApp, /lastModalTrigger\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(embeddedStyles, /body\.modal-open\s*\{[\s\S]*?overflow: hidden;/);
});

test("embedded module refresh uses one remount and exposes a loading state", () => {
  assert.doesNotMatch(moduleFrame, /contentWindow\?\.location\.reload/);
  assert.match(moduleFrame, /setReloadKey\(\(value\) => value \+ 1\)/);
  assert.match(moduleFrame, /aria-busy=\{isFrameLoading\}/);
  assert.match(moduleFrame, /กำลังโหลด Projects & Budgets/);
});

test("empty filters provide a direct recovery action", () => {
  assert.match(embeddedApp, /data-clear-table-filters/);
  assert.match(embeddedApp, /resetFilters\(\);[\s\S]*?render\(\);/);
  assert.match(embeddedStyles, /\.table-empty-state/);
});
