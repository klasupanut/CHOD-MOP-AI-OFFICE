export type WorkSheetColumns = {
  headerRow: number;
  index: number;
  item: number;
  bid: number;
  pr: number;
  po: number;
  con: number;
  status: number;
  contractor: number;
  budget: number;
  budgetCode: number;
  plan: number;
  owner: number;
  note: number;
  poNumber: number;
  lastColumn: number;
};

export type BudgetPeriodKind = "annual" | "outside-plan";

export type BudgetPeriod = {
  year: number;
  kind: BudgetPeriodKind;
  label: string;
};

export type BudgetPeriodInsertTarget = {
  period: BudgetPeriod;
  markerRowNumber: number;
  rowNumber: number;
  nextIndex: number;
  needsInsert: boolean;
  formatSourceRowNumber: number | null;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export function currentThailandBudgetYear(now = new Date()) {
  const gregorianYear = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
    }).format(now),
  );
  return gregorianYear + 543;
}

export function defaultBudgetPeriod(year = currentThailandBudgetYear()): BudgetPeriod {
  return {
    year,
    kind: "annual",
    label: `แผนงบประมาณปี ${year}`,
  };
}

export function parseBudgetPeriodMarker(
  index: unknown,
  item: unknown,
): BudgetPeriod | null {
  if (clean(index)) return null;
  const text = clean(item).replace(/\s+/g, " ");
  const match = text.match(/^(นอกแผน)?(?:แผน)?งบประมาณปี\s*(\d{4})/);
  if (!match) return null;

  const year = Number(match[2]);
  if (!Number.isInteger(year) || year < 2500 || year > 2999) return null;
  const kind: BudgetPeriodKind = match[1] ? "outside-plan" : "annual";
  return {
    year,
    kind,
    label: kind === "outside-plan"
      ? `นอกแผนงบประมาณปี ${year}`
      : `แผนงบประมาณปี ${year}`,
  };
}

function sameBudgetPeriod(left: BudgetPeriod, right: BudgetPeriod) {
  return left.year === right.year && left.kind === right.kind;
}

