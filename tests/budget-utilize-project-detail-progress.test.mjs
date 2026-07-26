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

test("new project stage uses the six-step workflow while legacy progress stays compatible", () => {
  const averageFunction = app.match(
    /function averageProgress\(progress, normalizedStatus, stageKey = ""\)\s*\{([\s\S]*?)\n\}/
  );
  const stageProgressFunction = app.match(
    /function projectStageProgress\(stageKey\)\s*\{([\s\S]*?)\n\}/
  );

  assert.ok(averageFunction, "averageProgress function must exist");
  assert.ok(stageProgressFunction, "projectStageProgress function must exist");
  assert.match(averageFunction[1], /projectStageProgress\(stageKey\)/);
  assert.match(averageFunction[1], /progressStageOptions\.map/);
  assert.match(averageFunction[1], /\/ progressStageOptions\.length/);
  assert.doesNotMatch(averageFunction[1], /\.filter\(\(value\) => value !== null\)/);

  const calculate = new Function(
    "progress",
    "normalizedStatus",
    "stageKey",
    `
      const progressStageOptions = [["bid", "BID"], ["pr", "PR"], ["po", "PO"], ["con", "CON"]];
      const projectStageOptions = [
        ["site-survey", "Site Survey"],
        ["bid", "Bid"],
        ["budget-approved", "Budget Approved"],
        ["pr", "PR"],
        ["po", "PO"],
        ["handover", "Handover"]
      ];
      ${stageProgressFunction[0]}
      ${averageFunction[0]}
      return averageProgress(progress, normalizedStatus, stageKey);
    `
  );

  assert.equal(calculate({}, "active", "site-survey"), 1 / 6);
  assert.equal(calculate({}, "active", "bid"), 2 / 6);
  assert.equal(calculate({}, "active", "budget-approved"), 3 / 6);
  assert.equal(calculate({}, "active", "pr"), 4 / 6);
  assert.equal(calculate({}, "active", "po"), 5 / 6);
  assert.equal(calculate({}, "done", "handover"), 1);
  assert.equal(calculate({ bid: 1, pr: null, po: null, con: null }, "active", ""), 0.25);
  assert.equal(calculate({ bid: 1, pr: 1, po: 1, con: 1 }, "done", ""), 1);
});

test("all work-list menus expand the table and details without duplicating remaining budget", () => {
  assert.match(app, /const showsBudgetRemaining = isBudgetMenu;/);
  assert.match(app, /els\.contentGrid\.classList\.toggle\("wide-work-layout", !isActionCenter\);/);
  assert.match(
    app,
    /els\.insightRail\.classList\.toggle\("hidden", !isBudgetMenu && !isActionCenter\);/
  );
  assert.match(
    app,
    /els\.budgetRemainingPanel\.classList\.toggle\("hidden", !isBudgetMenu\);/
  );
  assert.match(
    styles,
    /\.content-grid\.wide-work-layout\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\);/
  );
  assert.match(
    styles,
    /\.content-grid\.wide-work-layout\s*>\s*\.insight-rail\s*\{[\s\S]*?grid-column:\s*1;[\s\S]*?grid-row:\s*4;/
  );
});
