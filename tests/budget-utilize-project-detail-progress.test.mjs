import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const html = fs.readFileSync(path.join(root, "budget-utilize-app-dist", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "budget-utilize-app-dist", "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "budget-utilize-app-dist", "styles.css"), "utf8");

test("project details render after the project table and outside the insight rail", () => {
  const tableIndex = html.indexOf('class="panel table-panel"');
  const detailIndex = html.indexOf('id="selectedPanel"');
  const insightIndex = html.indexOf('class="insight-rail"');

  assert.ok(tableIndex >= 0, "project table must exist");
  assert.ok(detailIndex > tableIndex, "project details must follow the project table");
  assert.ok(insightIndex > detailIndex, "project details must appear before the insight rail");

  const insightEnd = html.indexOf("</aside>", insightIndex);
  assert.equal(
    html.slice(insightIndex, insightEnd).includes('id="selectedPanel"'),
    false,
    "project details must no longer be nested in the right insight rail"
  );
  assert.match(styles, /\.project-detail-panel\s*\{[\s\S]*?grid-column:\s*1;[\s\S]*?grid-row:\s*2;/);
});

test("BID PR PO CON progress always uses all four stages as the denominator", () => {
  const averageFunction = app.match(
    /function averageProgress\(progress, normalizedStatus\)\s*\{([\s\S]*?)\n\}/
  );

  assert.ok(averageFunction, "averageProgress function must exist");
  assert.match(averageFunction[1], /progressStageOptions\.map/);
  assert.match(averageFunction[1], /\/ progressStageOptions\.length/);
  assert.doesNotMatch(averageFunction[1], /\.filter\(\(value\) => value !== null\)/);

  const calculate = new Function(
    "progress",
    "normalizedStatus",
    `
      const progressStageOptions = [["bid", "BID"], ["pr", "PR"], ["po", "PO"], ["con", "CON"]];
      ${averageFunction[0]}
      return averageProgress(progress, normalizedStatus);
    `
  );

  assert.equal(calculate({ bid: 1, pr: null, po: null, con: null }, "active"), 0.25);
  assert.equal(calculate({ bid: 1, pr: 1, po: null, con: null }, "active"), 0.5);
  assert.equal(calculate({ bid: 1, pr: 1, po: 1, con: null }, "active"), 0.75);
  assert.equal(calculate({ bid: 1, pr: 1, po: 1, con: 1 }, "done"), 1);
});
