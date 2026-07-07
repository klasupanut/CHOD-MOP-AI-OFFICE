import "server-only";

export type BudgetUtilizeStatusKey = "done" | "active" | "stopped" | "blank";

export type BudgetUtilizeTask = {
  id: string;
  gid: string;
  rowNumber: number;
  index: string;
  item: string;
  site: string;
  sourceTitle: string;
  status: string;
  statusKey: BudgetUtilizeStatusKey;
  contractor: string;
  budget: number;
  budgetCode: string;
  poNumber: string;
  plan: string;
  owner: string;
  note: string;
  progress: {
    bid: number | null;
    pr: number | null;
    po: number | null;
    con: number | null;
  };
  averageProgress: number;
};

export type BudgetUtilizeData = {
  source: {
    status: "live" | "error";
    message: string;
    spreadsheetId: string;
    sheetUrl: string;
    loadedAt: string;
  };
  tasks: BudgetUtilizeTask[];
  summary: {
    totalTasks: number;
    realizedTasks: number;
    realizedBudget: number;
    remainingBudget: number;
    totalBudget: number;
    activeBudget: number;
    watchItems: number;
    watchBudget: number;
    doneRate: number;
    averageProgress: number;
    statusRows: Array<{ key: BudgetUtilizeStatusKey; label: string; value: number; budget: number; color: string }>;
    pipelineRows: Array<{ key: "bid" | "pr" | "po" | "con"; label: string; value: number }>;
    codeRows: Array<{ name: string; value: number; count: number; color: string }>;
    siteRows: Array<{ name: string; value: number; count: number; color: string }>;
    ownerRows: Array<{
      person: string;
      active: number;
      total: number;
      budget: number;
      watch: number;
      topProjects: string[];
    }>;
    attentionRows: BudgetUtilizeTask[];
    recentRows: BudgetUtilizeTask[];
  };
};

const DEFAULT_SPREADSHEET_ID = "1NmVPZkEGxeUvIQYsuoyF7L9Xhjn03zH5RZvDf8UJ2Po";
const REALIZED_BUDGET_CODES = ["ไม่ระบุ", "1C01", "1C02", "1B02"];

const BUDGET_UTILIZE_SHEETS = [
  { tab: "CHOD 1", title: "งานปรับปรุง-พัฒนา โชติธนวัฒน์ 1", gid: "1670988984", group: "location" as const },
  { tab: "CHOD 2", title: "งานปรับปรุง-พัฒนา โชติธนวัฒน์ 2", gid: "715191170", group: "location" as const },
  { tab: "CHOD 3", title: "งานปรับปรุง-พัฒนา โชติธนวัฒน์ 3", gid: "1288685133", group: "location" as const },
  { tab: "CHOD 5", title: "งานปรับปรุง-พัฒนา โชติธนวัฒน์ 5", gid: "1504272791", group: "location" as const },
  { tab: "CHODBIZ KM.8", title: "งานปรับปรุง-พัฒนา โชติบิส กม.8", gid: "1651929286", group: "location" as const },
  { tab: "CHODBIZ CHAENG", title: "งานปรับปรุง-พัฒนา โชติบิส แจ้งวัฒนะ", gid: "21424830", group: "location" as const },
  { tab: "CHODBIZ SAI4", title: "งานปรับปรุง-พัฒนา โชติบิส สาย 4", gid: "603834483", group: "location" as const },
  { tab: "Budget Remaining", title: "งบประมาณคงเหลือ", gid: "1997687741", group: "budget" as const },
];

const statusLabels: Record<BudgetUtilizeStatusKey, string> = {
  done: "ดำเนินการแล้วเสร็จ",
  active: "กำลังดำเนินการ",
  stopped: "ไม่ดำเนินการ",
  blank: "ไม่ระบุ",
};

const statusColors: Record<BudgetUtilizeStatusKey, string> = {
  done: "#16a34a",
  active: "#f59e0b",
  stopped: "#ef4444",
  blank: "#64748b",
};

