import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  columnLetter,
  resolveWorkSheetColumns,
} from "../src/lib/budget-utilize/work-sheet-schema.ts";

const root = process.cwd();
const embeddedApp = fs.readFileSync(path.join(root, "budget-utilize-app-dist", "app.js"), "utf8");
const serverReader = fs.readFileSync(
  path.join(root, "src", "lib", "budget-utilize", "budget-utilize-data.ts"),
  "utf8",
);
const writeRoute = fs.readFileSync(
  path.join(root, "src", "app", "api", "budget-utilize-app", "[...path]", "route.ts"),
  "utf8",
);

const expandedRows = [
  ["งานปรับปรุง"],
  [
    "ลำดับ",
    "รายการ",
    "ปริมาณ",
    "",
    "งบประมาณ",
    "",
    "แผนงาน",
    "ผู้รับผิดชอบ",
    "สถานะการจัดจ้าง",
    "",
    "",
    "",
    "สถานะ",
    "จำนวนเงินดำเนินการจริง",
    "งบประมาณ คงเหลือ",
    "",
    "ผู้รับเหมา",
    "PO \nNUMBER",
    "หมายเหตุ",
    "STAGE",
  ],
  ["", "", "จำนวน", "หน่วย", "จำนวนเงิน", "รหัส", "", "", "BID", "PR", "PO", "CON", "", "", "", "", "", "", "", ""],
];

const compactRows = [
  ["งานปรับปรุง"],
  [
    "ลำดับ",
    "รายการ",
    "สถานะการจัดจ้าง",
    "",
    "",
    "",
    "สถานะ",
    "ผู้รับเหมา",
    "งบประมาณ",
    "รหัสงบประมาณ",
    "แผนงาน",
    "ผู้รับผิดชอบ",
    "หมายเหตุ",
    "PO NUMBER",
  ],
  ["", "", "BID", "PR", "PO", "CON"],
];

test("expanded CHOD sheets resolve status and procurement stages from their real headers", () => {
  const columns = resolveWorkSheetColumns(expandedRows);
  assert.equal(columns.plan, 6);
  assert.equal(columns.bid, 8);
  assert.equal(columns.pr, 9);
  assert.equal(columns.po, 10);
  assert.equal(columns.con, 11);
  assert.equal(columns.status, 12);
  assert.equal(columns.budget, 4);
  assert.equal(columns.budgetCode, 5);
  assert.equal(columns.contractor, 16);
  assert.equal(columns.poNumber, 17);
  assert.equal(columns.note, 18);
  assert.equal(columns.stage, 19);
  assert.equal(columnLetter(columns.status), "M");
  assert.equal(columnLetter(columns.stage), "T");

  const projectRow = [
    "1",
    "Project A",
    "1",
    "งาน",
    "500000",
    "1B02",
    "Q3/2569",
    "Film",
    "100%",
    "",
    "",
    "",
    "กำลังดำเนินการ",
  ];
  assert.equal(projectRow[columns.plan], "Q3/2569");
  assert.equal(projectRow[columns.status], "กำลังดำเนินการ");
  assert.notEqual(columns.plan, columns.status);
});

test("compact CHODBIZ sheets retain their C-F stages and G status mapping", () => {
  const columns = resolveWorkSheetColumns(compactRows);
  assert.equal(columns.bid, 2);
  assert.equal(columns.pr, 3);
  assert.equal(columns.po, 4);
  assert.equal(columns.con, 5);
  assert.equal(columns.status, 6);
  assert.equal(columns.budget, 8);
  assert.equal(columns.plan, 10);
  assert.equal(columnLetter(columns.status), "G");
});

test("all Budget Utilize read and write paths use header mapping instead of fixed status column 6", () => {
  assert.match(embeddedApp, /const columns = resolveWorkColumns\(rows\)/);
  assert.match(embeddedApp, /workCell\(row, columns\.status\)/);
  assert.doesNotMatch(embeddedApp, /const status = clean\(row\[6\]\)/);

  assert.match(serverReader, /const columns = resolveWorkSheetColumns\(rows\)/);
  assert.match(serverReader, /workCell\(row, columns\.status\)/);
  assert.doesNotMatch(serverReader, /const status = clean\(row\[6\]\)/);

  assert.match(writeRoute, /const columns = await readWorkSheetSchema\(title\)/);
  assert.match(writeRoute, /putBudgetCells\(title, rowNumber/);
  assert.match(writeRoute, /columns\.stage/);
  assert.match(writeRoute, /statusForChangedStage/);
  assert.doesNotMatch(writeRoute, /row\[6\]\s*=\s*statusWriteLabels/);
});
