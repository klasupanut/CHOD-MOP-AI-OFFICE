export type FitoutViewMode = "annual" | "mega" | "mini";

export type FitoutProjectRow = {
  id: string;
  project: string;
  block: string;
  unit: string;
  startDate: string;
  finishDate: string;
  actualCapex: number;
  realizedRevenue: number;
  netOperatingProfit: number;
  type: "Mini Fit-out" | "Mega Fit-out";
};

export type FitoutAnnualRow = {
  year: number;
  totalJobs: number;
  miniJobs: number;
  megaJobs: number;
  actualCapex: number;
  realizedRevenue: number;
  netOperatingProfit: number;
  miniActualCapex: number;
  megaActualCapex: number;
  miniRevenue: number;
  megaRevenue: number;
  miniProfit: number;
  megaProfit: number;
  profitMargin: number;
  averageRevenue: number;
};

export type FitoutWorkspaceData = {
  source: {
    sheetId: string;
    sheetUrl: string;
    syncedAt: string;
    status: "live" | "fallback";
    message: string;
  };
  miniRows: FitoutProjectRow[];
  megaRows: FitoutProjectRow[];
  annualRows: FitoutAnnualRow[];
  summary: {
    totalJobs: number;
    miniJobs: number;
    megaJobs: number;
    actualCapex: number;
    realizedRevenue: number;
    netOperatingProfit: number;
    profitMargin: number;
    averageRevenue: number;
  };
};

type CsvRow = Record<string, string>;
type FitoutDataSnapshot = Pick<FitoutWorkspaceData, "miniRows" | "megaRows" | "annualRows" | "summary">;

const DEFAULT_FITOUT_SHEET_ID = "1UdyLxEI-v07rzwpKanJAGuJlyPV8bC9BN9gxBxXnB1U";
const FITOUT_SHEET_TIMEOUT_MS = 15_000;

const miniAliases = ["RESTORATION", "restoration", "MINI FIT-OUT", "mini fit-out", "Mini Fit-Out"];
const megaAliases = ["FIT-OUT", "fit-out", "Fit-Out", "MEGA FIT-OUT", "mega fit-out", "Mega Fit-Out"];

let cachedLiveFitoutSnapshot: FitoutDataSnapshot | null = null;

export async function getFitoutWorkspaceData(options: { allowFallback?: boolean } = {}): Promise<FitoutWorkspaceData> {
  const allowFallback = options.allowFallback ?? true;
  const sheetId = process.env.GOOGLE_SHEET_ID_FITOUT_PROJECT || DEFAULT_FITOUT_SHEET_ID;
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;

  try {
    const [miniRows, megaRows] = await Promise.all([
      loadFirstAvailableFitoutSheet(sheetId, miniAliases, "Mini Fit-out"),
      loadFirstAvailableFitoutSheet(sheetId, megaAliases, "Mega Fit-out"),
    ]);

    const snapshot = buildFitoutSnapshot(miniRows, megaRows);
    cachedLiveFitoutSnapshot = snapshot;
    return {
      source: {
        sheetId,
        sheetUrl,
        syncedAt: new Date().toISOString(),
        status: "live",
        message: "Synced from public Google Sheet tabs: RESTORATION and FIT-OUT.",
      },
      ...snapshot,
    };
  } catch (error) {
    if (cachedLiveFitoutSnapshot && allowFallback) {
      return {
        source: {
          sheetId,
          sheetUrl,
          syncedAt: new Date().toISOString(),
          status: "fallback",
          message: `${formatError(error)} Showing last cached live Fit-out data.`,
        },
        ...cachedLiveFitoutSnapshot,
      };
    }

    if (!allowFallback) {
      return {
        source: {
          sheetId,
          sheetUrl,
          syncedAt: new Date().toISOString(),
          status: "fallback",
          message: `${formatError(error)} Live Fit-out data unavailable. No sample data is displayed.`,
        },
        ...buildFitoutSnapshot([], []),
      };
    }

    const miniRows = sampleMiniFitoutRows;
    const megaRows = sampleMegaFitoutRows;
    const snapshot = buildFitoutSnapshot(miniRows, megaRows);

    return {
      source: {
        sheetId,
        sheetUrl,
        syncedAt: new Date().toISOString(),
        status: "fallback",
        message: `${formatError(error)} Showing fallback Fit-out data.`,
      },
      ...snapshot,
    };
  }
}