const siteColors = ["#06b6d4", "#8b5cf6", "#f97316", "#22c55e", "#ec4899", "#0ea5e9", "#f43f5e"];
const codeColors = ["#64748b", "#06b6d4", "#8b5cf6", "#f97316", "#14b8a6", "#6366f1"];
const ownerNameMap = new Map<string, string>([
  ["ฟิล์ม", "Film"],
  ["กล้า", "Kla"],
  ["มอส", "Moss"],
  ["คุณพีรดนย์ โสภณอริยวงศ์", "Film"],
  ["พีรดนย์ โสภณอริยวงศ์", "Film"],
  ["คุณศุภณัฐ นิลคุปต์", "Kla"],
  ["ศุภณัฐ นิลคุปต์", "Kla"],
  ["คุณยุศกล บุญวิเศษ", "Moss"],
  ["ยุศกล บุญวิเศษ", "Moss"],
]);

function spreadsheetId() {
  return process.env.GOOGLE_SHEET_ID_BUDGET_UTILIZE || DEFAULT_SPREADSHEET_ID;
}

function sheetUrl() {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId()}/edit`;
}

async function fetchCsvRows(gid: string) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId()}/export?format=csv&gid=${gid}`;
  const response = await fetch(url, {
    cache: "force-cache",
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    throw new Error(`Budget Utilize Google Sheet request failed (${response.status})`);
  }
  const text = new TextDecoder("utf-8").decode(await response.arrayBuffer());
  return parseCsv(text);
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
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

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function firstText(row: string[] = []) {
  return row.find((value) => clean(value))?.trim() || "";
}

function toNumber(value: unknown) {
  const cleaned = clean(value).replace(/,/g, "");
  if (!cleaned || cleaned === "#REF!") return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toProgress(value: unknown) {
  const cleaned = clean(value).replace("%", "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return parsed > 1 ? parsed / 100 : parsed;
}

function percent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function ratio(value: number, total: number) {
  return total ? value / total : 0;
}

function sum<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((total, item) => total + (Number(getValue(item)) || 0), 0);
}

function normalizeStatus(status: string): BudgetUtilizeStatusKey {
  const value = clean(status).toLowerCase();
  if (!value) return "blank";
  if (value.includes("แล้วเสร็จ") || value.includes("done") || value.includes("complete")) return "done";
  if (value.includes("ไม่ดำเนินการ") || value.includes("cancel") || value.includes("stop")) return "stopped";
  if (value.includes("กำลัง") || value.includes("progress") || value.includes("active")) return "active";
  return "blank";
}

function readProgress(row: string[], statusKey: BudgetUtilizeStatusKey) {
  const progress = {
    bid: toProgress(row[2]),
    pr: toProgress(row[3]),
    po: toProgress(row[4]),
    con: toProgress(row[5]),
  };

  if (Object.values(progress).every((value) => value === null) && statusKey === "done") {
    return { bid: 1, pr: 1, po: 1, con: 1 };
  }
  return progress;
}

function averageProgress(progress: BudgetUtilizeTask["progress"], statusKey: BudgetUtilizeStatusKey) {
  const values = Object.values(progress).filter((value): value is number => value !== null);
  if (!values.length) return statusKey === "done" ? 1 : 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function normalizeOwner(value: string) {
  const owner = clean(value);
  return ownerNameMap.get(owner) || owner || "Unassigned";
}

function normalizedBudgetCode(task: Pick<BudgetUtilizeTask, "budgetCode">) {
  return clean(task.budgetCode).toUpperCase() || "ไม่ระบุ";
}

function isWatchable(task: Pick<BudgetUtilizeTask, "statusKey">) {
  return task.statusKey !== "done" && task.statusKey !== "stopped";
}

function isRealizedBudgetTask(task: BudgetUtilizeTask) {
  return task.statusKey !== "stopped" && REALIZED_BUDGET_CODES.includes(normalizedBudgetCode(task));
}

function parseLocationRows(sheet: (typeof BUDGET_UTILIZE_SHEETS)[number], rows: string[][]) {
  const mainTitle = firstText(rows[0]) || sheet.title;
  const headerRow = rows.findIndex((row) => row[0]?.includes("ลำดับ") && row[1]?.includes("รายการ"));
  const startIndex = headerRow >= 0 ? headerRow + 2 : 0;
  const tasks: BudgetUtilizeTask[] = [];

  rows.slice(startIndex).forEach((row, offset) => {
    const index = clean(row[0]);
    const item = clean(row[1]);
    if (!item || item.includes("รวมจำนวนเงิน")) return;

    const status = clean(row[6]);
    const budget = toNumber(row[8]);
    const hasProgress = [2, 3, 4, 5].some((column) => clean(row[column]));
    if (!status && budget <= 0 && !hasProgress) return;

    const statusKey = normalizeStatus(status);
    const progress = readProgress(row, statusKey);
    const rowNumber = startIndex + offset + 1;

    tasks.push({
      id: `${sheet.gid}-${rowNumber}-${index || tasks.length + 1}`,
      gid: sheet.gid,
      rowNumber,
      index,
      item,
      site: sheet.tab,
      sourceTitle: mainTitle,
      status: status || statusLabels[statusKey],
      statusKey,
      contractor: clean(row[7]),
      budget,
      budgetCode: clean(row[9]),
      plan: clean(row[10]),
      owner: normalizeOwner(row[11]),
      note: clean(row[12]),
      poNumber: clean(row[13]),
      progress,
      averageProgress: averageProgress(progress, statusKey),
    });
  });

  return tasks;
}

function extractCode(value: string) {
  return value.match(/\(([^)]+)\)/)?.[1] || "";
}

function parseBudgetRows(rows: string[][]) {
  const categoryRow = rows[2] || [];
  const categories = [2, 3, 4, 5].map((index) => ({
    index,
    label: clean(categoryRow[index]).replace(/\n/g, " "),
    code: extractCode(clean(categoryRow[index])),
  }));

  let section = "";
  const budgetRows: Array<{ unit: string; total: number; categories: Array<{ code: string; value: number }> }> = [];

  rows.slice(3).forEach((row) => {
    const index = clean(row[0]);
    const unit = clean(row[1]);
    const values = categories.map((category) => toNumber(row[category.index]));
    const hasValues = values.some((value) => value > 0);

    if (index && unit && !hasValues) {
      section = unit;
      return;
    }
    if (!unit || !hasValues) return;
    if (![section, unit].some((value) => value.includes("คลังสินค้า"))) return;

    budgetRows.push({
      unit,
      total: values.reduce((total, value) => total + value, 0),
      categories: categories.map((category, categoryIndex) => ({
        code: category.code,
        value: values[categoryIndex],
      })),
    });
  });

  return budgetRows;
}

function groupRows<T>(
  items: T[],
  getName: (item: T) => string,
  getValue: (item: T) => number,
  colors: string[],
) {
  const map = new Map<string, { name: string; value: number; count: number; color: string }>();
  items.forEach((item) => {
    const name = getName(item) || "ไม่ระบุ";
    const current = map.get(name) || { name, value: 0, count: 0, color: colors[map.size % colors.length] };
    current.value += getValue(item);
    current.count += 1;
    map.set(name, current);
  });
  return Array.from(map.values()).sort((a, b) => b.value - a.value || b.count - a.count);
}

function buildSummary(tasks: BudgetUtilizeTask[], remainingBudget: number) {
  const realizedTasks = tasks.filter(isRealizedBudgetTask);
  const doneTasks = tasks.filter((task) => task.statusKey === "done");
  const activeTasks = tasks.filter((task) => task.statusKey === "active");
  const stoppedTasks = tasks.filter((task) => task.statusKey === "stopped");
  const blankTasks = tasks.filter((task) => task.statusKey === "blank");
  const watchRows = tasks
    .filter((task) => isWatchable(task) && task.budget > 0)
    .sort((a, b) => b.budget - a.budget || a.averageProgress - b.averageProgress);

  const realizedBudget = sum(realizedTasks, (task) => task.budget);
  const statusRows = [
    { key: "done" as const, label: statusLabels.done, rows: doneTasks },
    { key: "active" as const, label: statusLabels.active, rows: activeTasks },
    { key: "stopped" as const, label: statusLabels.stopped, rows: stoppedTasks },
    { key: "blank" as const, label: statusLabels.blank, rows: blankTasks },
  ].map((row) => ({
    key: row.key,
    label: row.label,
    value: row.rows.length,
    budget: sum(row.rows, (task) => task.budget),
    color: statusColors[row.key],
  }));

  const ownerRows = ["Film", "Kla", "Moss", "Tammasit", "Foreman"].map((person) => {
    const ownerTasks = tasks.filter((task) => task.owner === person);
    const active = ownerTasks.filter(isWatchable);
    return {
      person,
      active: active.length,
      total: ownerTasks.length,
      budget: sum(ownerTasks.filter(isRealizedBudgetTask), (task) => task.budget),
      watch: active.filter((task) => task.budget > 0).length,
      topProjects: ownerTasks
        .slice()
        .sort((a, b) => b.budget - a.budget)
        .slice(0, 3)
        .map((task) => task.item),
    };
  });

  return {
    totalTasks: tasks.length,
    realizedTasks: realizedTasks.length,
    realizedBudget,
    remainingBudget,
    totalBudget: realizedBudget + remainingBudget,
    activeBudget: sum(activeTasks, (task) => task.budget),
    watchItems: watchRows.length,
    watchBudget: sum(watchRows, (task) => task.budget),
    doneRate: percent(ratio(doneTasks.length, tasks.length)),
    averageProgress: percent(tasks.length ? tasks.reduce((total, task) => total + task.averageProgress, 0) / tasks.length : 0),
    statusRows,
    pipelineRows: (["bid", "pr", "po", "con"] as const).map((key) => ({
      key,
      label: key.toUpperCase(),
      value: percent(tasks.length ? tasks.reduce((total, task) => total + (task.progress[key] ?? 0), 0) / tasks.length : 0),
    })),
    codeRows: groupRows(realizedTasks, normalizedBudgetCode, (task) => task.budget, codeColors).filter((row) => row.value > 0),
    siteRows: groupRows(realizedTasks, (task) => task.site, (task) => task.budget, siteColors).filter((row) => row.value > 0),
    ownerRows,
    attentionRows: watchRows.slice(0, 8),
    recentRows: tasks.slice().sort((a, b) => b.budget - a.budget).slice(0, 15),
  };
}

export async function getBudgetUtilizeData(): Promise<BudgetUtilizeData> {
  try {
    const sheetModels = await Promise.all(
      BUDGET_UTILIZE_SHEETS.map(async (sheet) => {
        const rows = await fetchCsvRows(sheet.gid);
        if (sheet.group === "budget") return { sheet, tasks: [] as BudgetUtilizeTask[], budgetRows: parseBudgetRows(rows) };
        return { sheet, tasks: parseLocationRows(sheet, rows), budgetRows: [] };
      }),
    );

    const tasks = sheetModels.flatMap((model) => model.tasks);
    const remainingBudget = sheetModels.flatMap((model) => model.budgetRows).reduce((total, row) => total + row.total, 0);

    return {
      source: {
        status: "live",
        message: "Live Budget Utilize Google Sheet",
        spreadsheetId: spreadsheetId(),
        sheetUrl: sheetUrl(),
        loadedAt: new Date().toISOString(),
      },
      tasks,
      summary: buildSummary(tasks, remainingBudget),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Budget Utilize Google Sheet is unavailable.";
    return {
      source: {
        status: "error",
        message,
        spreadsheetId: spreadsheetId(),
        sheetUrl: sheetUrl(),
        loadedAt: new Date().toISOString(),
      },
      tasks: [],
      summary: buildSummary([], 0),
    };
  }
}
