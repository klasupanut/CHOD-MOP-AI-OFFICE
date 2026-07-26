import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  currentThailandBudgetYear,
  defaultBudgetPeriod,
  parseBudgetPeriodMarker,
  resolveBudgetPeriodInsertTarget,
} from "../src/lib/budget-utilize/work-sheet-schema.ts";

const embeddedApp = await readFile(
  new URL("../budget-utilize-app-dist/app.js", import.meta.url),
  "utf8",
);
const embeddedStyles = await readFile(
  new URL("../budget-utilize-app-dist/styles.css", import.meta.url),
  "utf8",
);
const serverDataSource = await readFile(
  new URL("../src/lib/budget-utilize/budget-utilize-data.ts", import.meta.url),
  "utf8",
);
const writeRoute = await readFile(
  new URL("../src/app/api/budget-utilize-app/[...path]/route.ts", import.meta.url),
  "utf8",
);
const embeddedHtml = await readFile(
  new URL("../budget-utilize-app-dist/index.html", import.meta.url),
  "utf8",
);

const testColumns = {
  headerRow: 0,
  index: 0,
  item: 1,
  bid: 2,
  pr: 3,
  po: 4,
  con: 5,
  status: 6,
  contractor: 7,
  budget: 8,
  budgetCode: 9,
  plan: 10,
  owner: 11,
  note: 12,
  poNumber: 13,
  lastColumn: 13,
};

test("Thailand budget year follows the current ICT calendar year", () => {
  assert.equal(currentThailandBudgetYear(new Date("2026-07-26T12:00:00.000Z")), 2569);
  assert.deepEqual(defaultBudgetPeriod(2569), {
    year: 2569,
    kind: "annual",
    label: "แผนงบประมาณปี 2569",
  });
});

test("existing Google Sheet marker rows resolve without changing the template", () => {
  assert.deepEqual(parseBudgetPeriodMarker("", "นอกแผนงบประมาณปี 2569 รวมจำนวนเงิน"), {
    year: 2569,
    kind: "outside-plan",
    label: "นอกแผนงบประมาณปี 2569",
  });
  assert.deepEqual(parseBudgetPeriodMarker("", "แผนงบประมาณปี 2570"), {
    year: 2570,
    kind: "annual",
    label: "แผนงบประมาณปี 2570",
  });
  assert.equal(parseBudgetPeriodMarker("1", "งานปรับปรุงระบบไฟฟ้า"), null);
});

test("normal summaries use current-year work while virtual planning menus expose separate periods", () => {
  assert.match(embeddedApp, /const OUTSIDE_PLAN_VIEW = "outside-plan-current";/);
  assert.match(embeddedApp, /const NEXT_YEAR_PLAN_VIEW = "next-year-plan";/);
  assert.match(
    embeddedApp,
    /tasksForBudgetPeriod\(CURRENT_BUDGET_YEAR, "outside-plan"\)/,
  );
  assert.match(
    embeddedApp,
    /tasksForBudgetPeriod\(NEXT_BUDGET_YEAR, "annual"\)/,
  );
  assert.match(
    serverDataSource,
    /\.filter\(\(task\) => task\.budgetYear === currentBudgetYear\)/,
  );
});

test("work rows navigate to details and details provide a return-to-list control", () => {
  assert.match(embeddedApp, /function selectTaskAndShowDetails\(row, tasks\)/);
  assert.match(
    embeddedApp,
    /els\.selectedPanel\.scrollIntoView\(\{ block: "start", behavior: "smooth" \}\)/,
  );
  assert.match(embeddedApp, /data-scroll-to-work-list/);
  assert.match(embeddedApp, /function scrollToWorkList\(\)/);
  assert.match(
    embeddedApp,
    /els\.tablePanel\.scrollIntoView\(\{ block: "start", behavior: "smooth" \}\)/,
  );
  assert.match(embeddedStyles, /\.project-detail-panel\s*\{[\s\S]*?scroll-margin-top:\s*92px;/);
});

test("period-aware add reuses a safe trailing slot or inserts before the next marker", () => {
  const rows = [
    ["ลำดับ", "รายการ"],
    ["", ""],
    ["", "แผนงบประมาณปี 2569"],
    ["", "แผนงบประมาณปี 2569 รวมจำนวนเงิน"],
    [1, "งานเดิมปี 2569"],
    ["", ""],
    ["", "นอกแผนงบประมาณปี 2569"],
    ["", "นอกแผนงบประมาณปี 2569 รวมจำนวนเงิน"],
    [1, "งานนอกแผนเดิม"],
    ["", "แผนงบประมาณปี 2570"],
    ["", "แผนงบประมาณปี 2570 รวมจำนวนเงิน"],
    [1, ""],
  ];

  assert.deepEqual(
    resolveBudgetPeriodInsertTarget(rows, testColumns, { year: 2569, kind: "annual" }),
    {
      period: {
        year: 2569,
        kind: "annual",
        label: "แผนงบประมาณปี 2569",
      },
      markerRowNumber: 3,
      rowNumber: 6,
      nextIndex: 2,
      needsInsert: false,
      formatSourceRowNumber: 5,
    },
  );

  const outsidePlan = resolveBudgetPeriodInsertTarget(
    rows,
    testColumns,
    { year: 2569, kind: "outside-plan" },
  );
  assert.equal(outsidePlan.rowNumber, 10);
  assert.equal(outsidePlan.nextIndex, 2);
  assert.equal(outsidePlan.needsInsert, true);

  const nextYear = resolveBudgetPeriodInsertTarget(
    rows,
    testColumns,
    { year: 2570, kind: "annual" },
  );
  assert.equal(nextYear.rowNumber, 12);
  assert.equal(nextYear.nextIndex, 1);
  assert.equal(nextYear.needsInsert, false);
});

test("period-aware add refuses a missing marker instead of silently appending", () => {
  const rows = [
    ["ลำดับ", "รายการ"],
    ["", ""],
    ["", "แผนงบประมาณปี 2569"],
    ["", "แผนงบประมาณปี 2569 รวมจำนวนเงิน"],
    [1, "งานเดิม"],
  ];
  assert.throws(
    () => resolveBudgetPeriodInsertTarget(rows, testColumns, { year: 2570, kind: "annual" }),
    /ไม่พบหัวข้อ/,
  );
});

test("live add UI and API carry a guarded budget period for the four reference sheets", () => {
  assert.match(embeddedHtml, /id="newProjectPeriod"/);
  assert.match(embeddedApp, /const PERIOD_AWARE_SITE_GIDS = new Set/);
  assert.match(embeddedApp, /budgetYear: selectedPeriod\?\.year/);
  assert.match(embeddedApp, /budgetPeriodKind: selectedPeriod\?\.kind/);
  assert.match(writeRoute, /const periodAwareLocationSheets = new Set/);
  assert.match(writeRoute, /resolveBudgetPeriodInsertTarget\(rows, columns, period\)/);
  assert.match(writeRoute, /sheetsFetch\(":batchUpdate"/);
  assert.match(writeRoute, /insertDimension/);
  assert.match(writeRoute, /Google Sheet write verification failed/);
});