async function loadFirstAvailableFitoutSheet(sheetId: string, aliases: string[], type: FitoutProjectRow["type"]) {
  let lastError: unknown = null;

  for (const sheetName of aliases) {
    try {
      const rows = await loadGoogleSheetCsvRows(sheetId, sheetName);
      const mapped = mapFitoutRows(rows, type);
      if (mapped.length) return mapped;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error(`No ${type} records found in Google Sheet.`);
}

async function loadGoogleSheetCsvRows(sheetId: string, sheetName: string): Promise<CsvRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetchWithTimeout(url, FITOUT_SHEET_TIMEOUT_MS);
  if (!response.ok) throw new Error(`Google Sheet sync failed for ${sheetName}: HTTP ${response.status}`);
  return parseCsv(await response.text());
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Google Sheet sync timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function buildFitoutSnapshot(miniRows: FitoutProjectRow[], megaRows: FitoutProjectRow[]): FitoutDataSnapshot {
  const annualRows = buildAnnualSummaryRows(miniRows, megaRows);
  return {
    miniRows,
    megaRows,
    annualRows,
    summary: summarizeFitoutRows([...miniRows, ...megaRows]),
  };
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unable to sync Google Sheet.";
}

function mapFitoutRows(rows: CsvRow[], type: FitoutProjectRow["type"]): FitoutProjectRow[] {
  if (!rows.length) return [];
  const first = rows[0];
  const map = {
    project: findColumn(first, ["project", "project name", "site", "warehouse project"]),
    block: findColumn(first, ["block", "building block", "zone block"]),
    unit: findColumn(first, ["unit", "unit no", "unit number", "warehouse unit"]),
    startDate: findColumn(first, ["start date", "start", "date start"]),
    finishDate: findColumn(first, ["finish date", "finish", "complete date", "completion date"]),
    actualCapex: findColumn(first, ["actual capex", "actual capital expenditure", "capex"]),
    realizedRevenue: findColumn(first, ["realized revenue", "revenue"]),
    netOperatingProfit: findColumn(first, ["net operating profit", "net profit", "profit"]),
  };

  return rows
    .map((row, index) => {
      const actualCapex = parseMoney(row[map.actualCapex]);
      const realizedRevenue = parseMoney(row[map.realizedRevenue]);
      const explicitProfit = clean(row[map.netOperatingProfit]);
      const netOperatingProfit = explicitProfit ? parseMoney(explicitProfit) : realizedRevenue - actualCapex;
      const unit = clean(row[map.unit]) || "-";

      return {
        id: `${type}-${index}-${unit}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        project: clean(row[map.project]) || "Unassigned",
        block: clean(row[map.block]) || deriveBlockFromUnit(unit),
        unit,
        startDate: normalizeDate(row[map.startDate]),
        finishDate: normalizeDate(row[map.finishDate]),
        actualCapex,
        realizedRevenue,
        netOperatingProfit,
        type,
      };
    })
    .filter((row) => row.project !== "Unassigned" || row.unit !== "-" || row.actualCapex || row.realizedRevenue);
}

function buildAnnualSummaryRows(miniRows: FitoutProjectRow[], megaRows: FitoutProjectRow[]): FitoutAnnualRow[] {
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    new Set([
      currentYear,
      ...miniRows.map((row) => yearOf(row.finishDate)).filter(Boolean),
      ...megaRows.map((row) => yearOf(row.finishDate)).filter(Boolean),
    ] as number[]),
  ).sort((a, b) => a - b);

  const displayYears = years.length >= 5
    ? years
    : Array.from(new Set([...years, ...Array.from({ length: 5 }, (_, index) => currentYear + index)])).sort((a, b) => a - b).slice(0, 5);

  return displayYears.map((year) => {
    const miniYearRows = miniRows.filter((row) => yearOf(row.finishDate) === year);
    const megaYearRows = megaRows.filter((row) => yearOf(row.finishDate) === year);
    const combinedRows = [...miniYearRows, ...megaYearRows];
    const miniActualCapex = sum(miniYearRows, "actualCapex");
    const megaActualCapex = sum(megaYearRows, "actualCapex");
    const miniRevenue = sum(miniYearRows, "realizedRevenue");
    const megaRevenue = sum(megaYearRows, "realizedRevenue");
    const miniProfit = sum(miniYearRows, "netOperatingProfit");
    const megaProfit = sum(megaYearRows, "netOperatingProfit");
    const realizedRevenue = miniRevenue + megaRevenue;
    const netOperatingProfit = miniProfit + megaProfit;

    return {
      year,
      totalJobs: combinedRows.length,
      miniJobs: miniYearRows.length,
      megaJobs: megaYearRows.length,
      actualCapex: miniActualCapex + megaActualCapex,
      realizedRevenue,
      netOperatingProfit,
      miniActualCapex,
      megaActualCapex,
      miniRevenue,
      megaRevenue,
      miniProfit,
      megaProfit,
      profitMargin: realizedRevenue ? netOperatingProfit / realizedRevenue : 0,
      averageRevenue: combinedRows.length ? realizedRevenue / combinedRows.length : 0,
    };
  });
}

function summarizeFitoutRows(rows: FitoutProjectRow[]) {
  const actualCapex = sum(rows, "actualCapex");
  const realizedRevenue = sum(rows, "realizedRevenue");
  const netOperatingProfit = sum(rows, "netOperatingProfit");
  return {
    totalJobs: rows.length,
    miniJobs: rows.filter((row) => row.type === "Mini Fit-out").length,
    megaJobs: rows.filter((row) => row.type === "Mega Fit-out").length,
    actualCapex,
    realizedRevenue,
    netOperatingProfit,
    profitMargin: realizedRevenue ? netOperatingProfit / realizedRevenue : 0,
    averageRevenue: rows.length ? realizedRevenue / rows.length : 0,
  };
}

function parseCsv(text: string): CsvRow[] {
  const matrix: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"" && quoted && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => clean(value))) matrix.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => clean(value))) matrix.push(row);
  if (!matrix.length) return [];

  const headers = matrix[0].map((header, index) => clean(header) || `Column ${index + 1}`);
  return matrix.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, clean(values[index])])));
}

function findColumn(row: CsvRow, aliases: string[]) {
  const keys = Object.keys(row);
  return keys.find((key) => aliases.includes(normalizeHeader(key)))
    || keys.find((key) => aliases.some((alias) => normalizeHeader(key).startsWith(`${alias} `)))
    || "";
}

function normalizeHeader(value: string) {
  return clean(value).toLowerCase().replace(/\s+/g, " ");
}

function clean(value: unknown) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function parseMoney(value: unknown) {
  if (typeof value === "number") return value;
  return Number(clean(value).replace(/[^0-9.-]/g, "")) || 0;
}

function normalizeDate(value: unknown) {
  const text = clean(value);
  if (!text) return "";
  const parsed = parseDate(text);
  return parsed ? parsed.toISOString().slice(0, 10) : text;
}

function parseDate(value: string) {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date;
  const match = value.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!match) return null;
  const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(match[2].toLowerCase());
  if (month < 0) return null;
  return new Date(Number(match[3]), month, Number(match[1]));
}

function yearOf(value: string) {
  const parsed = parseDate(value);
  return parsed?.getFullYear() || 0;
}

function deriveBlockFromUnit(value: string) {
  const text = clean(value);
  if (!text) return "-";
  const prefix = text.match(/^[A-Za-z0-9]+/);
  return prefix ? prefix[0].replace(/\d+$/, "") || prefix[0] : "-";
}

function sum(rows: FitoutProjectRow[], key: "actualCapex" | "realizedRevenue" | "netOperatingProfit") {
  return rows.reduce((total, row) => total + row[key], 0);
}

const sampleMiniFitoutRows: FitoutProjectRow[] = [
  ["F&WH CHODTHANAWAT 1", "A-01", "2026-01-05", "2026-01-25", 95000, 150000],
  ["F&WH CHODTHANAWAT 2", "B-02", "2026-02-01", "2026-02-18", 120000, 180000],
  ["F&WH CHODTHANAWAT 3", "C-01", "2026-03-02", "2026-03-22", 110000, 172000],
].map(([project, unit, startDate, finishDate, actualCapex, realizedRevenue], index) => ({
  id: `fallback-mini-${index}`,
  project: String(project),
  block: deriveBlockFromUnit(String(unit)),
  unit: String(unit),
  startDate: String(startDate),
  finishDate: String(finishDate),
  actualCapex: Number(actualCapex),
  realizedRevenue: Number(realizedRevenue),
  netOperatingProfit: Number(realizedRevenue) - Number(actualCapex),
  type: "Mini Fit-out",
}));

const sampleMegaFitoutRows: FitoutProjectRow[] = [
  ["F&WH CHODTHANAWAT 2", "F7-F8", "2026-01-26", "2026-03-22", 1550000, 2200000],
].map(([project, unit, startDate, finishDate, actualCapex, realizedRevenue], index) => ({
  id: `fallback-mega-${index}`,
  project: String(project),
  block: deriveBlockFromUnit(String(unit)),
  unit: String(unit),
  startDate: String(startDate),
  finishDate: String(finishDate),
  actualCapex: Number(actualCapex),
  realizedRevenue: Number(realizedRevenue),
  netOperatingProfit: Number(realizedRevenue) - Number(actualCapex),
  type: "Mega Fit-out",
}));
