import {
  columnLetter,
  defaultBudgetPeriod,
  parseBudgetPeriodMarker,
  resolveWorkSheetColumns,
  workCell,
} from "../src/lib/budget-utilize/work-sheet-schema.ts";

const spreadsheetId = process.env.GOOGLE_SHEET_ID_BUDGET_UTILIZE
  || "1NmVPZkEGxeUvIQYsuoyF7L9Xhjn03zH5RZvDf8UJ2Po";
const sites = [
  ["CHOD1", "1670988984"],
  ["CHOD2", "715191170"],
  ["CHOD3", "1288685133"],
  ["CHOD5", "1504272791"],
  ["KM8", "1651929286"],
  ["CHAENG", "21424830"],
  ["SAI4", "603834483"],
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

function statusKey(value) {
  const status = String(value || "").trim();
  if (status.includes("แล้วเสร็จ")) return "done";
  if (status.includes("ไม่ดำเนินการ")) return "stopped";
  if (status.includes("กำลัง")) return "active";
  return "blank";
}

function amount(value) {
  const parsed = Number(String(value || "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

for (const [name, gid] of sites) {
  const response = await fetch(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
  );
  if (!response.ok) throw new Error(`${name}: Google Sheet returned ${response.status}`);
  const rows = parseCsv(await response.text());
  const columns = resolveWorkSheetColumns(rows);
  const counts = { done: 0, active: 0, stopped: 0, blank: 0 };
  const periodCounts = {};
  const periodBudgets = {};
  let budgetPeriod = defaultBudgetPeriod();

  for (const row of rows.slice(columns.headerRow + 2)) {
    const index = String(workCell(row, columns.index) || "").trim();
    const item = String(workCell(row, columns.item) || "").trim();
    const periodMarker = parseBudgetPeriodMarker(index, item);
    if (periodMarker) {
      budgetPeriod = periodMarker;
      continue;
    }
    if (
      !item
      || (!index && (item.includes("รวมจำนวนเงิน") || /^(?:นอกแผน)?(?:แผน)?งบประมาณปี/.test(item)))
    ) {
      continue;
    }
    counts[statusKey(workCell(row, columns.status))] += 1;
    const periodKey = `${budgetPeriod.kind}:${budgetPeriod.year}`;
    periodCounts[periodKey] = (periodCounts[periodKey] || 0) + 1;
    periodBudgets[periodKey] = (periodBudgets[periodKey] || 0)
      + amount(workCell(row, columns.budget));
  }

  console.log(JSON.stringify({
    site: name,
    statusColumn: columnLetter(columns.status),
    procurementColumns: `${columnLetter(columns.bid)}-${columnLetter(columns.con)}`,
    budgetColumn: columnLetter(columns.budget),
    counts,
    periodCounts,
    periodBudgets,
  }));
}
