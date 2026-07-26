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

function clean(value: unknown) {
  return String(value ?? "").trim();
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