function numericWorkIndex(value: unknown) {
  const parsed = Number(clean(value).replace(/,/g, ""));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function resolveBudgetPeriodInsertTarget(
  rows: unknown[][],
  columns: WorkSheetColumns,
  requestedPeriod: Pick<BudgetPeriod, "year" | "kind">,
): BudgetPeriodInsertTarget {
  const dataStartIndex = columns.headerRow + 2;
  const sections: Array<{
    period: BudgetPeriod;
    markerStartIndex: number;
    contentStartIndex: number;
    endIndex: number;
  }> = [];
  let activeSection: (typeof sections)[number] | null = null;

  for (let rowIndex = dataStartIndex; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const marker = parseBudgetPeriodMarker(
      workCell(row, columns.index),
      workCell(row, columns.item),
    );
    if (!marker) continue;

    if (!activeSection || !sameBudgetPeriod(activeSection.period, marker)) {
      if (activeSection) {
        activeSection.endIndex = rowIndex;
        sections.push(activeSection);
      }
      activeSection = {
        period: marker,
        markerStartIndex: rowIndex,
        contentStartIndex: rowIndex + 1,
        endIndex: rows.length,
      };
      continue;
    }

    // The live template uses a title row followed by a same-period total row.
    // Work rows begin after the final consecutive marker row.
    activeSection.contentStartIndex = rowIndex + 1;
  }

  if (activeSection) sections.push(activeSection);

  const matches = sections.filter((section) => (
    section.period.year === requestedPeriod.year
    && section.period.kind === requestedPeriod.kind
  ));
  if (matches.length === 0) {
    const label = requestedPeriod.kind === "outside-plan"
      ? `นอกแผนงบประมาณปี ${requestedPeriod.year}`
      : `แผนงบประมาณปี ${requestedPeriod.year}`;
    throw new Error(`ไม่พบหัวข้อ "${label}" ใน Google Sheet นี้ ระบบจึงหยุดเพื่อป้องกันการลงข้อมูลผิดหมวด`);
  }
  if (matches.length > 1) {
    throw new Error("พบหัวข้องบประมาณซ้ำใน Google Sheet ระบบจึงหยุดเพื่อป้องกันการลงข้อมูลผิดหมวด");
  }

  const section = matches[0];
  const workRows: Array<{ rowIndex: number; index: number | null }> = [];
  for (let rowIndex = section.contentStartIndex; rowIndex < section.endIndex; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const item = clean(workCell(row, columns.item));
    if (!item) continue;
    workRows.push({
      rowIndex,
      index: numericWorkIndex(workCell(row, columns.index)),
    });
  }

  const lastWorkRowIndex = workRows.length
    ? workRows[workRows.length - 1].rowIndex
    : section.contentStartIndex - 1;
  let reusableRowIndex: number | null = null;
  for (
    let rowIndex = Math.max(section.contentStartIndex, lastWorkRowIndex + 1);
    rowIndex < section.endIndex;
    rowIndex += 1
  ) {
    if (!clean(workCell(rows[rowIndex] || [], columns.item))) {
      reusableRowIndex = rowIndex;
      break;
    }
  }

  const reusableIndex = reusableRowIndex === null
    ? null
    : numericWorkIndex(workCell(rows[reusableRowIndex] || [], columns.index));
  const maxIndex = workRows.reduce((maximum, row) => Math.max(maximum, row.index || 0), 0);
  const fallbackFormatRow = workRows.at(-1)?.rowIndex
    ?? rows.findIndex((row, rowIndex) => (
      rowIndex >= dataStartIndex
      && Boolean(clean(workCell(row || [], columns.item)))
      && numericWorkIndex(workCell(row || [], columns.index)) !== null
    ));

  return {
    period: section.period,
    markerRowNumber: section.markerStartIndex + 1,
    rowNumber: (reusableRowIndex ?? section.endIndex) + 1,
    nextIndex: reusableIndex ?? (maxIndex + 1),
    needsInsert: reusableRowIndex === null,
    formatSourceRowNumber: fallbackFormatRow >= dataStartIndex ? fallbackFormatRow + 1 : null,
  };
}

function normalizeHeader(value: unknown) {
  return clean(value).replace(/\s+/g, " ").toUpperCase();
}

function findExactColumn(headerRows: unknown[][], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  for (const row of headerRows) {
    const index = row.findIndex((value) => normalizedAliases.includes(normalizeHeader(value)));
    if (index >= 0) return index;
  }
  return -1;
}

function requireColumn(columns: Record<string, number>, key: string, label: string) {
  if (columns[key] >= 0) return;
  throw new Error(`Google Sheet column "${label}" was not found. Data mapping stopped to prevent an incorrect write.`);
}

export function resolveWorkSheetColumns(rows: unknown[][]): WorkSheetColumns {
  const headerRow = rows.findIndex(
    (row) => normalizeHeader(row[0]) === normalizeHeader("ลำดับ")
      && normalizeHeader(row[1]) === normalizeHeader("รายการ"),
  );
  if (headerRow < 0) {
    throw new Error("Google Sheet work header was not found.");
  }

  const primary = rows[headerRow] || [];
  const secondary = rows[headerRow + 1] || [];
  const columns: Record<string, number> = {
    headerRow,
    index: findExactColumn([primary], ["ลำดับ"]),
    item: findExactColumn([primary], ["รายการ"]),
    bid: findExactColumn([secondary, primary], ["BID"]),
    pr: findExactColumn([secondary, primary], ["PR"]),
    po: findExactColumn([secondary, primary], ["PO"]),
    con: findExactColumn([secondary, primary], ["CON"]),
    status: findExactColumn([primary], ["สถานะ", "STATUS"]),
    contractor: findExactColumn([primary], ["ผู้รับเหมา", "CONTRACTOR"]),
    budget: findExactColumn([primary], ["งบประมาณ", "BUDGET"]),
    budgetCode: findExactColumn([primary], ["รหัสงบประมาณ", "รหัสงบ", "BUDGET CODE"]),
    plan: findExactColumn([primary], ["แผนงาน", "PLAN"]),
    owner: findExactColumn([primary], ["ผู้รับผิดชอบ", "OWNER"]),
    note: findExactColumn([primary], ["หมายเหตุ", "NOTE"]),
    poNumber: findExactColumn([primary], ["PO NUMBER", "PO NO", "PO NO."]),
  };

  if (
    columns.budgetCode < 0
    && columns.budget >= 0
    && normalizeHeader(secondary[columns.budget + 1]) === normalizeHeader("รหัส")
  ) {
    columns.budgetCode = columns.budget + 1;
  }

  [
    ["index", "ลำดับ"],
    ["item", "รายการ"],
    ["bid", "BID"],
    ["pr", "PR"],
    ["po", "PO"],
    ["con", "CON"],
    ["status", "สถานะ"],
    ["budget", "งบประมาณ"],
  ].forEach(([key, label]) => requireColumn(columns, key, label));

  const lastColumn = Math.max(
    ...Object.entries(columns)
      .filter(([key, value]) => key !== "headerRow" && value >= 0)
      .map(([, value]) => value),
  );

  return { ...columns, lastColumn } as WorkSheetColumns;
}

export function workCell(row: unknown[], column: number) {
  return column >= 0 ? row[column] : "";
}

export function columnLetter(column: number) {
  if (!Number.isInteger(column) || column < 0) {
    throw new Error("Invalid Google Sheet column index.");
  }
  let value = column + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}
