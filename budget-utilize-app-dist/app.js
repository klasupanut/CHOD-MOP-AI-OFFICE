const SPREADSHEET_ID = "1NmVPZkEGxeUvIQYsuoyF7L9Xhjn03zH5RZvDf8UJ2Po";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
const SOURCE_MODIFIED = "2026-07-03T08:13:01.693Z";

const SHEETS = [
  { tab: "โชติ 1", gid: "1670988984", group: "location", mode: "project-long" },
  { tab: "โชติ 2", gid: "715191170", group: "location", mode: "project-long" },
  { tab: "โชติ 3", gid: "1288685133", group: "location", mode: "project-long" },
  { tab: "โชติ 5", gid: "1504272791", group: "location", mode: "project-long" },
  { tab: "โชติ บิส กม.8", gid: "1651929286", group: "location", mode: "project-long" },
  { tab: "โชติ บิส แจ้งวัฒนะ", gid: "21424830", group: "location", mode: "project-long" },
  { tab: "โชติ บิส สาย 4", gid: "603834483", group: "location", mode: "project-long" },
  { tab: "สรุปงานสากล", gid: "955484465", group: "support", mode: "support" },
  { tab: "งบประมาณคงเหลือ", gid: "1997687741", group: "budget", mode: "budget" },
  { tab: "สรุปงาน ฟิล์ม", gid: "449201554", group: "person", mode: "person" },
  { tab: "สรุปงาน กล้า", gid: "874584096", group: "person", mode: "person" },
  { tab: "สรุปงาน มอส", gid: "1089574858", group: "person", mode: "person" }
];

const state = {
  sheets: [],
  tasks: [],
  budgetRows: [],
  budgetDate: "",
  lastLoadedAt: null,
  writeConfig: {
    loaded: false,
    enabled: false,
    reason: "กำลังตรวจสอบ write mode"
  },
  writeBusy: false,
  selectedView: "overview",
  selectedPerspective: "location",
  selectedTaskId: null,
  actionQueuePage: 0,
  tablePage: 0,
  navSignature: "",
  actionQueueCount: 0,
  filters: {
    search: "",
    status: "all",
    owner: "all",
    personSheet: "all",
    code: "all",
    source: "all",
    stage: "all",
    issue: "all"
  },
  sort: "budget-desc"
};

const els = {
  nav: document.getElementById("sheetNav"),
  viewKicker: document.getElementById("viewKicker"),
  viewTitle: document.getElementById("viewTitle"),
  sourceStamp: document.getElementById("sourceStamp"),
  writeModeBadge: document.getElementById("writeModeBadge"),
  newProjectButton: document.getElementById("newProjectButton"),
  refreshButton: document.getElementById("refreshButton"),
  exportCsvButton: document.getElementById("exportCsvButton"),
  printPdfButton: document.getElementById("printPdfButton"),
  clearFiltersButton: document.getElementById("clearFiltersButton"),
  retryButton: document.getElementById("retryButton"),
  loadingPanel: document.getElementById("loadingPanel"),
  errorPanel: document.getElementById("errorPanel"),
  errorText: document.getElementById("errorText"),
  dashboard: document.getElementById("dashboard"),
  searchInput: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  ownerFilter: document.getElementById("ownerFilter"),
  personSheetLabel: document.getElementById("personSheetLabel"),
  personSheetFilter: document.getElementById("personSheetFilter"),
  codeFilter: document.getElementById("codeFilter"),
  activeFilterToolbar: document.getElementById("activeFilterToolbar"),
  activeFilters: document.getElementById("activeFilters"),
  sortControl: document.getElementById("sortControl"),
  kpiGrid: document.getElementById("kpiGrid"),
  analysisGrid: document.querySelector(".analysis-grid"),
  sheetBudgetChart: document.getElementById("sheetBudgetChart"),
  codeBudgetChart: document.getElementById("codeBudgetChart"),
  overviewAnalysis: document.getElementById("overviewAnalysis"),
  controlIntelligenceGrid: document.getElementById("controlIntelligenceGrid"),
  budgetStatePanel: document.getElementById("budgetStatePanel"),
  budgetStateGrid: document.getElementById("budgetStateGrid"),
  executiveSummaryPanel: document.getElementById("executiveSummaryPanel"),
  executiveSummaryList: document.getElementById("executiveSummaryList"),
  compareActionGrid: document.getElementById("compareActionGrid"),
  comparePanel: document.getElementById("comparePanel"),
  compareGrid: document.getElementById("compareGrid"),
  actionQueuePanel: document.getElementById("actionQueuePanel"),
  actionQueueList: document.getElementById("actionQueueList"),
  actionQueuePager: document.getElementById("actionQueuePager"),
  contentGrid: document.querySelector(".content-grid"),
  tablePanel: document.querySelector(".table-panel"),
  taskTable: document.getElementById("taskTable"),
  tableCount: document.getElementById("tableCount"),
  tablePager: document.getElementById("tablePager"),
  insightRail: document.querySelector(".insight-rail"),
  wideActionGrid: document.querySelector(".wide-action-grid"),
  selectedPanel: document.getElementById("selectedPanel"),
  budgetRemainingPanel: document.getElementById("budgetRemainingPanel"),
  remainingBudgetList: document.getElementById("remainingBudgetList"),
  attentionList: document.getElementById("attentionList"),
  dataQualityPanel: document.getElementById("dataQualityPanel"),
  budgetAlertPanel: document.getElementById("budgetAlertPanel"),
  budgetAlertList: document.getElementById("budgetAlertList"),
  dataQualityList: document.getElementById("dataQualityList"),
  printReport: document.getElementById("printReport"),
  budgetDate: document.getElementById("budgetDate"),
  sheetChartHint: document.getElementById("sheetChartHint"),
  writeToast: document.getElementById("writeToast"),
  projectModal: document.getElementById("projectModal"),
  newProjectForm: document.getElementById("newProjectForm"),
  newProjectSite: document.getElementById("newProjectSite"),
  newProjectStatus: document.getElementById("newProjectStatus"),
  newProjectStage: document.getElementById("newProjectStage"),
  newProjectOwner: document.getElementById("newProjectOwner"),
  newProjectHelper: document.getElementById("newProjectHelper"),
  submitProjectButton: document.getElementById("submitProjectButton"),
  closeProjectModalButton: document.getElementById("closeProjectModalButton"),
  cancelProjectButton: document.getElementById("cancelProjectButton"),
  budgetCodeSuggestions: document.getElementById("budgetCodeSuggestions")
};

const statusLabels = {
  done: "ดำเนินการแล้วเสร็จ",
  active: "กำลังดำเนินการ",
  stopped: "ไม่ดำเนินการ",
  blank: "ไม่ระบุ"
};

const progressStageOptions = [
  ["bid", "BID"],
  ["pr", "PR"],
  ["po", "PO"],
  ["con", "CON"]
];

const hiddenOwnerFilterOptions = new Set(["กล้า", "ฟิล์ม", "มอส"]);
const writeOwnerOptions = ["ฟิล์ม", "กล้า", "มอส"];
const ownerDisplayAliases = new Map([
  ["พีรดนย์ โสภณอริยวงศ์", "ฟิล์ม"],
  ["คุณพีรดนย์ โสภณอริยวงศ์", "ฟิล์ม"],
  ["ศุภณัฐ นิลคุปต์", "กล้า"],
  ["คุณศุภณัฐ นิลคุปต์", "กล้า"],
  ["ยุศกล บุญวิเศษ", "มอส"],
  ["คุณยุศกล บุญวิเศษ", "มอส"]
]);
const realizedBudgetCodeBuckets = ["ไม่ระบุ", "1C01", "1C02", "1B02"];
const warehouseBudgetSection = "\u0e04\u0e25\u0e31\u0e07\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32";
const chartPalette = {
  status: {
    done: { solid: "#16a34a", gradient: "linear-gradient(90deg, #34d399 0%, #22c55e 48%, #15803d 100%)" },
    active: { solid: "#f59e0b", gradient: "linear-gradient(90deg, #fde047 0%, #f59e0b 52%, #ea580c 100%)" },
    stopped: { solid: "#ef4444", gradient: "linear-gradient(90deg, #fb7185 0%, #ef4444 52%, #b91c1c 100%)" },
    blank: { solid: "#64748b", gradient: "linear-gradient(90deg, #94a3b8 0%, #64748b 52%, #334155 100%)" }
  },
  codeFallbacks: [
    { solid: "#06b6d4", gradient: "linear-gradient(90deg, #22d3ee 0%, #06b6d4 52%, #2563eb 100%)" },
    { solid: "#8b5cf6", gradient: "linear-gradient(90deg, #c084fc 0%, #8b5cf6 52%, #6d28d9 100%)" },
    { solid: "#f97316", gradient: "linear-gradient(90deg, #facc15 0%, #fb923c 48%, #f97316 100%)" },
    { solid: "#14b8a6", gradient: "linear-gradient(90deg, #5eead4 0%, #14b8a6 52%, #0f766e 100%)" },
    { solid: "#ec4899", gradient: "linear-gradient(90deg, #f9a8d4 0%, #ec4899 52%, #be185d 100%)" },
    { solid: "#6366f1", gradient: "linear-gradient(90deg, #a5b4fc 0%, #6366f1 52%, #4338ca 100%)" }
  ],
  site: [
    { solid: "#06b6d4", gradient: "linear-gradient(90deg, #67e8f9 0%, #06b6d4 48%, #2563eb 100%)" },
    { solid: "#8b5cf6", gradient: "linear-gradient(90deg, #ddd6fe 0%, #8b5cf6 50%, #6d28d9 100%)" },
    { solid: "#f97316", gradient: "linear-gradient(90deg, #fed7aa 0%, #fb923c 46%, #ea580c 100%)" },
    { solid: "#22c55e", gradient: "linear-gradient(90deg, #86efac 0%, #22c55e 50%, #15803d 100%)" },
    { solid: "#ec4899", gradient: "linear-gradient(90deg, #fbcfe8 0%, #ec4899 48%, #be185d 100%)" },
    { solid: "#0ea5e9", gradient: "linear-gradient(90deg, #bae6fd 0%, #0ea5e9 48%, #0369a1 100%)" },
    { solid: "#f43f5e", gradient: "linear-gradient(90deg, #fecdd3 0%, #f43f5e 50%, #be123c 100%)" }
  ],
  owner: {
    film: { solid: "#4f46e5", gradient: "linear-gradient(90deg, #a5b4fc 0%, #4f46e5 52%, #312e81 100%)" },
    kla: { solid: "#06b6d4", gradient: "linear-gradient(90deg, #67e8f9 0%, #06b6d4 52%, #0e7490 100%)" },
    mos: { solid: "#8b5cf6", gradient: "linear-gradient(90deg, #ddd6fe 0%, #8b5cf6 52%, #6d28d9 100%)" },
    fallback: { solid: "#10b981", gradient: "linear-gradient(90deg, #6ee7b7 0%, #10b981 52%, #047857 100%)" }
  },
  stage: [
    { solid: "#06b6d4", gradient: "linear-gradient(180deg, #67e8f9 0%, #06b6d4 52%, #0e7490 100%)" },
    { solid: "#4f46e5", gradient: "linear-gradient(180deg, #a5b4fc 0%, #4f46e5 52%, #3730a3 100%)" },
    { solid: "#f97316", gradient: "linear-gradient(180deg, #facc15 0%, #fb923c 48%, #ea580c 100%)" },
    { solid: "#8b5cf6", gradient: "linear-gradient(180deg, #ddd6fe 0%, #8b5cf6 52%, #6d28d9 100%)" }
  ],
  carryForward: { solid: "#16a34a", gradient: "linear-gradient(90deg, #bbf7d0 0%, #22c55e 46%, #166534 100%)" }
};
const carryForwardSiteColor = chartPalette.carryForward.gradient;
const actionQueuePageSize = 10;
const tablePageSize = 60;
const searchDebounceMs = 140;
let searchRenderTimer = null;
const budgetSiteOrder = [
  { label: "โชติธนวัฒน์ 1", aliases: ["โชติธนวัฒน์ 1", "โชติ 1"] },
  { label: "โชติธนวัฒน์ 2", aliases: ["โชติธนวัฒน์ 2", "โชติ 2"] },
  { label: "โชติธนวัฒน์ 3", aliases: ["โชติธนวัฒน์ 3", "โชติ 3"] },
  { label: "โชติธนวัฒน์ 5", aliases: ["โชติธนวัฒน์ 5", "โชติ 5"] },
  { label: "โชติบิส แจ้งฯ", aliases: ["โชติบิส แจ้งฯ", "โชติ บิส แจ้งวัฒนะ", "โชติบิส แจ้งวัฒนะ", "แจ้งวัฒนะ"] },
  { label: "โชติบิส กม.8", aliases: ["โชติบิส กม.8", "โชติ บิส กม.8", "โชติบิส กม8", "กม.8"] },
  { label: "โชติบิส สาย4", aliases: ["โชติบิส สาย4", "โชติ บิส สาย 4", "โชติบิส สาย 4", "สาย4"] }
];

const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 0
});

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadWriteConfig();
  loadData();
});

function bindEvents() {
  els.refreshButton.addEventListener("click", loadData);
  els.retryButton.addEventListener("click", loadData);
  els.exportCsvButton.addEventListener("click", exportCurrentCsv);
  els.printPdfButton.addEventListener("click", () => {
    renderPrintReport();
    window.print();
  });
  window.addEventListener("afterprint", () => {
    els.printReport.innerHTML = "";
  });
  els.clearFiltersButton.addEventListener("click", () => {
    resetFilters();
    render();
  });
  els.newProjectButton.addEventListener("click", openProjectModal);
  els.closeProjectModalButton.addEventListener("click", closeProjectModal);
  els.cancelProjectButton.addEventListener("click", closeProjectModal);
  els.projectModal.addEventListener("click", (event) => {
    if (event.target === els.projectModal) closeProjectModal();
  });
  els.newProjectForm.addEventListener("submit", submitNewProject);
  els.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    state.selectedTaskId = null;
    state.tablePage = 0;
    scheduleRender(searchDebounceMs);
  });
  els.statusFilter.addEventListener("change", (event) => {
    state.filters.status = event.target.value;
    state.selectedTaskId = null;
    state.tablePage = 0;
    render();
  });
  els.ownerFilter.addEventListener("change", (event) => {
    state.filters.owner = event.target.value;
    state.selectedTaskId = null;
    state.tablePage = 0;
    render();
  });
  els.personSheetFilter.addEventListener("change", (event) => {
    state.filters.personSheet = event.target.value;
    state.selectedTaskId = null;
    state.tablePage = 0;
    render();
  });
  els.codeFilter.addEventListener("change", (event) => {
    state.filters.code = event.target.value;
    state.selectedTaskId = null;
    state.tablePage = 0;
    render();
  });
  els.sortControl.addEventListener("change", (event) => {
    state.sort = event.target.value;
    state.tablePage = 0;
    render();
  });
  document.querySelectorAll("[data-perspective]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-perspective]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.selectedPerspective = button.dataset.perspective;
      state.selectedView = "overview";
      state.selectedTaskId = null;
      state.tablePage = 0;
      clearChartDrivenFilters();
      render();
    });
  });
}

function scheduleRender(delay = 0) {
  window.clearTimeout(searchRenderTimer);
  searchRenderTimer = window.setTimeout(render, delay);
}

async function loadData(options = {}) {
  const loadOptions = normalizeLoadOptions(options);
  if (loadOptions.selectedView) {
    state.selectedView = loadOptions.selectedView;
  }
  const preferredTaskId = Object.prototype.hasOwnProperty.call(loadOptions, "preferredTaskId")
    ? loadOptions.preferredTaskId
    : state.selectedTaskId;
  setLoading(true);
  try {
    const cacheKey = Date.now();
    const results = await Promise.all(
      SHEETS.map(async (sheet) => {
        const url = csvUrl(sheet.gid, cacheKey);
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`${sheet.tab}: HTTP ${response.status}`);
        }
        const text = await response.text();
        const rows = parseCsv(text);
        return buildSheetModel(sheet, rows);
      })
    );

    enrichPersonSummaryTasks(results);
    state.sheets = results;
    state.tasks = results.flatMap((sheet) => sheet.tasks);
    const budgetSheet = results.find((sheet) => sheet.group === "budget");
    state.budgetRows = budgetSheet?.budgetRows ?? [];
    state.budgetDate = budgetSheet?.budgetDate ?? "";
    state.lastLoadedAt = new Date();
    state.selectedTaskId = preferredTaskId && state.tasks.some((task) => task.id === preferredTaskId)
      ? preferredTaskId
      : state.tasks[0]?.id ?? null;
    state.tablePage = loadOptions.tablePage ?? 0;
    state.navSignature = "";
    state.actionQueueCount = buildActionQueue(
      state.tasks.filter((task) => task.sourceGroup === "location"),
      state.budgetRows
    ).length;

    setLoading(false);
    syncFilters();
    render();
  } catch (error) {
    showError(error);
  }
}

function normalizeLoadOptions(options) {
  if (!options || typeof options !== "object") return {};
  if (Object.prototype.hasOwnProperty.call(options, "preferredTaskId")) return options;
  return {};
}

function csvUrl(gid, cacheKey) {
  if (location.protocol === "http:" || location.protocol === "https:") {
    return `/api/sheet?gid=${encodeURIComponent(gid)}&cache=${cacheKey}`;
  }
  return `http://127.0.0.1:4177/api/sheet?gid=${encodeURIComponent(gid)}&cache=${cacheKey}`;
}

function apiUrl(path) {
  if (location.protocol === "http:" || location.protocol === "https:") {
    return path;
  }
  return `http://127.0.0.1:4177${path}`;
}

async function loadWriteConfig() {
  try {
    const response = await fetch(apiUrl("/api/write-config"), { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const config = await response.json();
    state.writeConfig = {
      loaded: true,
      enabled: Boolean(config.enabled),
      canDelete: Boolean(config.canDelete),
      reason: config.reason || "",
      deleteReason: config.deleteReason || config.reason || ""
    };
  } catch (error) {
    state.writeConfig = {
      loaded: true,
      enabled: false,
      reason: `Write API ใช้งานไม่ได้: ${error.message}`
    };
  }
  updateWriteModeUi();
  if (!els.dashboard.classList.contains("hidden")) {
    renderSelected(getFilteredTasks(getViewContext().tasks, getViewContext()));
  }
}

function updateWriteModeUi() {
  const { loaded, enabled, canDelete, reason, deleteReason } = state.writeConfig;
  els.writeModeBadge.textContent = !loaded ? "Write: checking" : enabled ? "Write: live" : canDelete ? "Delete: live" : "Write: locked";
  els.writeModeBadge.classList.toggle("enabled", Boolean(enabled));
  els.writeModeBadge.classList.toggle("disabled", loaded && !enabled && !canDelete);
  els.writeModeBadge.classList.toggle("pending", !loaded);
  els.writeModeBadge.title = enabled ? (reason || "") : (deleteReason || reason || "");
  els.submitProjectButton.disabled = !enabled || state.writeBusy;
  els.newProjectHelper.textContent = enabled
    ? "เพิ่มเป็นแถวใหม่ท้ายชีทของ site ที่เลือกเท่านั้น ไม่แทรกหรือแก้ template เดิม"
    : reason || "ยังไม่ได้เปิด write mode";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows.map((items) => items.map((item) => item.trim()));
}

function buildSheetModel(config, rows) {
  const mainTitle = firstText(rows[0]) || config.tab;
  if (config.mode === "budget") {
    return {
      ...config,
      mainTitle,
      tasks: [],
      budgetRows: parseBudgetRows(rows),
      budgetDate: findBudgetDate(rows)
    };
  }

  const ownerName = config.mode === "person" ? normalizeOwnerDisplayName(firstText(rows[1])) : "";
  const tasks = parseWorkRows(config, rows, mainTitle, ownerName);
  const total = tasks.reduce((sum, task) => sum + task.budget, 0);

  return {
    ...config,
    mainTitle,
    ownerName,
    tasks,
    total
  };
}

function parseWorkRows(config, rows, mainTitle, ownerName) {
  const headerRow = rows.findIndex((row) => row[0]?.includes("ลำดับ") && row[1]?.includes("รายการ"));
  const startIndex = headerRow >= 0 ? headerRow + 2 : 0;
  const tasks = [];
  let currentSection = extractSectionFromTitle(mainTitle);

  rows.slice(startIndex).forEach((row, offset) => {
    const index = clean(row[0]);
    const item = clean(row[1]);
    if (!item || item.includes("รวมจำนวนเงิน")) return;

    const siteTitle = siteTitleFromSummaryRow(index, item);
    if (siteTitle) {
      currentSection = siteTitle;
      return;
    }

    const status = clean(row[6]);
    const budgetIndex = config.mode === "support" ? 7 : 8;
    const budget = toNumber(row[budgetIndex]);
    const hasProgress = [2, 3, 4, 5].some((col) => row[col] !== undefined && clean(row[col]) !== "");
    const hasWorkData = status || budget > 0 || hasProgress;

    if (!hasWorkData && isSectionRow(index, item)) {
      currentSection = item;
      return;
    }

    if (!hasWorkData && /กำลังกรอกข้อมูล/.test(item)) return;

    const extras = readExtras(config, row);
    const normalizedStatus = normalizeStatus(status);
    const progress = readProgress(row, normalizedStatus);
    const sheetRowNumber = startIndex + offset + 1;
    const id = `${config.gid}-${startIndex + offset}-${index || tasks.length + 1}`;

    tasks.push({
      id,
      gid: config.gid,
      rowNumber: sheetRowNumber,
      index,
      item,
      status: status || statusLabels[normalizedStatus],
      statusKey: normalizedStatus,
      contractor: clean(row[7]),
      budget,
      budgetCode: extras.budgetCode,
      poNumber: extras.poNumber,
      plan: extras.plan,
      owner: normalizeOwnerDisplayName(extras.owner || ownerName),
      note: extras.note,
      issue: extras.issue,
      progress,
      averageProgress: averageProgress(progress, normalizedStatus),
      sourceTab: config.tab,
      sourceTitle: mainTitle,
      sourceGroup: config.group,
      sourceMode: config.mode,
      section: currentSection || extractSectionFromTitle(mainTitle)
    });
  });

  return tasks.filter((task) => task.item);
}

function enrichPersonSummaryTasks(sheets) {
  const locationTasks = sheets.filter((sheet) => sheet.group === "location").flatMap((sheet) => sheet.tasks);
  const sourceMap = new Map();
  const sourceRowMap = new Map();
  const duplicateKeys = new Set();

  locationTasks.forEach((task) => {
    sourceRowMap.set(`${task.gid}:${task.rowNumber}`, task);
    const key = personSummarySourceKey(task.owner, budgetSiteLabelFromTask(task), task.item);
    if (!key) return;
    if (sourceMap.has(key)) {
      duplicateKeys.add(key);
      return;
    }
    sourceMap.set(key, task);
  });

  sheets
    .filter((sheet) => sheet.group === "person")
    .forEach((sheet) => {
      const owner = sheet.ownerName || personLabelFromTab(sheet.tab);
      sheet.tasks.forEach((task) => {
        const metadata = personSummarySourceMetadata(task);
        const sourceByRow = metadata ? sourceRowMap.get(`${metadata.gid}:${metadata.rowNumber}`) : null;
        if (sourceByRow && normalizeTaskMatchText(sourceByRow.item) === normalizeTaskMatchText(task.item)) {
          hydratePersonSummaryTask(task, sourceByRow);
          return;
        }

        // A previously deleted physical row can leave old Source row metadata
        // behind. Fall back to the unique owner/site/item match instead of
        // enabling a delete against the wrong Google Sheet row.
        const key = personSummarySourceKey(owner || task.owner, budgetSiteLabelFromTask(task), task.item);
        if (!key || duplicateKeys.has(key)) return;
        const source = sourceMap.get(key);
        if (!source) return;
        hydratePersonSummaryTask(task, source);
      });
    });
}

function hydratePersonSummaryTask(task, source) {
  task.writeSource = {
    id: source.id,
    gid: source.gid,
    rowNumber: source.rowNumber,
    item: source.item,
    sourceTab: source.sourceTab,
    sourceGroup: source.sourceGroup
  };
  task.status = source.status;
  task.statusKey = source.statusKey;
  task.contractor = source.contractor;
  task.budget = source.budget;
  task.budgetCode = source.budgetCode;
  task.poNumber = source.poNumber;
  task.plan = source.plan;
  task.owner = source.owner || task.owner;
  task.note = source.note;
  task.issue = source.issue;
  task.progress = { ...source.progress };
  task.averageProgress = source.averageProgress;
}

function hasPersonSummarySyncMetadata(task) {
  return /(^|\s)(site|source sheet|source gid|source row)\s*:/i.test(clean(task.note));
}

function personSummarySourceMetadata(task) {
  if (!task || !hasPersonSummarySyncMetadata(task)) return null;
  const note = clean(task.note);
  const gid = note.match(/(?:^|\|)\s*source gid\s*:\s*(\d+)/i)?.[1] || "";
  const rowNumber = Number(note.match(/(?:^|\|)\s*source row\s*:\s*(\d+)/i)?.[1] || 0);
  if (!gid || !Number.isInteger(rowNumber) || rowNumber < 4) return null;
  return { gid, rowNumber };
}

function budgetDeleteTarget(task) {
  if (!task) return null;
  if (task.sourceGroup === "location") return task;
  const source = task.writeSource;
  if (!source || source.sourceGroup !== "location") return null;
  if (!source.gid || !source.rowNumber || !source.id) return null;
  return source;
}

function orphanSummaryDeleteTarget(task) {
  if (!task || task.sourceGroup !== "person" || task.writeSource) return null;
  const source = personSummarySourceMetadata(task);
  if (!source) return null;
  return {
    summaryGid: task.gid,
    summaryRowNumber: task.rowNumber,
    expectedItem: task.item,
    sourceGid: source.gid,
    sourceRowNumber: source.rowNumber
  };
}

function personSummarySourceKey(owner, site, item) {
  const ownerKey = normalizeOwnerDisplayName(owner);
  const siteKey = budgetSiteLabelFromValue(site);
  const itemKey = normalizeTaskMatchText(item);
  return ownerKey && siteKey && itemKey ? `${ownerKey}::${siteKey}::${itemKey}` : "";
}

function normalizeTaskMatchText(value) {
  return clean(value)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()"'\u201c\u201d.,\-_/]/g, "");
}

function readExtras(config, row) {
  const result = {
    budgetCode: "",
    poNumber: "",
    plan: "",
    owner: "",
    note: "",
    issue: ""
  };

  if (config.mode === "project-long") {
    result.budgetCode = clean(row[9]);
    result.plan = clean(row[10]);
    result.owner = clean(row[11]);
    result.note = clean(row[12]);
    result.poNumber = clean(row[13]);
    return result;
  }

  if (config.mode === "support") {
    result.note = clean(row[8]);
    return result;
  }

  const structured = parseStructuredNote(row[9]);
  if (structured.budgetCode) result.budgetCode = structured.budgetCode;
  if (structured.poNumber) result.poNumber = structured.poNumber;
  if (structured.owner) result.owner = structured.owner;
  if (structured.issue) result.issue = structured.issue;
  if (structured.note) result.note = structured.note;

  const candidates = [structured.consumed ? "" : row[9], row[10], row[11], row[12]].map(clean).filter(Boolean);
  candidates.forEach((value) => {
    if (isBudgetCode(value) && !result.budgetCode) {
      result.budgetCode = value;
    } else if (isMonth(value) && !result.plan) {
      result.plan = value;
    } else if (isLikelyOwner(value) && !result.owner && config.mode !== "person") {
      result.owner = value;
    } else {
      result.note = [result.note, value].filter(Boolean).join(" | ");
    }
  });
  return result;
}

function parseBudgetRows(rows) {
  const categoryRow = rows[2] || [];
  const categories = [2, 3, 4, 5].map((index) => ({
    index,
    label: clean(categoryRow[index]).replace(/\n/g, " "),
    code: extractCode(clean(categoryRow[index]))
  }));

  const result = [];
  let section = "";

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

    const total = values.reduce((sum, value) => sum + value, 0);
    result.push({
      id: `${index}-${unit}`,
      index,
      section,
      unit,
      total,
      categories: categories.map((category, i) => ({
        label: category.label,
        code: category.code,
        value: values[i]
      }))
    });
  });

  return result.filter(isWarehouseBudgetRow);
}

function isWarehouseBudgetRow(row) {
  return [row?.section, row?.unit].some((value) => clean(value).includes(warehouseBudgetSection));
}

function findBudgetDate(rows) {
  const row = rows[1] || [];
  return row.find((cell) => clean(cell).includes("ข้อมูลวันที่")) || "";
}

function parseStructuredNote(value) {
  const text = clean(value);
  const result = {
    budgetCode: "",
    poNumber: "",
    owner: "",
    note: "",
    issue: "",
    consumed: false
  };
  if (!text) return result;

  const parts = text
    .replace(/^\[BU\]\s*/i, "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  const noteParts = [];

  parts.forEach((part) => {
    const match = part.match(/^([^:=]+)\s*[:=]\s*(.+)$/);
    if (!match) {
      noteParts.push(part);
      return;
    }
    const key = match[1].trim().toLowerCase();
    const val = match[2].trim();
    if (/^(owner|ผู้รับผิดชอบ)$/.test(key)) {
      result.owner = val;
      result.consumed = true;
    } else if (/^(code|budget code|รหัสงบ|รหัสงบประมาณ)$/.test(key)) {
      result.budgetCode = val;
      result.consumed = true;
    } else if (/^(po|po number|po no|po no\.)$/.test(key)) {
      result.poNumber = val;
      result.consumed = true;
    } else if (/^(issue|ประเด็น)$/.test(key)) {
      result.issue = val;
      result.consumed = true;
    } else if (/^(note|หมายเหตุ)$/.test(key)) {
      noteParts.push(val);
      result.consumed = true;
    } else {
      noteParts.push(part);
    }
  });

  result.note = noteParts.join(" | ");
  return result;
}

function syncFilters() {
  fillSelect(els.statusFilter, [
    ["all", "ทั้งหมด"],
    ["active", statusLabels.active],
    ["done", statusLabels.done],
    ["stopped", statusLabels.stopped],
    ["blank", statusLabels.blank]
  ]);

  const owners = unique(
    state.tasks
      .filter((task) => task.sourceGroup !== "person")
      .map((task) => task.owner)
      .filter(Boolean)
  )
    .filter((owner) => !hiddenOwnerFilterOptions.has(owner))
    .sort((a, b) => a.localeCompare(b, "th"));
  fillSelect(els.ownerFilter, [["all", "ทั้งหมด"], ...owners.map((owner) => [owner, owner])]);

  const personOptions = state.sheets
    .filter((sheet) => sheet.group === "person")
    .map((sheet) => [sheet.tab, personLabelFromTab(sheet.tab)]);
  if (!personOptions.some(([value]) => value === state.filters.personSheet)) {
    state.filters.personSheet = "all";
  }
  fillSelect(els.personSheetFilter, [["all", "ทั้งหมด"], ...personOptions]);

  const codes = unique(state.tasks.map((task) => task.budgetCode || "ไม่ระบุ")).sort((a, b) => a.localeCompare(b, "th"));
  fillSelect(els.codeFilter, [["all", "ทั้งหมด"], ...codes.map((code) => [code, code])]);
  fillSelect(
    els.newProjectSite,
    state.sheets
      .filter((sheet) => sheet.group === "location")
      .map((sheet) => [sheet.gid, sheet.mainTitle || sheet.tab])
  );
  fillSelect(els.newProjectStatus, statusWriteOptions());
  fillSelect(els.newProjectStage, stageWriteOptions("Stage เริ่มต้น"));
  fillSelect(els.newProjectOwner, ownerWriteOptions());
  fillDatalist(els.budgetCodeSuggestions, codes.filter((code) => code !== "ไม่ระบุ"));
}

function fillSelect(select, options) {
  const current = select.value;
  select.innerHTML = options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("");
  if (options.some(([value]) => value === current)) {
    select.value = current;
  }
}

function fillDatalist(datalist, options) {
  datalist.innerHTML = options.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
}

function statusWriteOptions() {
  return [
    ["active", statusLabels.active],
    ["done", statusLabels.done],
    ["stopped", statusLabels.stopped],
    ["blank", statusLabels.blank]
  ];
}

function stageWriteOptions(firstLabel = "ไม่เปลี่ยน Stage") {
  return [
    ["", firstLabel],
    ["bid", "Bid"],
    ["pr", "PR"],
    ["po", "PO"],
    ["con", "Con"],
    ["complete", "Complete"]
  ];
}

function ownerWriteOptions() {
  return [["", "เลือก owner"], ...writeOwnerOptions.map((owner) => [owner, owner])];
}

function renderProgressCheckboxes(task, disabled = "") {
  return progressStageOptions
    .map(([key, label]) => {
      const checked = isProgressComplete(task.progress?.[key]) ? "checked" : "";
      return `
        <label class="stage-checkbox">
          <input type="checkbox" name="progress_${escapeHtml(key)}" value="1" ${checked} ${disabled} />
          <span class="stage-toggle-label stage-toggle-${escapeHtml(key)}">${escapeHtml(label)}</span>
        </label>
      `;
    })
    .join("");
}

function isProgressComplete(value) {
  return Number(value) >= 1;
}

function getProgressUpdateFromForm(form) {
  return Object.fromEntries(
    progressStageOptions.map(([key]) => [key, Boolean(form.querySelector(`[name="progress_${key}"]`)?.checked)])
  );
}

function stageKeyFromProgress(progress) {
  if (progress?.con) return "con";
  if (progress?.po) return "po";
  if (progress?.pr) return "pr";
  if (progress?.bid) return "bid";
  return "";
}

function renderFilterMode(context) {
  const isPersonSummary = context.viewType === "personSummary";
  els.ownerFilter.closest("label").classList.toggle("hidden", isPersonSummary);
  els.personSheetLabel.classList.toggle("hidden", !isPersonSummary);
}

function syncFilterControls() {
  if (els.searchInput.value !== state.filters.search) {
    els.searchInput.value = state.filters.search;
  }
  if (els.statusFilter.value !== state.filters.status) {
    els.statusFilter.value = state.filters.status;
  }
  if (els.ownerFilter.value !== state.filters.owner) {
    els.ownerFilter.value = state.filters.owner;
  }
  if (els.personSheetFilter.value !== state.filters.personSheet) {
    els.personSheetFilter.value = state.filters.personSheet;
  }
  if (els.codeFilter.value !== state.filters.code) {
    els.codeFilter.value = state.filters.code;
  }
}

function renderActiveFilters(context) {
  const entries = getActiveFilterEntries(context);
  els.activeFilterToolbar.classList.toggle("hidden", !entries.length);
  els.clearFiltersButton.disabled = !entries.length;

  if (!entries.length) {
    els.activeFilters.innerHTML = "";
    return;
  }

  els.activeFilters.innerHTML = `
    <span class="filter-summary">${entries.length} ตัวกรอง</span>
    ${entries
      .map(
        (entry) => `
          <button class="filter-chip" type="button" data-clear-filter="${escapeHtml(entry.key)}">
            <span>${escapeHtml(entry.label)}</span>
            <strong>${escapeHtml(entry.value)}</strong>
            <i>×</i>
          </button>
        `
      )
      .join("")}
  `;

  els.activeFilters.querySelectorAll("[data-clear-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      clearFilter(button.dataset.clearFilter);
      render();
    });
  });
}

function getActiveFilterEntries(context) {
  const entries = [];
  if (state.filters.search) entries.push({ key: "search", label: "ค้นหา", value: state.filters.search });
  if (state.filters.status !== "all") entries.push({ key: "status", label: "สถานะ", value: statusLabels[state.filters.status] || state.filters.status });
  if (context?.viewType !== "personSummary" && state.filters.owner !== "all") {
    entries.push({ key: "owner", label: "ผู้รับผิดชอบ", value: state.filters.owner });
  }
  if (context?.viewType === "personSummary" && state.filters.personSheet !== "all") {
    entries.push({ key: "personSheet", label: "สรุปงานรายคน", value: personLabelFromTab(state.filters.personSheet) });
  }
  if (state.filters.code !== "all") entries.push({ key: "code", label: "รหัสงบ", value: state.filters.code });
  if (state.filters.source !== "all") entries.push({ key: "source", label: "ชีท/หัวข้อ", value: state.filters.source });
  if (state.filters.stage !== "all") entries.push({ key: "stage", label: "ขั้นตอน", value: stageLabel(state.filters.stage) });
  if (state.filters.issue !== "all") entries.push({ key: "issue", label: "ตรวจข้อมูล", value: issueLabel(state.filters.issue) });
  return entries;
}

function clearFilter(key) {
  if (key in state.filters) {
    state.filters[key] = "all";
  }
  if (key === "search") {
    state.filters.search = "";
  }
  state.selectedTaskId = null;
  state.tablePage = 0;
}

function resetFilters() {
  state.filters.search = "";
  state.filters.status = "all";
  state.filters.owner = "all";
  state.filters.personSheet = "all";
  clearChartDrivenFilters();
  state.selectedTaskId = null;
  state.tablePage = 0;
}

function clearChartDrivenFilters() {
  state.filters.code = "all";
  state.filters.source = "all";
  state.filters.stage = "all";
  state.filters.issue = "all";
}

function applyChartFilter(key, value) {
  if (!(key in state.filters)) return;
  state.filters[key] = value || "all";
  if (key === "source") {
    state.filters.issue = "all";
  }
  if (key === "issue") {
    state.filters.stage = "all";
  }
  state.selectedTaskId = null;
  state.tablePage = 0;
  render();
}

function render() {
  const context = getViewContext();
  renderFilterMode(context);
  const rows = getFilteredTasks(context.tasks, context);
  const budgetRows = getBudgetRowsForContext(context);
  const isBudgetMenu = context.viewType === "budget";
  const isActionCenter = context.viewType === "actionCenter";
  const isOverview = context.viewType === "overview";
  const showsCharts = !isOverview && !isActionCenter;
  const showsTable = !isActionCenter;
  const showsSelected = !isActionCenter;
  const showsBudgetRemaining = !isOverview && !isActionCenter;

  els.dashboard.classList.toggle("overview-mode", isOverview);
  els.dashboard.classList.toggle("budget-mode", isBudgetMenu);
  els.dashboard.classList.toggle("action-center-mode", isActionCenter);
  syncViewPanels(context);
  clearInactivePanels(context);
  syncFilterControls();
  renderNav();
  renderHeader(context, rows);
  renderActiveFilters(context);

  if (isBudgetMenu) {
    renderKpis(rows, context, budgetRows);
  }
  if (isOverview) {
    renderOverviewAnalysis(rows, context, budgetRows);
    renderCompare(rows, context);
  }
  if (isActionCenter) {
    renderExecutiveSummary(rows, context, budgetRows);
    renderActionQueue(rows, context, budgetRows);
    renderBudgetAlerts(rows, context, budgetRows);
    renderDataQuality(rows, context);
    renderAttention(rows);
  }
  if (showsCharts) {
    renderCharts(rows, context, budgetRows);
  }
  if (showsTable) {
    renderTable(rows);
  }
  if (showsSelected) {
    renderSelected(rows);
  }
  if (showsBudgetRemaining) {
    renderBudgetRemaining(budgetRows, context);
  }
}

function clearInactivePanels(context) {
  const isBudgetMenu = context.viewType === "budget";
  const isActionCenter = context.viewType === "actionCenter";
  const isOverview = context.viewType === "overview";
  const showsCharts = !isOverview && !isActionCenter;
  const showsTable = !isActionCenter;
  const showsBudgetRemaining = !isOverview && !isActionCenter;

  if (!isBudgetMenu) els.kpiGrid.innerHTML = "";
  if (!isOverview) {
    els.overviewAnalysis.innerHTML = "";
    els.compareGrid.innerHTML = "";
  }
  if (!isActionCenter) {
    els.executiveSummaryList.innerHTML = "";
    els.actionQueueList.innerHTML = "";
    els.actionQueuePager.innerHTML = "";
    els.budgetAlertList.innerHTML = "";
    els.dataQualityList.innerHTML = "";
    els.attentionList.innerHTML = "";
  }
  if (!showsCharts) {
    els.sheetBudgetChart.innerHTML = "";
    els.codeBudgetChart.innerHTML = "";
  }
  if (!showsTable) {
    els.taskTable.innerHTML = "";
    els.tableCount.textContent = "0 รายการ";
    els.tablePager.innerHTML = "";
    els.selectedPanel.innerHTML = "";
  }
  if (!showsBudgetRemaining) {
    els.remainingBudgetList.innerHTML = "";
  }
  els.budgetStateGrid.innerHTML = "";
}

function syncViewPanels(context) {
  const isBudgetMenu = context.viewType === "budget";
  const isActionCenter = context.viewType === "actionCenter";
  const isOverview = context.viewType === "overview";

  els.kpiGrid.classList.toggle("hidden", !isBudgetMenu);
  els.controlIntelligenceGrid.classList.toggle("hidden", !isActionCenter);
  els.budgetStatePanel.classList.add("hidden");
  els.executiveSummaryPanel.classList.toggle("hidden", !isActionCenter);
  els.compareActionGrid.classList.toggle("hidden", !isActionCenter);
  els.comparePanel.classList.toggle("hidden", !isOverview);
  els.actionQueuePanel.classList.toggle("hidden", !isActionCenter);
  els.budgetAlertPanel.classList.toggle("hidden", !isActionCenter);
  els.analysisGrid.classList.toggle("hidden", isOverview || isActionCenter);
  els.tablePanel.classList.toggle("hidden", isActionCenter);
  els.selectedPanel.classList.toggle("hidden", isActionCenter);
  els.budgetRemainingPanel.classList.toggle("hidden", isOverview || isActionCenter);
  els.wideActionGrid.classList.toggle("hidden", !isActionCenter);
  els.dataQualityPanel.classList.toggle("hidden", !isActionCenter);
  els.controlIntelligenceGrid.classList.toggle("single-panel", isActionCenter);
  els.compareActionGrid.classList.toggle("single-panel", isActionCenter);
}

function getViewContext() {
  if (state.selectedView === "budget") {
    return {
      title: "งบประมาณคงเหลือ",
      kicker: "Budget remaining",
      tasks: state.tasks.filter((task) => task.sourceGroup === "location"),
      sheet: state.sheets.find((sheet) => sheet.group === "budget"),
      viewType: "budget",
      budgetScope: "all"
    };
  }

  if (state.selectedView === "person-summary") {
    return {
      title: "สรุปงานรายคน",
      kicker: "เลือกผู้รับผิดชอบจาก dropdown",
      tasks: state.tasks.filter((task) => task.sourceGroup === "person"),
      viewType: "personSummary",
      budgetScope: "tasks"
    };
  }

  if (state.selectedView === "action-center") {
    return {
      title: "Alert / Action Queue",
      kicker: "สรุปผู้บริหารและรายการที่ต้องไล่ต่อ",
      tasks: state.tasks.filter((task) => task.sourceGroup === "location"),
      viewType: "actionCenter",
      budgetScope: "all"
    };
  }

  if (state.selectedView === "overview") {
    const group = state.selectedPerspective;
    const groupTitles = {
      location: "ภาพรวมตามสถานที่",
      person: "ภาพรวมตามผู้รับผิดชอบ",
      support: "ภาพรวม SKW"
    };
    return {
      title: "Data Analyze",
      kicker: groupTitles[group],
      tasks: state.tasks.filter((task) => task.sourceGroup === group),
      viewType: "overview",
      budgetScope: "tasks"
    };
  }

  const sheet = state.sheets.find((item) => item.gid === state.selectedView);
  return {
    title: sheet?.mainTitle || "Budget Utilize",
    kicker: sheet?.tab || "Sheet",
    tasks: sheet?.tasks || [],
    sheet,
    viewType: "sheet",
    budgetScope: sheet?.group === "budget" ? "all" : "tasks"
  };
}

function getBudgetRowsForContext(context) {
  if (!state.budgetRows.length || context.budgetScope === "all") {
    return state.budgetRows;
  }

  const units = getBudgetUnitsFromTasks(context.tasks);
  if (!units.size) return state.budgetRows;

  const rows = state.budgetRows.filter((row) => units.has(normalizeBudgetUnit(row.unit)));
  return rows.length ? rows : state.budgetRows;
}

function budgetRowAmount(row) {
  if (state.filters.code === "all") return row.total;
  return row.categories
    .filter((category) => category.code === state.filters.code || category.label.includes(state.filters.code))
    .reduce((total, category) => total + category.value, 0);
}

function sumBudgetRows(rows) {
  return rows.reduce((total, row) => total + budgetRowAmount(row), 0);
}

function budgetSourceDetail(context) {
  const codeText = state.filters.code === "all" ? "ทุกหมวดรหัสงบ" : `เฉพาะรหัส ${state.filters.code}`;
  const scopeText = context.budgetScope === "all" ? "รวมทั้งชีทงบประมาณคงเหลือ" : "เฉพาะหน่วยงานที่ match กับมุมมองนี้";
  return `${scopeText} | ${codeText}`;
}

function getBudgetUnitsFromTasks(tasks) {
  const units = new Set();
  tasks.forEach((task) => {
    [task.sourceTab, task.section, task.sourceTitle].forEach((value) => {
      const unit = normalizeBudgetUnit(value);
      if (unit) units.add(unit);
    });
  });
  return units;
}

function normalizeBudgetUnit(value) {
  return clean(value)
    .replace(/สรุปงานปรับปรุง-พัฒนา/g, "")
    .replace(/สรุปงานปรับปรุง/g, "")
    .replace(/สรุปงานปี 2569/g, "")
    .replace(/โชติธนวัฒน์/g, "โชติ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactBudgetText(value) {
  return clean(value)
    .replace(/[ฯ.]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function budgetSiteLabelFromValue(value) {
  const compactValue = compactBudgetText(value);
  const normalizedValue = compactBudgetText(normalizeBudgetUnit(value));
  if (!compactValue && !normalizedValue) return "";

  const site = budgetSiteOrder.find((item) =>
    item.aliases.some((alias) => {
      const compactAlias = compactBudgetText(alias);
      const normalizedAlias = compactBudgetText(normalizeBudgetUnit(alias));
      return (
        (compactAlias && compactValue.includes(compactAlias)) ||
        (compactAlias && normalizedValue.includes(compactAlias)) ||
        (normalizedAlias && compactValue.includes(normalizedAlias)) ||
        (normalizedAlias && normalizedValue.includes(normalizedAlias))
      );
    })
  );
  return site?.label || "";
}

function budgetSiteLabelFromTask(task) {
  return [task.sourceTitle, task.sourceTab, task.section].map(budgetSiteLabelFromValue).find(Boolean) || "";
}

function budgetSiteLabelFromBudgetRow(row) {
  return [row.unit, row.section, row.id].map(budgetSiteLabelFromValue).find(Boolean) || "";
}

function taskMatchesSource(task, source) {
  const requestedSite = budgetSiteLabelFromValue(source);
  if (requestedSite) return budgetSiteLabelFromTask(task) === requestedSite;

  const normalizedSource = normalizeBudgetUnit(source);
  return [task.sourceTitle, task.sourceTab, task.section].some((value) => {
    return clean(value) === source || normalizeBudgetUnit(value) === normalizedSource;
  });
}

function taskMatchesStage(task, stage) {
  const value = task.progress?.[stage];
  if (value === null || value === undefined) return task.statusKey !== "done";
  return value < 1;
}

function isWatchableTask(task) {
  return task.statusKey !== "done" && task.statusKey !== "stopped";
}

function taskMatchesIssue(task, issue, tasks = state.tasks) {
  const missingCode = !task.budgetCode || task.budgetCode === "ไม่ระบุ";
  const missingOwner = !task.owner && task.sourceGroup !== "support";
  const missingStatus = task.statusKey === "blank";
  const activeNoBudget = isWatchableTask(task) && task.budget <= 0;
  const stoppedWithBudget = task.statusKey === "stopped" && task.budget > 0;
  const highActiveBudget = isWatchableTask(task) && task.budget >= highBudgetThreshold(tasks);

  if (issue === "missing-code") return task.budget > 0 && missingCode;
  if (issue === "missing-owner") return missingOwner;
  if (issue === "missing-status") return missingStatus;
  if (issue === "active-no-budget") return activeNoBudget;
  if (issue === "stopped-with-budget") return stoppedWithBudget;
  if (issue === "high-active-budget") return highActiveBudget;
  return true;
}

function getFilteredTasks(tasks, context) {
  const query = state.filters.search;
  const tokens = query.split(/\s+/).filter(Boolean);
  const filtered = tasks.filter((task) => {
    const haystack = [
      task.item,
      task.sourceTitle,
      task.sourceTab,
      task.section,
      task.contractor,
      task.status,
      task.budgetCode,
      task.poNumber,
      task.plan,
      task.owner,
      task.note
    ]
      .join(" ")
      .toLowerCase();

    if (tokens.length && !tokens.every((token) => haystack.includes(token))) return false;
    if (context?.viewType === "personSummary" && state.filters.personSheet !== "all" && task.sourceTab !== state.filters.personSheet) {
      return false;
    }
    if (state.filters.source !== "all" && !taskMatchesSource(task, state.filters.source)) return false;
    if (state.filters.stage !== "all" && !taskMatchesStage(task, state.filters.stage)) return false;
    if (state.filters.issue !== "all" && !taskMatchesIssue(task, state.filters.issue, tasks)) return false;
    if (state.filters.status !== "all" && task.statusKey !== state.filters.status) return false;
    if (context?.viewType !== "personSummary" && state.filters.owner !== "all" && (task.owner || "") !== state.filters.owner) return false;
    if (state.filters.code !== "all" && (task.budgetCode || "ไม่ระบุ") !== state.filters.code) return false;
    return true;
  });

  return sortTasks(filtered);
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (state.sort === "progress-asc") return a.averageProgress - b.averageProgress || b.budget - a.budget;
    if (state.sort === "title-asc") return a.item.localeCompare(b.item, "th");
    return b.budget - a.budget;
  });
}

function renderNav() {
  const groups = [
    {
      title: "ภาพรวม",
      items: [
        { id: "overview", label: "Data Analyze", count: countByPerspective(state.selectedPerspective) },
        { id: "budget", label: "งบประมาณคงเหลือ", count: state.budgetRows.length }
      ]
    },
    {
      title: "สถานที่",
      items: state.sheets
        .filter((sheet) => sheet.group === "location")
        .map((sheet) => ({ id: sheet.gid, label: sheet.mainTitle, count: sheet.tasks.length }))
    },
    {
      title: "ผู้รับผิดชอบ",
      items: [{ id: "person-summary", label: "สรุปงานรายคน", count: countByPerspective("person") }]
    },
    {
      title: "SKW",
      items: state.sheets
        .filter((sheet) => sheet.group === "support")
        .map((sheet) => ({ id: sheet.gid, label: sheet.mainTitle, count: sheet.tasks.length }))
    },
    {
      title: "Action Center",
      items: [
        {
          id: "action-center",
          label: "Alert / Action Queue",
          count: state.actionQueueCount
        }
      ]
    }
  ];
  const signature = JSON.stringify({
    view: state.selectedView,
    perspective: state.selectedPerspective,
    counts: groups.map((group) => group.items.map((item) => `${item.id}:${item.count}`).join(",")).join("|")
  });
  if (signature === state.navSignature) return;
  state.navSignature = signature;

  els.nav.innerHTML = groups
    .map(
      (group) => `
        <div class="nav-group">
          <div class="nav-group-title">${escapeHtml(group.title)}</div>
          ${group.items
            .map(
              (item) => `
                <button class="nav-button ${state.selectedView === item.id ? "active" : ""}" type="button" data-view="${escapeHtml(item.id)}">
                  <span>${escapeHtml(item.label)}</span>
                  <span class="count-badge">${numberFormatter.format(item.count)}</span>
                </button>
              `
            )
            .join("")}
        </div>
      `
    )
    .join("");

  els.nav.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedView = button.dataset.view;
      if (state.selectedView !== "overview") {
        state.selectedTaskId = null;
      }
      state.tablePage = 0;
      clearChartDrivenFilters();
      render();
    });
  });
}

function countByPerspective(group) {
  return state.tasks.filter((task) => task.sourceGroup === group).length;
}

function renderHeader(context, rows) {
  els.viewKicker.textContent = context.kicker;
  els.viewTitle.textContent = context.title;
  const fetched = state.lastLoadedAt
    ? state.lastLoadedAt.toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short"
      })
    : "-";
  const modified = new Date(SOURCE_MODIFIED).toLocaleDateString("th-TH", { dateStyle: "medium" });
  els.sourceStamp.textContent = `${rows.length} รายการ | อัปเดตไฟล์ ${modified} | โหลด ${fetched}`;
  els.sheetChartHint.textContent =
    context.viewType === "overview"
      ? "เทียบงบและงานค้างตาม main title ของแต่ละชีท"
      : context.viewType === "personSummary"
        ? "เลือกผู้รับผิดชอบจาก dropdown เพื่อแยกสรุปงานรายคน"
      : context.sheet?.mainTitle
        ? `อ้างอิงจาก ${context.sheet.mainTitle}`
        : "อ้างอิงจาก main title ของแต่ละชีท";
}

function renderKpis(tasks, context, budgetRows) {
  if (context.viewType !== "budget") {
    els.kpiGrid.innerHTML = "";
    return;
  }

  const realizedTasks = getRealizedBudgetTasks(tasks);
  const realizedBudget = sum(realizedTasks, "budget");
  const remainingBudget = sumBudgetRows(budgetRows);
  const overallBudget = realizedBudget + remainingBudget;
  const done = tasks.filter((task) => task.statusKey === "done");
  const watchItems = tasks.filter((task) => isWatchableTask(task) && task.budget > 0);
  const cards = [
    ["งบประมาณรวม (คลังสินค้า)", formatMoney(overallBudget), `${formatMoney(realizedBudget)} ใช้จริง + ${formatMoney(remainingBudget)} คงเหลือคลังสินค้า`],
    ["งบประมาณที่ใช้จริง", formatMoney(realizedBudget), `${numberFormatter.format(realizedTasks.length)} รายการ ไม่รวมไม่ดำเนินการ`],
    ["งบประมาณคงเหลือ", formatMoney(remainingBudget), `${numberFormatter.format(budgetRows.length)} รายการจากชีทคลังสินค้า`],
    ["อัตราการแล้วเสร็จ", formatPercent(ratio(done.length, tasks.length)), `${numberFormatter.format(done.length)} จาก ${numberFormatter.format(tasks.length)} รายการ`],
    ["งานที่จ้องจับตา", numberFormatter.format(watchItems.length), formatMoney(sum(watchItems, "budget"))]
  ];

  els.kpiGrid.innerHTML = cards
    .map(
      ([label, value, detail]) => `
        <article class="kpi-card analysis-kpi">
          <div class="kpi-label">${escapeHtml(label)}</div>
          <div class="kpi-value">${escapeHtml(value)}</div>
          <div class="kpi-detail">${escapeHtml(detail)}</div>
        </article>
      `
    )
    .join("");
}

function renderOverviewAnalysis(tasks, context, budgetRows) {
  const isOverview = context.viewType === "overview";
  els.overviewAnalysis.classList.toggle("hidden", !isOverview);
  if (!isOverview) {
    els.overviewAnalysis.innerHTML = "";
    return;
  }

  const realizedTasks = getRealizedBudgetTasks(tasks);
  const realizedBudget = sum(realizedTasks, "budget");
  const remainingBudget = sumBudgetRows(budgetRows);
  const totalBudget = realizedBudget + remainingBudget;
  const done = tasks.filter((task) => task.statusKey === "done");
  const active = tasks.filter((task) => task.statusKey === "active");
  const stopped = tasks.filter((task) => task.statusKey === "stopped");
  const blank = tasks.filter((task) => task.statusKey === "blank");
  const stoppedBudget = sum(stopped, "budget");
  const averageProgress = tasks.length ? tasks.reduce((total, task) => total + task.averageProgress, 0) / tasks.length : 0;
  const averageProgressPercent = Math.round(averageProgress * 100);
  const activeBudget = sum(active, "budget");
  const statusRows = [
    { key: "done", label: statusLabels.done, rows: done },
    { key: "active", label: statusLabels.active, rows: active },
    { key: "stopped", label: statusLabels.stopped, rows: stopped },
    { key: "blank", label: statusLabels.blank, rows: blank }
  ];
  const statusDonutStyle = buildStatusDonutStyle(statusRows);
  const maxStatusBudget = Math.max(...statusRows.map((item) => sum(item.rows, "budget")), 1);
  const pipelineRows = [
    { key: "bid", label: "Bid" },
    { key: "pr", label: "PR" },
    { key: "po", label: "PO" },
    { key: "con", label: "Con" }
  ].map((stage) => ({ ...stage, value: averageProgressStage(tasks, stage.key) }));
  const codeRows = (state.filters.code === "all"
    ? buildRealizedCodeRows(realizedTasks)
    : groupSum(realizedTasks, (task) => normalizedTaskBudgetCode(task))).slice(0, 5);
  const maxCodeBudget = Math.max(...codeRows.map((item) => item.value), 1);
  const sourceRows = groupTaskSummary(tasks, (task) => task.sourceTitle || task.sourceTab).slice(0, 6);
  const realizedSourceRows = groupSum(realizedTasks, (task) => task.sourceTitle || task.sourceTab).slice(0, 8);
  const maxRealizedSourceBudget = Math.max(...realizedSourceRows.map((item) => item.value), 1);
  const totalStatusBudget = Math.max(statusRows.reduce((total, item) => total + sum(item.rows, "budget"), 0), 1);
  const watchRows = tasks
    .filter(isWatchableTask)
    .sort((a, b) => b.budget - a.budget || a.averageProgress - b.averageProgress)
    .slice(0, 5);
  const topSource = sourceRows[0];
  const topCode = codeRows[0];

  els.overviewAnalysis.innerHTML = `
    <article class="analysis-hero">
      <div class="analysis-hero-copy">
        <p class="page-kicker">${escapeHtml(context.kicker)}</p>
        <h3>Data Analysis Overview</h3>
        <p class="analysis-hero-note">อ่านภาพรวมงาน งบประมาณ และสัญญาณเสี่ยงจากข้อมูล Google Sheet แบบ read-only</p>
      </div>

      <div class="analysis-hero-metrics">
        <div class="glass-metric accent-teal">
          <span>งบประมาณรวม</span>
          <strong>${formatMoney(totalBudget)}</strong>
          <em>${formatMoney(realizedBudget)} ใช้จริง + ${formatMoney(remainingBudget)} คงเหลือ</em>
        </div>
        <div class="glass-metric accent-blue">
          <span>งบประมาณใช้จริง</span>
          <strong>${formatMoney(realizedBudget)}</strong>
          <em>${numberFormatter.format(realizedTasks.length)} รายการ ไม่รวมไม่ดำเนินการ</em>
        </div>
        <div class="glass-metric accent-amber">
          <span>งบที่อยู่ระหว่างดำเนินการ</span>
          <strong>${formatMoney(activeBudget)}</strong>
          <em>${numberFormatter.format(active.length)} รายการกำลังดำเนินการ</em>
        </div>
      </div>

      <div class="analysis-score">
        <div class="score-ring" style="--score:${averageProgressPercent}">
          <strong>${averageProgressPercent}%</strong>
          <span>AVG</span>
        </div>
        <small>Avg progress จาก Bid / PR / PO / Con</small>
      </div>

      <div class="analysis-hero-insights">
        <div>
          <span>Top code</span>
          <strong>${escapeHtml(topCode?.name || "-")}</strong>
          <em>${formatCompactMoney(topCode?.value || 0)}</em>
        </div>
        <div>
          <span>Top sheet</span>
          <strong title="${escapeHtml(topSource?.name || "-")}">${escapeHtml(topSource?.name || "-")}</strong>
          <em>${formatCompactMoney(topSource?.budget || 0)}</em>
        </div>
        <div>
          <span>Watchlist</span>
          <strong>${numberFormatter.format(watchRows.length)}</strong>
          <em>${formatCompactMoney(sum(watchRows, "budget"))}</em>
        </div>
      </div>
    </article>

    <section class="analysis-chart-grid">
      <article class="panel analysis-chart-card">
        <div class="panel-heading">
          <div>
            <h3>Status share</h3>
            <p>สัดส่วนจำนวนงานตามสถานะ</p>
          </div>
        </div>
        <div class="donut-layout">
          <div class="donut-chart" style="${statusDonutStyle}">
            <span>${numberFormatter.format(tasks.length)}</span>
            <small>รายการ</small>
          </div>
          <div class="chart-legend">
            ${statusRows
              .map(
                (item) => `
                  <button class="legend-filter" type="button" style="--bar-color:${statusColor(item.key)}" data-chart-filter="status" data-chart-value="${escapeHtml(item.key)}">
                    <i style="background:${statusColor(item.key)}"></i>
                    <span>${escapeHtml(item.label)}</span>
                    <strong>${formatPercent(ratio(item.rows.length, tasks.length))}</strong>
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
      </article>

      <article class="panel analysis-chart-card">
        <div class="panel-heading">
          <div>
            <h3>Progress pipeline</h3>
            <p>ค่าเฉลี่ยแต่ละขั้น Bid / PR / PO / Con</p>
          </div>
        </div>
        <div class="pipeline-chart">
          ${pipelineRows
            .map(
              (stage, index) => `
                <button class="pipeline-row" type="button" style="--bar-color:${stageColor(stage.key, index)}" data-chart-filter="stage" data-chart-value="${escapeHtml(stage.key)}">
                  <span>${escapeHtml(stage.label)}</span>
                  <div class="pipeline-track"><i style="height:${Math.max(4, stage.value * 100)}%; background:${stageGradient(stage.key, index)}"></i></div>
                  <strong>${formatPercent(stage.value)}</strong>
                </button>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="panel analysis-chart-card">
        <div class="panel-heading">
          <div>
            <h3>Budget code chart</h3>
            <p>งบรวมสูงสุดตามรหัสงบ</p>
          </div>
        </div>
        <div class="code-chart">
          ${codeRows
            .map((item, index) => {
              const width = Math.max(3, ratio(item.value, maxCodeBudget) * 100);
              const solid = chartCodeColor(item.name, index);
              const gradient = codeGradient(item.name, index);
              return `
                <button class="code-chart-row" type="button" style="--bar-color:${solid}" data-chart-filter="code" data-chart-value="${escapeHtml(item.name)}">
                  <strong>${escapeHtml(item.name)}</strong>
                  <div class="code-chart-track"><span style="--bar-color:${solid}; width:${width}%; background:${gradient}"></span></div>
                  <em>${formatMoney(item.value)}</em>
                </button>
              `;
            })
            .join("") || `<div class="muted">ไม่มีข้อมูลงบตามรหัส</div>`}
        </div>
      </article>
    </section>

    <article class="panel analysis-card">
      <div class="panel-heading">
        <div>
          <h3>Status mix</h3>
          <p>จำนวนงานและงบตามสถานะ</p>
        </div>
      </div>
      <div class="analysis-list status-mix-chart">
        <div class="status-budget-summary">
          <div>
            <span>งบประมาณที่ใช้จริง</span>
            <em>หลังหักไม่ดำเนินการ ${numberFormatter.format(stopped.length)} รายการ (${formatMoney(stoppedBudget)})</em>
          </div>
          <strong>${formatMoney(realizedBudget)}</strong>
        </div>
        ${statusRows
          .map((item) => {
            const budget = sum(item.rows, "budget");
            const width = Math.max(3, ratio(budget, maxStatusBudget) * 100);
            const countPct = ratio(item.rows.length, tasks.length);
            const budgetPct = ratio(budget, totalStatusBudget);
            const solid = statusColor(item.key);
            const gradient = statusGradient(item.key);
            return `
              <button class="status-mix-row status-${item.key}" type="button" style="--bar-color:${solid}" data-chart-filter="status" data-chart-value="${escapeHtml(item.key)}">
                <div class="status-mix-head">
                  <div>
                    <strong>${escapeHtml(item.label)}</strong>
                    <span>${numberFormatter.format(item.rows.length)} รายการ | ${formatPercent(countPct)}</span>
                  </div>
                  <em>${formatMoney(budget)}</em>
                </div>
                <div class="status-mix-track">
                  <span class="status-mix-fill" style="--bar-color:${solid}; width:${width}%; background:${gradient}"></span>
                </div>
                <div class="status-mix-meta">
                  <small>จำนวน ${formatPercent(countPct)}</small>
                  <small>งบ ${formatPercent(budgetPct)}</small>
                </div>
              </button>
            `;
          })
          .join("")}
      </div>
    </article>

    <article class="panel analysis-card">
      <div class="panel-heading">
        <div>
          <h3>Budget matrix</h3>
          <p>รวมงบประมาณที่ใช้จริงตามหัวข้อชีท</p>
        </div>
      </div>
      <div class="sheet-matrix budget-matrix-list">
        ${realizedSourceRows
          .map((item, index) => {
            const width = Math.max(3, ratio(item.value, maxRealizedSourceBudget) * 100);
            const solid = sourceColor(item.name, index);
            const gradient = sourceGradient(item.name, index);
            return `
              <button class="bar-row budget-matrix-row" type="button" style="--bar-color:${solid}" data-chart-filter="source" data-chart-value="${escapeHtml(item.name)}">
                <div class="bar-row-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
                <div class="bar-track"><div class="bar-fill" style="--bar-color:${solid}; width:${width}%; background:${gradient}"></div></div>
                <div class="bar-value">${formatMoney(item.value)}</div>
              </button>
            `;
          })
          .join("") || `<div class="muted">ไม่มีข้อมูลตามตัวกรอง</div>`}
      </div>
    </article>

    <article class="panel analysis-card analysis-watch">
      <div class="panel-heading">
        <div>
          <h3>High budget watch</h3>
          <p>งานงบสูงที่ยังไม่จบ</p>
        </div>
      </div>
      <div class="watch-list">
        ${watchRows
          .map(
            (task) => `
              <button class="watch-item" type="button" data-overview-task-id="${escapeHtml(task.id)}">
                <span title="${escapeHtml(task.item)}">${escapeHtml(task.item)}</span>
                <strong>${formatCompactMoney(task.budget)}</strong>
                <em>${escapeHtml(task.sourceTab)} | ${formatPercent(task.averageProgress)}</em>
              </button>
            `
          )
          .join("") || `<div class="muted">ไม่มีรายการที่ต้องจับตา</div>`}
      </div>
    </article>
  `;

  els.overviewAnalysis.querySelectorAll("[data-overview-task-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTaskId = button.dataset.overviewTaskId;
      render();
    });
  });
  bindChartFilterButtons(els.overviewAnalysis);
}

function renderBudgetStates(tasks, context, budgetRows) {
  if (context.viewType !== "budget" || els.budgetStatePanel.classList.contains("hidden")) {
    els.budgetStateGrid.innerHTML = "";
    return;
  }

  const committedRows = tasks.filter((task) => task.budget > 0);
  const missingCodeRows = committedRows.filter((task) => taskMatchesIssue(task, "missing-code", tasks));
  const activeNoBudgetRows = tasks.filter((task) => taskMatchesIssue(task, "active-no-budget", tasks));
  const committedBudget = sum(committedRows, "budget");
  const missingCodeBudget = sum(missingCodeRows, "budget");
  const remainingBudget = sumBudgetRows(budgetRows);
  const base = Math.max(committedBudget + remainingBudget, committedBudget, remainingBudget, missingCodeBudget, 1);

  const cards = [
    {
      label: "งบผูกพัน",
      value: formatMoney(committedBudget),
      detail: `${numberFormatter.format(committedRows.length)} รายการที่มีงบในรายการงาน`,
      tone: "teal",
      pct: ratio(committedBudget, base)
    },
    {
      label: "งบเหลือ",
      value: formatMoney(remainingBudget),
      detail: budgetSourceDetail(context),
      tone: "blue",
      pct: ratio(remainingBudget, base)
    },
    {
      label: "งบยังไม่ระบุ code",
      value: formatMoney(missingCodeBudget),
      detail: `${numberFormatter.format(missingCodeRows.length)} รายการมีงบแต่ไม่มีรหัส`,
      tone: "amber",
      pct: ratio(missingCodeBudget, base),
      filter: "issue",
      filterValue: "missing-code"
    },
    {
      label: "งานยังไม่ระบุงบ",
      value: `${numberFormatter.format(activeNoBudgetRows.length)} รายการ`,
      detail: "ยังไม่จบ แต่งบในรายการเป็น 0",
      tone: "red",
      pct: ratio(activeNoBudgetRows.length, Math.max(tasks.length, 1)),
      filter: "issue",
      filterValue: "active-no-budget"
    }
  ];

  els.budgetStateGrid.innerHTML = cards
    .map((card) => {
      const filterAttrs = card.filter
        ? `data-chart-filter="${escapeHtml(card.filter)}" data-chart-value="${escapeHtml(card.filterValue)}"`
        : "disabled";
      return `
        <button class="budget-state-card tone-${escapeHtml(card.tone)}" type="button" ${filterAttrs}>
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(card.value)}</strong>
          <em>${escapeHtml(card.detail)}</em>
          <i style="width:${Math.max(3, Math.round(card.pct * 100))}%"></i>
        </button>
      `;
    })
    .join("");
  bindChartFilterButtons(els.budgetStateGrid);
}

function renderExecutiveSummary(tasks, context, budgetRows) {
  const riskTasks = getRiskTasks(tasks);
  const missingCodeRows = tasks.filter((task) => taskMatchesIssue(task, "missing-code", tasks));
  const ownerBacklog = groupTaskSummary(tasks, (task) => task.owner || "ไม่ระบุ")
    .sort((a, b) => b.activeCount - a.activeCount || b.budget - a.budget)[0];
  const watchTask = [...riskTasks].sort((a, b) => b.budget - a.budget || a.averageProgress - b.averageProgress)[0];
  const lowRemaining = getLowRemainingRows(budgetRows, 1)[0];
  const summaryItems = [
    {
      label: "งานที่ควรตามก่อน",
      value: watchTask?.item || "-",
      detail: watchTask ? `${watchTask.sourceTab} | ${formatMoney(watchTask.budget)}` : "ยังไม่พบงานเสี่ยงเด่น",
      tone: "amber",
      taskId: watchTask?.id
    },
    {
      label: "งบเหลือ site ต่ำ",
      value: lowRemaining?.unit || "-",
      detail: lowRemaining ? formatMoney(budgetRowAmount(lowRemaining)) : "ไม่พบงบเหลือที่มากกว่า 0",
      tone: "blue",
      filter: lowRemaining ? "source" : "",
      filterValue: lowRemaining?.unit || ""
    },
    {
      label: "งบไม่มี code",
      value: `${numberFormatter.format(missingCodeRows.length)} รายการ`,
      detail: formatMoney(sum(missingCodeRows, "budget")),
      tone: "red",
      filter: "issue",
      filterValue: "missing-code"
    },
    {
      label: "Owner งานค้างสูงสุด",
      value: ownerBacklog?.name || "-",
      detail: ownerBacklog ? `${numberFormatter.format(ownerBacklog.activeCount)} งานค้าง | ${formatMoney(ownerBacklog.budget)}` : "ไม่มีข้อมูล owner",
      tone: "teal",
      filter: ownerBacklog?.name && ownerBacklog.name !== "ไม่ระบุ" ? "owner" : "issue",
      filterValue: ownerBacklog?.name && ownerBacklog.name !== "ไม่ระบุ" ? ownerBacklog.name : "missing-owner"
    }
  ];

  els.executiveSummaryList.innerHTML = summaryItems
    .map((item) => {
      const attrs = item.taskId
        ? `data-summary-task-id="${escapeHtml(item.taskId)}"`
        : item.filter
          ? `data-chart-filter="${escapeHtml(item.filter)}" data-chart-value="${escapeHtml(item.filterValue)}"`
          : "disabled";
      return `
        <button class="executive-summary-item tone-${escapeHtml(item.tone)}" type="button" ${attrs}>
          <span>${escapeHtml(item.label)}</span>
          <strong title="${escapeHtml(item.value)}">${escapeHtml(item.value)}</strong>
          <em>${escapeHtml(item.detail)}</em>
        </button>
      `;
    })
    .join("");

  els.executiveSummaryList.querySelectorAll("[data-summary-task-id]").forEach((button) => {
    button.addEventListener("click", () => {
      focusTaskInSourceView(button.dataset.summaryTaskId);
    });
  });
  bindChartFilterButtons(els.executiveSummaryList);
}

function renderCompare(tasks) {
  const siteRows = groupCompareSummary(tasks, (task) => task.sourceTitle || task.sourceTab);
  const ownerRows = groupCompareSummary(tasks, (task) => task.owner || "ไม่ระบุ");
  const noCodeRows = [...siteRows].filter((row) => row.noCodeCount).sort((a, b) => b.noCodeBudget - a.noCodeBudget || b.noCodeCount - a.noCodeCount);
  const topSites = [...siteRows].sort((a, b) => b.budget - a.budget || b.activeCount - a.activeCount).slice(0, 5);
  const topOwners = [...ownerRows].sort((a, b) => b.activeCount - a.activeCount || b.budget - a.budget).slice(0, 5);

  els.compareGrid.innerHTML = `
    ${renderCompareColumn("Site ใช้งบสูงสุด", topSites, "budget", "source")}
    ${renderCompareColumn("Owner งานค้างสูงสุด", topOwners, "activeCount", "owner")}
    ${renderCompareColumn("งบไม่มี code กระจุกที่ไหน", noCodeRows.slice(0, 5), "noCodeBudget", "source")}
  `;
  bindChartFilterButtons(els.compareGrid);
}

function renderCompareColumn(title, rows, metric, filterKey) {
  return `
    <div class="compare-column">
      <h4>${escapeHtml(title)}</h4>
      ${
        rows.length
          ? rows
              .map((row) => {
                const value = metric === "activeCount" ? `${numberFormatter.format(row.activeCount)} งาน` : formatCompactMoney(row[metric] || 0);
                const filter =
                  filterKey === "owner" && row.name === "ไม่ระบุ"
                    ? `data-chart-filter="issue" data-chart-value="missing-owner"`
                    : `data-chart-filter="${escapeHtml(filterKey)}" data-chart-value="${escapeHtml(row.name)}"`;
                return `
                  <button class="compare-row" type="button" ${filter}>
                    <div>
                      <strong title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</strong>
                      <span>${numberFormatter.format(row.count)} งาน | ${numberFormatter.format(row.activeCount)} ค้าง</span>
                    </div>
                    <em>${escapeHtml(value)}</em>
                    <small>ไม่มี code ${numberFormatter.format(row.noCodeCount)} งาน / ${formatCompactMoney(row.noCodeBudget)}</small>
                  </button>
                `;
              })
              .join("")
          : `<div class="muted">ไม่มีข้อมูลในมุมมองนี้</div>`
      }
    </div>
  `;
}

function renderActionQueue(tasks, context, budgetRows) {
  const actions = buildActionQueue(tasks, budgetRows);
  if (!actions.length) {
    els.actionQueueList.innerHTML = `<div class="muted">ยังไม่มี action ด่วนในมุมมองนี้</div>`;
    els.actionQueuePager.innerHTML = "";
    return;
  }

  const pageCount = Math.ceil(actions.length / actionQueuePageSize);
  state.actionQueuePage = Math.min(Math.max(state.actionQueuePage, 0), pageCount - 1);
  const start = state.actionQueuePage * actionQueuePageSize;
  const pageActions = actions.slice(start, start + actionQueuePageSize);

  els.actionQueueList.innerHTML = pageActions
    .map((action) => {
      const attrs = action.task
        ? `data-action-task-id="${escapeHtml(action.task.id)}"`
        : `data-chart-filter="${escapeHtml(action.filter)}" data-chart-value="${escapeHtml(action.filterValue)}"`;
      return `
        <button class="action-queue-item priority-${escapeHtml(action.priority.toLowerCase())}" type="button" ${attrs}>
          <span class="queue-priority">${escapeHtml(action.priority)}</span>
          <div>
            <strong>${escapeHtml(action.title)}</strong>
            <p title="${escapeHtml(action.subject)}">${escapeHtml(action.subject)}</p>
            <em>${escapeHtml(action.detail)}</em>
          </div>
        </button>
      `;
    })
    .join("");

  renderActionQueuePager(actions.length, state.actionQueuePage, pageCount);

  els.actionQueueList.querySelectorAll("[data-action-task-id]").forEach((button) => {
    button.addEventListener("click", () => {
      focusTaskInSourceView(button.dataset.actionTaskId);
    });
  });
  bindChartFilterButtons(els.actionQueueList);
}

function renderActionQueuePager(total, currentPage, pageCount) {
  if (pageCount <= 1) {
    els.actionQueuePager.innerHTML = `<span>${numberFormatter.format(total)} รายการ</span>`;
    return;
  }

  const buttons = Array.from({ length: pageCount }, (_, index) => {
    const start = index * actionQueuePageSize + 1;
    const end = Math.min((index + 1) * actionQueuePageSize, total);
    return `
      <button class="${index === currentPage ? "active" : ""}" type="button" data-action-queue-page="${index}">
        ${numberFormatter.format(start)}-${numberFormatter.format(end)}
      </button>
    `;
  }).join("");

  els.actionQueuePager.innerHTML = `
    <span>${numberFormatter.format(total)} รายการ</span>
    <div class="queue-page-ranges">${buttons}</div>
  `;

  els.actionQueuePager.querySelectorAll("[data-action-queue-page]").forEach((button) => {
    button.addEventListener("click", () => {
      state.actionQueuePage = Number(button.dataset.actionQueuePage);
      render();
    });
  });
}

function buildActionQueue(tasks) {
  const priorityOrder = { P1: 1, P2: 2, P3: 3 };
  return tasks
    .map((task) => {
      const gaps = getTaskDataGaps(task, tasks);
      if (!gaps.length) return null;
      const priority = gaps.reduce((best, gap) => (priorityOrder[gap.priority] < priorityOrder[best] ? gap.priority : best), "P3");
      return {
        priority,
        title: gaps.length > 1 ? "เติมข้อมูลให้ครบ" : gaps[0].action,
        subject: task.item,
        detail: `${task.sourceTab} | ${formatMoney(task.budget)} | ขาด: ${gaps.map((gap) => gap.label).join(", ")}`,
        task,
        gapCount: gaps.length
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        priorityOrder[a.priority] - priorityOrder[b.priority] ||
        b.gapCount - a.gapCount ||
        (b.task?.budget || 0) - (a.task?.budget || 0) ||
        a.subject.localeCompare(b.subject, "th")
    );
}

function getTaskDataGaps(task, tasks = state.tasks) {
  const gaps = [];
  if (taskMatchesIssue(task, "missing-code", tasks)) {
    gaps.push({ priority: "P1", action: "ใส่รหัสงบ", label: issueLabel("missing-code") });
  }
  if (taskMatchesIssue(task, "active-no-budget", tasks)) {
    gaps.push({ priority: "P1", action: "ใส่งบประมาณ", label: issueLabel("active-no-budget") });
  }
  if (taskMatchesIssue(task, "missing-owner", tasks)) {
    gaps.push({ priority: "P2", action: "ใส่ owner", label: issueLabel("missing-owner") });
  }
  if (taskMatchesIssue(task, "missing-status", tasks)) {
    gaps.push({ priority: "P2", action: "ใส่สถานะ", label: issueLabel("missing-status") });
  }
  if (taskMatchesIssue(task, "stopped-with-budget", tasks)) {
    gaps.push({ priority: "P2", action: "ตรวจงบงานหยุด", label: issueLabel("stopped-with-budget") });
  }
  if (taskHasMissingStage(task)) {
    gaps.push({ priority: "P3", action: "ใส่ stage", label: "ไม่มี stage" });
  }
  return gaps;
}

function taskHasMissingStage(task) {
  if (!isWatchableTask(task)) return false;
  const values = Object.values(task.progress || {});
  return values.length > 0 && values.every((value) => value === null || value === undefined);
}

function focusTaskInSourceView(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  state.selectedView = task.gid;
  state.selectedTaskId = task.id;
  state.filters.search = "";
  state.filters.status = "all";
  state.filters.owner = "all";
  state.filters.personSheet = "all";
  state.tablePage = 0;
  clearChartDrivenFilters();
  render();
  requestAnimationFrame(() => {
    const row = [...els.taskTable.querySelectorAll("[data-task-id]")].find((item) => item.dataset.taskId === task.id);
    row?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

function renderSelectedDrilldown(tasks) {
  const selected = tasks.find((task) => task.id === state.selectedTaskId) || tasks[0] || state.tasks[0];
  if (!selected) {
    els.selectedPanel.innerHTML = `<h3>รายละเอียด project</h3><p class="muted">ไม่มีรายการ</p>`;
    return;
  }
  state.selectedTaskId = selected.id;

  const issues = getTaskIssues(selected, tasks);
  const timelineRows = getTaskTimeline(selected);
  const currentStage = getCurrentStageLabel(selected);

  els.selectedPanel.innerHTML = `
    <div class="project-drilldown-head">
      <p class="page-kicker">${escapeHtml(selected.sourceTitle)}</p>
      <h3 class="selected-title">${escapeHtml(selected.item)}</h3>
      <div class="selected-status-row">
        ${statusPill(selected)}
        <span>${escapeHtml(currentStage)}</span>
      </div>
    </div>

    <div class="detail-grid">
      <div class="detail-item"><span>งบประมาณ</span><strong>${formatMoney(selected.budget)}</strong></div>
      <div class="detail-item"><span>ความคืบหน้า</span><strong>${formatPercent(selected.averageProgress)}</strong></div>
      <div class="detail-item"><span>Owner</span><strong>${escapeHtml(selected.owner || "-")}</strong></div>
      <div class="detail-item"><span>Contractor</span><strong>${escapeHtml(selected.contractor || "-")}</strong></div>
      <div class="detail-item"><span>Budget code</span><strong>${escapeHtml(selected.budgetCode || "ไม่ระบุ")}</strong></div>
      <div class="detail-item"><span>PO Number</span><strong>${escapeHtml(selected.poNumber || "-")}</strong></div>
      <div class="detail-item"><span>Plan</span><strong>${escapeHtml(selected.plan || "-")}</strong></div>
    </div>

    <div class="project-drilldown-block">
      <span class="drilldown-label">Timeline</span>
      <div class="timeline-strip">
        ${timelineRows
          .map(
            (stage) => `
              <div class="timeline-step ${escapeHtml(stage.tone)}">
                <span>${escapeHtml(stage.label)}</span>
                <strong>${escapeHtml(stage.display)}</strong>
                <i style="width:${stage.width}%"></i>
              </div>
            `
          )
          .join("")}
      </div>
    </div>

    <div class="project-drilldown-block">
      <span class="drilldown-label">Issue</span>
      <div class="issue-chip-list">
        ${
          issues.length
            ? issues.map((issue) => `<button class="issue-chip" type="button" data-chart-filter="issue" data-chart-value="${escapeHtml(issue.key)}">${escapeHtml(issue.label)}</button>`).join("")
            : `<span class="issue-chip clean">ไม่พบ issue หลัก</span>`
        }
      </div>
    </div>

    <div class="project-drilldown-note">
      <span>Note</span>
      <p>${escapeHtml(selected.note || selected.issue || selected.section || "-")}</p>
    </div>
    ${renderLiveEditForm(selected)}
  `;
  bindChartFilterButtons(els.selectedPanel);
  bindLiveEditForm(selected);
}

function renderLiveEditForm(task) {
  const canEdit = state.writeConfig.enabled && task.sourceGroup === "location";
  const deleteTarget = budgetDeleteTarget(task);
  const orphanDeleteTarget = orphanSummaryDeleteTarget(task);
  const canDelete = (state.writeConfig.canDelete || state.writeConfig.enabled) && Boolean(deleteTarget || orphanDeleteTarget);
  const editDisabled = canEdit ? "" : "disabled";
  const deleteDisabled = canDelete ? "" : "disabled";
  const helper = orphanDeleteTarget
    ? "ไม่พบ Project ต้นทางแล้ว ปุ่มนี้จะลบเฉพาะรายการสรุปค้างโดยไม่แตะงานอื่น"
    : task.sourceGroup !== "location" && !deleteTarget
    ? "แก้ได้เฉพาะ sheet ของ site เท่านั้น"
    : state.writeConfig.enabled
      ? "บันทึกเฉพาะ field ที่อนุญาต ไม่แตะ template หรือข้อมูล column อื่น"
      : state.writeConfig.canDelete
        ? "Delete is enabled for approved characters. Edit is limited to Super Admin, Admin, or Tammasit."
      : state.writeConfig.reason;

  return `
    <form class="live-edit-form" id="liveEditForm">
      <div class="live-edit-heading">
        <div>
          <span class="drilldown-label">Live edit</span>
          <strong>แก้ข้อมูลใน Google Sheet</strong>
        </div>
        <div class="live-edit-actions">
          <button class="text-button danger-action" type="button" data-delete-project ${deleteDisabled}>${orphanDeleteTarget ? "ลบรายการสรุปค้าง" : "ลบ Project"}</button>
          <button class="text-button primary-action" type="submit" ${editDisabled}>บันทึก</button>
        </div>
      </div>
      <div class="live-edit-grid">
        <label>
          <span>Status</span>
          <select name="statusKey" ${editDisabled}>
            ${statusWriteOptions()
              .map(([value, label]) => `<option value="${escapeHtml(value)}" ${task.statusKey === value ? "selected" : ""}>${escapeHtml(label)}</option>`)
              .join("")}
          </select>
        </label>
        <fieldset class="stage-checkbox-field">
          <legend>สถานะจัดจ้าง</legend>
          <div class="stage-checkbox-grid">
            ${renderProgressCheckboxes(task, editDisabled)}
          </div>
        </fieldset>
        <label>
          <span>Owner</span>
          <select name="owner" ${editDisabled}>
            ${ownerWriteOptions()
              .map(([value, label]) => `<option value="${escapeHtml(value)}" ${task.owner === value ? "selected" : ""}>${escapeHtml(label)}</option>`)
              .join("")}
          </select>
          <input name="ownerOriginal" type="hidden" value="${escapeHtml(task.owner || "")}" />
        </label>
        <label>
          <span>Budget code</span>
          <input name="budgetCode" type="text" maxlength="20" list="budgetCodeSuggestions" value="${escapeHtml(task.budgetCode || "")}" ${editDisabled} />
        </label>
        <label>
          <span>PO Number</span>
          <input name="poNumber" type="text" maxlength="80" value="${escapeHtml(task.poNumber || "")}" ${editDisabled} />
        </label>
        <label class="full-field">
          <span>Note / Issue</span>
          <textarea name="note" maxlength="1000" rows="3" ${editDisabled}>${escapeHtml(task.issue || task.note || "")}</textarea>
        </label>
      </div>
      <p class="write-helper">${escapeHtml(helper || "")}</p>
    </form>
  `;
}

function bindLiveEditForm(task) {
  const form = document.getElementById("liveEditForm");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.writeConfig.enabled) {
      showWriteToast(state.writeConfig.reason || "ยังไม่ได้เปิด write mode", "error");
      return;
    }
    if (task.sourceGroup !== "location") {
      showWriteToast("แก้ได้เฉพาะ sheet ของ site เท่านั้น", "error");
      return;
    }
    const formData = new FormData(form);
    const selectedOwner = formData.get("owner");
    const originalOwner = formData.get("ownerOriginal");
    const progress = getProgressUpdateFromForm(form);
    await runWriteAction(async () => {
      await postWrite("/api/update-task", {
        taskId: task.id,
        gid: task.gid,
        rowNumber: task.rowNumber,
        updates: {
          statusKey: formData.get("statusKey"),
          progress,
          stage: stageKeyFromProgress(progress),
          owner: selectedOwner || originalOwner || "",
          budgetCode: formData.get("budgetCode"),
          poNumber: formData.get("poNumber"),
          note: formData.get("note")
        }
      });
      showWriteToast("บันทึกการแก้ไขแล้ว กำลัง sync ข้อมูลใหม่", "success");
      await returnToAppAfterWrite({ preferredTaskId: task.id });
    });
  });
  const deleteButton = form.querySelector("[data-delete-project]");
  deleteButton?.addEventListener("click", async () => {
    if (!(state.writeConfig.canDelete || state.writeConfig.enabled)) {
      showWriteToast(state.writeConfig.deleteReason || state.writeConfig.reason || "ยังไม่ได้เปิด write mode", "error");
      return;
    }
    const deleteTarget = budgetDeleteTarget(task);
    const orphanDeleteTarget = orphanSummaryDeleteTarget(task);
    if (!deleteTarget && !orphanDeleteTarget) {
      showWriteToast("ลบได้เฉพาะ project ใน sheet ของ site เท่านั้น", "error");
      return;
    }
    if (orphanDeleteTarget) {
      const confirmed = window.confirm(`ลบเฉพาะรายการสรุปค้างนี้ออกจาก Google Sheet?\n\n${task.item}\n\nระบบจะตรวจอีกครั้งว่า Project ต้นทางไม่มีอยู่จริง และจะไม่ลบงานอื่น`);
      if (!confirmed) return;
      await runWriteAction(async () => {
        await postWrite("/api/delete-summary-orphan", orphanDeleteTarget);
        showWriteToast("ลบรายการสรุปค้างแล้ว กำลัง sync ข้อมูลใหม่", "success");
        state.selectedTaskId = null;
        await returnToAppAfterWrite({ preferredTaskId: null });
      });
      return;
    }
    const confirmed = window.confirm(`ลบ project นี้ออกจาก Google Sheet?\n\n${task.item}\n\nระบบจะลบข้อมูลในแถวนี้จาก sheet ${deleteTarget.sourceTab || task.sourceTab}`);
    if (!confirmed) return;
    await runWriteAction(async () => {
      const result = await postWrite("/api/delete-project", {
        taskId: deleteTarget.id,
        gid: deleteTarget.gid,
        rowNumber: deleteTarget.rowNumber,
        expectedItem: deleteTarget.item || task.item,
        summaryGid: task.sourceGroup === "person" ? task.gid : "",
        summaryRowNumber: task.sourceGroup === "person" ? task.rowNumber : 0
      });
      if (result.summarySync?.ok === false) {
        showWriteToast(`ลบ project แล้ว แต่ sync สรุปงานรายคนไม่สำเร็จ: ${result.summarySync.error}`, "error");
      } else {
        showWriteToast("ลบ project ออกจาก Google Sheet แล้ว กำลัง sync ข้อมูลใหม่", "success");
      }
      state.selectedTaskId = null;
      await returnToAppAfterWrite({ preferredTaskId: null });
    });
  });
}

async function postWrite(path, payload) {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || result.detail || `HTTP ${response.status}`);
  }
  return result;
}

async function runWriteAction(action) {
  if (state.writeBusy) return;
  state.writeBusy = true;
  document.querySelectorAll(".live-edit-form button, .live-edit-form input, .live-edit-form select, .live-edit-form textarea").forEach((item) => {
    item.disabled = true;
  });
  els.submitProjectButton.disabled = true;
  try {
    await action();
  } catch (error) {
    showWriteToast(error.message, "error");
  } finally {
    state.writeBusy = false;
    updateWriteModeUi();
  }
}

function openProjectModal() {
  updateWriteModeUi();
  els.projectModal.style.removeProperty("display");
  els.projectModal.classList.remove("hidden");
  els.projectModal.setAttribute("aria-hidden", "false");
  if (!els.newProjectStatus.value) els.newProjectStatus.value = "active";
  setTimeout(() => document.getElementById("newProjectItem")?.focus(), 0);
}

function closeProjectModal() {
  els.projectModal.classList.add("hidden");
  els.projectModal.setAttribute("aria-hidden", "true");
  els.projectModal.style.display = "none";
}

async function submitNewProject(event) {
  event.preventDefault();
  if (!state.writeConfig.enabled) {
    showWriteToast(state.writeConfig.reason || "ยังไม่ได้เปิด write mode", "error");
    return;
  }
  const formData = new FormData(els.newProjectForm);
  await runWriteAction(async () => {
    const selectedSiteGid = String(formData.get("site") || "");
    const result = await postWrite("/api/add-project", {
      gid: selectedSiteGid,
      project: {
        item: formData.get("item"),
        statusKey: formData.get("statusKey"),
        stage: formData.get("stage"),
        owner: formData.get("owner"),
        budgetCode: formData.get("budgetCode"),
        poNumber: formData.get("poNumber"),
        contractor: formData.get("contractor"),
        budget: formData.get("budget"),
        note: formData.get("note")
      }
    });
    scheduleProjectModalClose(2000);
    if (result.summarySync?.ok === false) {
      showWriteToast(`เพิ่ม project แล้ว แต่ sync สรุปงานรายคนไม่สำเร็จ: ${result.summarySync.error}`, "error");
    } else {
      showWriteToast("เพิ่ม project ใหม่แล้ว และ sync สรุปงานรายคนแล้ว", "success");
    }
    resetFilters();
    const newTaskId = taskIdFromWriteResult(selectedSiteGid, result);
    els.newProjectForm.reset();
    await returnToAppAfterWrite({ preferredTaskId: newTaskId, selectedView: selectedSiteGid, tablePage: 0, modalCloseDelayMs: 2000 });
  });
}

async function returnToAppAfterWrite(options = {}) {
  const modalCloseDelayMs = Number(options.modalCloseDelayMs || 0);
  if (modalCloseDelayMs > 0) {
    scheduleProjectModalClose(modalCloseDelayMs);
  } else {
    closeProjectModal();
  }
  blurActiveElement();
  await loadData({
    preferredTaskId: options.preferredTaskId ?? null,
    selectedView: options.selectedView,
    tablePage: options.tablePage
  });
  if (modalCloseDelayMs <= 0) closeProjectModal();
  window.requestAnimationFrame(() => {
    const target = els.dashboard.classList.contains("hidden") ? document.getElementById("app") : els.dashboard;
    target?.scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

function scheduleProjectModalClose(delayMs = 0) {
  window.clearTimeout(scheduleProjectModalClose.timer);
  scheduleProjectModalClose.timer = window.setTimeout(() => {
    closeProjectModal();
    blurActiveElement();
  }, Math.max(0, Number(delayMs) || 0));
}

function taskIdFromWriteResult(gid, result) {
  const rowNumber = Number(result?.rowNumber);
  const index = clean(result?.index);
  if (!gid || !Number.isInteger(rowNumber) || rowNumber < 1 || !index) return null;
  return `${gid}-${rowNumber - 1}-${index}`;
}

function blurActiveElement() {
  const active = document.activeElement;
  if (active && typeof active.blur === "function") active.blur();
}

function showWriteToast(message, tone = "info") {
  els.writeToast.textContent = message;
  els.writeToast.className = `write-toast ${tone}`;
  window.clearTimeout(showWriteToast.timer);
  showWriteToast.timer = window.setTimeout(() => {
    els.writeToast.classList.add("hidden");
  }, 4200);
}

function getTaskIssues(task, tasks = state.tasks) {
  return ["missing-code", "missing-owner", "missing-status", "active-no-budget", "stopped-with-budget", "high-active-budget"]
    .filter((key) => taskMatchesIssue(task, key, tasks))
    .map((key) => ({ key, label: issueLabel(key) }));
}

function getRiskTasks(tasks) {
  const riskKeys = ["missing-code", "high-active-budget", "stopped-with-budget", "active-no-budget"];
  return tasks.filter((task) => riskKeys.some((key) => taskMatchesIssue(task, key, tasks)));
}

function groupCompareSummary(tasks, getName) {
  const map = new Map();
  tasks.forEach((task) => {
    const name = getName(task) || "ไม่ระบุ";
    const current =
      map.get(name) || {
        name,
        count: 0,
        activeCount: 0,
        budget: 0,
        noCodeCount: 0,
        noCodeBudget: 0
    };
    current.count += 1;
    current.budget += task.budget;
    if (isWatchableTask(task)) current.activeCount += 1;
    if (taskMatchesIssue(task, "missing-code", tasks)) {
      current.noCodeCount += 1;
      current.noCodeBudget += task.budget;
    }
    map.set(name, current);
  });
  return [...map.values()];
}

function getLowRemainingRows(budgetRows, limit = 3) {
  return [...budgetRows]
    .filter((row) => budgetRowAmount(row) > 0)
    .sort((a, b) => budgetRowAmount(a) - budgetRowAmount(b))
    .slice(0, limit);
}

function getTaskTimeline(task) {
  return [
    { key: "bid", label: "Bid" },
    { key: "pr", label: "PR" },
    { key: "po", label: "PO" },
    { key: "con", label: "Con" }
  ].map((stage) => {
    const value = task.progress?.[stage.key];
    const width = value === null || value === undefined ? 0 : Math.max(4, Math.round(value * 100));
    const tone = value === null || value === undefined ? "empty" : value >= 1 ? "done" : value > 0 ? "active" : "waiting";
    return {
      ...stage,
      tone,
      width,
      display: value === null || value === undefined ? "-" : formatPercent(value)
    };
  });
}

function getCurrentStageLabel(task) {
  const nextStage = getTaskTimeline(task).find((stage) => stage.tone !== "done");
  if (!nextStage) return "Stage: Complete";
  if (nextStage.tone === "empty") return `Stage: ${nextStage.label} ไม่มีข้อมูล`;
  return `Stage: ${nextStage.label} ยังไม่ครบ`;
}

function renderCharts(tasks, context, budgetRows = []) {
  const realizedTasks = getRealizedBudgetTasks(tasks);
  const bySheet =
    context?.viewType === "personSummary"
      ? groupPersonRealizedBudget(realizedTasks, tasks)
      : groupSum(realizedTasks, (task) => task.sourceTitle || task.sourceTab);
  const byCode =
    state.filters.code === "all"
      ? buildRealizedCodeRows(realizedTasks)
      : groupSum(realizedTasks, (task) => normalizedTaskBudgetCode(task));
  renderSecondaryChartTitle(context);
  els.codeBudgetChart.classList.toggle("carry-forward-bars", context?.viewType === "budget");
  if (context?.viewType === "budget") {
    const realizedSiteRows = buildRealizedSiteChartRows(realizedTasks);
    const remainingSiteRows = buildRemainingBudgetChartRows(budgetRows);
    const sharedMax = Math.max(
      ...realizedSiteRows.map((item) => item.value),
      ...remainingSiteRows.map((item) => item.value),
      1
    );
    renderBarList(els.sheetBudgetChart, realizedSiteRows, "sheet", sharedMax);
    renderBarList(els.codeBudgetChart, remainingSiteRows, "carry", sharedMax);
    return;
  }

  renderBarList(els.sheetBudgetChart, bySheet.slice(0, 8), "sheet");
  if (context?.viewType === "personSummary" && state.filters.personSheet === "all") {
    renderPersonDonutChart(els.codeBudgetChart, bySheet);
  } else {
    renderBarList(els.codeBudgetChart, byCode, "code");
  }
}

function renderSecondaryChartTitle(context) {
  const title = els.codeBudgetChart.closest(".chart-panel")?.querySelector(".panel-heading h3");
  if (!title) return;
  if (context?.viewType === "budget") {
    title.textContent = "งบประมาณคงเหลือ";
    return;
  }
  title.textContent = context?.viewType === "personSummary" && state.filters.personSheet === "all" ? "งบตามทีมงาน" : "งบตามรหัส";
}

function buildRemainingBudgetChartRows(budgetRows) {
  const totals = new Map(budgetSiteOrder.map((site) => [site.label, 0]));
  budgetRows.forEach((row) => {
    const label = budgetSiteLabelFromBudgetRow(row);
    if (!totals.has(label)) return;
    totals.set(label, totals.get(label) + budgetRowAmount(row));
  });

  return budgetSiteOrder.map((site) => ({
    name: site.label,
    value: totals.get(site.label) || 0,
    solid: chartPalette.carryForward.solid,
    color: carryForwardSiteColor,
    filter: "source",
    filterValue: site.label
  }));
}

function buildRealizedSiteChartRows(tasks) {
  const totals = new Map(budgetSiteOrder.map((site) => [site.label, 0]));
  tasks.forEach((task) => {
    const label = budgetSiteLabelFromTask(task);
    if (!totals.has(label)) return;
    totals.set(label, totals.get(label) + task.budget);
  });

  return budgetSiteOrder.map((site, index) => ({
    name: site.label,
    value: totals.get(site.label) || 0,
    solid: sourceColor(site.label, index),
    color: sourceGradient(site.label, index),
    filter: "source",
    filterValue: site.label
  }));
}

function getRealizedBudgetTasks(tasks) {
  const nonStoppedTasks = tasks.filter((task) => task.statusKey !== "stopped");
  if (state.filters.code !== "all") return nonStoppedTasks;
  return nonStoppedTasks.filter((task) => realizedBudgetCodeBuckets.includes(normalizedTaskBudgetCode(task)));
}

function buildRealizedCodeRows(tasks) {
  return realizedBudgetCodeBuckets
    .map((code) => ({
      name: code,
      value: sum(
        tasks.filter((task) => normalizedTaskBudgetCode(task) === code),
        "budget"
      )
    }))
    .filter((row) => row.value > 0);
}

function normalizedTaskBudgetCode(task) {
  const code = clean(task.budgetCode).toUpperCase();
  return code || "ไม่ระบุ";
}

function renderBarList(container, data, type, maxValue) {
  container.classList.remove("donut-mode");
  if (!data.length) {
    container.innerHTML = `<div class="muted">ไม่มีข้อมูล</div>`;
    return;
  }

  const max = Math.max(Number(maxValue) || 0, ...data.map((item) => item.value), 1);
  container.innerHTML = data
    .map((item, index) => {
      const width = item.value > 0 ? Math.max(3, (item.value / max) * 100) : 0;
      const minWidth = item.value > 0 ? "3px" : "0";
      const solid = item.solid || item.accent || (type === "code" ? chartCodeColor(item.name, index) : sourceColor(item.name, index));
      const color =
        item.color ||
        (type === "code"
          ? codeGradient(item.name, index)
          : type === "carry"
            ? carryForwardSiteColor
            : sourceGradient(item.name, index));
      const filterKey = item.filter || (type === "code" ? "code" : "source");
      const filterValue = item.filterValue || item.name;
      const displayName = item.displayName || item.name;
      return `
        <button class="bar-row" type="button" style="--bar-color:${solid}" data-chart-filter="${escapeHtml(filterKey)}" data-chart-value="${escapeHtml(filterValue)}">
          <div class="bar-row-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</div>
          <div class="bar-track"><div class="bar-fill" style="--bar-color:${solid}; width:${width}%; min-width:${minWidth}; background:${color}"></div></div>
          <div class="bar-value">${formatMoney(item.value)}</div>
        </button>
      `;
    })
    .join("");
  bindChartFilterButtons(container);
}

function renderCodeDonutChart(container, data) {
  container.classList.add("donut-mode");
  if (!data.length) {
    container.innerHTML = `<div class="muted">ไม่มีข้อมูล</div>`;
    return;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  container.innerHTML = `
    <div class="budget-code-donut">
      <div class="budget-code-donut-ring" style="${buildBudgetCodeDonutStyle(data)}">
        <span>${formatCompactMoney(total)}</span>
        <small>รวม</small>
      </div>
      <div class="budget-code-donut-legend">
        ${data
          .map((item, index) => {
            const color = chartCodeColor(item.name, index);
            return `
              <button class="budget-code-donut-row" type="button" style="--bar-color:${color}" data-chart-filter="code" data-chart-value="${escapeHtml(item.name)}">
                <i style="background:${color}"></i>
                <span>
                  <strong>${escapeHtml(item.name)}</strong>
                  <small>${formatPercent(ratio(item.value, total))}</small>
                </span>
                <em>${formatMoney(item.value)}</em>
              </button>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
  bindChartFilterButtons(container);
}

function renderPersonDonutChart(container, data) {
  container.classList.add("donut-mode");
  if (!data.length) {
    container.innerHTML = `<div class="muted">ไม่มีข้อมูล</div>`;
    return;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  container.innerHTML = `
    <div class="budget-code-donut person-budget-donut">
      <div class="budget-code-donut-ring" style="${buildPersonDonutStyle(data)}">
        <span>${formatCompactMoney(total)}</span>
        <small>รวม</small>
      </div>
      <div class="budget-code-donut-legend">
        ${data
          .map((item) => {
            const color = item.color || chartPersonColor(item.name);
            const label = item.displayName || item.name;
            return `
              <button class="budget-code-donut-row" type="button" style="--bar-color:${color}" data-chart-filter="${escapeHtml(item.filter || "personSheet")}" data-chart-value="${escapeHtml(item.filterValue || item.name)}">
                <i style="background:${color}"></i>
                <span>
                  <strong>${escapeHtml(label)}</strong>
                  <small>${formatPercent(ratio(item.value, total))}</small>
                </span>
                <em>${formatMoney(item.value)}</em>
              </button>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
  bindChartFilterButtons(container);
}

function bindChartFilterButtons(root) {
  root.querySelectorAll("[data-chart-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      applyChartFilter(button.dataset.chartFilter, button.dataset.chartValue);
    });
  });
}

function renderTable(tasks) {
  const pageCount = Math.max(1, Math.ceil(tasks.length / tablePageSize));
  state.tablePage = Math.min(Math.max(state.tablePage, 0), pageCount - 1);
  const start = state.tablePage * tablePageSize;
  const visibleTasks = tasks.slice(start, start + tablePageSize);
  const end = start + visibleTasks.length;
  els.tableCount.textContent = `${numberFormatter.format(tasks.length)} รายการ`;
  els.tableCount.textContent = tasks.length
    ? `${numberFormatter.format(start + 1)}-${numberFormatter.format(end)} / ${numberFormatter.format(tasks.length)} รายการ`
    : "0 รายการ";
  if (!tasks.length) {
    renderTablePager(0, 0, 1);
    els.taskTable.innerHTML = `<tr><td colspan="7" class="muted">ไม่มีรายการตามตัวกรอง</td></tr>`;
    return;
  }

  els.taskTable.innerHTML = visibleTasks
    .map(
      (task) => `
        <tr class="${task.id === state.selectedTaskId ? "selected" : ""}" data-task-id="${escapeHtml(task.id)}">
          <td>
            <div class="task-title">${escapeHtml(task.item)}</div>
            <div class="task-subtitle">${escapeHtml(task.note || task.plan || "")}</div>
          </td>
          <td>
            <strong>${escapeHtml(task.sourceTab)}</strong>
            <div class="task-subtitle">${escapeHtml(task.section || task.sourceTitle)}</div>
          </td>
          <td>${statusPill(task)}</td>
          <td>${progressCell(task)}</td>
          <td class="money">${formatMoney(task.budget)}</td>
          <td>${escapeHtml(task.budgetCode || "ไม่ระบุ")}</td>
          <td>${escapeHtml(task.owner || "-")}</td>
        </tr>
      `
    )
    .join("");

  renderTablePager(tasks.length, state.tablePage, pageCount);

  els.taskTable.querySelectorAll("[data-task-id]").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedTaskId = row.dataset.taskId;
      renderSelected(tasks);
      els.taskTable.querySelectorAll("tr").forEach((item) => item.classList.remove("selected"));
      row.classList.add("selected");
    });
  });
}

function renderTablePager(total, currentPage, pageCount) {
  if (!els.tablePager) return;
  if (pageCount <= 1) {
    els.tablePager.innerHTML = total ? `<span>${numberFormatter.format(total)} รายการ</span>` : "";
    return;
  }

  const buttons = Array.from({ length: pageCount }, (_, index) => `
    <button class="${index === currentPage ? "active" : ""}" type="button" data-table-page="${index}">
      ${numberFormatter.format(index + 1)}
    </button>
  `).join("");

  els.tablePager.innerHTML = `
    <button type="button" data-table-page="${Math.max(0, currentPage - 1)}" ${currentPage === 0 ? "disabled" : ""}>Prev</button>
    <div class="table-page-dots">${buttons}</div>
    <button type="button" data-table-page="${Math.min(pageCount - 1, currentPage + 1)}" ${currentPage === pageCount - 1 ? "disabled" : ""}>Next</button>
  `;

  els.tablePager.querySelectorAll("[data-table-page]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tablePage = Number(button.dataset.tablePage);
      render();
    });
  });
}

function renderSelected(tasks) {
  return renderSelectedDrilldown(tasks);
  const selected = tasks.find((task) => task.id === state.selectedTaskId) || tasks[0] || state.tasks[0];
  if (!selected) {
    els.selectedPanel.innerHTML = `<h3>รายละเอียด</h3><p class="muted">ไม่มีรายการ</p>`;
    return;
  }
  state.selectedTaskId = selected.id;

  els.selectedPanel.innerHTML = `
    <p class="page-kicker">${escapeHtml(selected.sourceTitle)}</p>
    <h3 class="selected-title">${escapeHtml(selected.item)}</h3>
    ${statusPill(selected)}
    <div class="detail-grid">
      <div class="detail-item"><span>งบประมาณ</span><strong>${formatMoney(selected.budget)}</strong></div>
      <div class="detail-item"><span>ความคืบหน้า</span><strong>${formatPercent(selected.averageProgress)}</strong></div>
      <div class="detail-item"><span>ผู้รับเหมา</span><strong>${escapeHtml(selected.contractor || "-")}</strong></div>
      <div class="detail-item"><span>ผู้รับผิดชอบ</span><strong>${escapeHtml(selected.owner || "-")}</strong></div>
      <div class="detail-item"><span>รหัสงบ</span><strong>${escapeHtml(selected.budgetCode || "ไม่ระบุ")}</strong></div>
      <div class="detail-item"><span>แผนงาน</span><strong>${escapeHtml(selected.plan || "-")}</strong></div>
    </div>
    ${selected.note ? `<p class="task-subtitle">${escapeHtml(selected.note)}</p>` : ""}
  `;
}

function renderBudgetRemaining(budgetRows, context) {
  els.budgetRemainingPanel.classList.toggle("hidden", context.viewType === "overview" || context.viewType === "actionCenter");
  const scopeText = context.budgetScope === "all" ? "" : " - เฉพาะมุมมองนี้";
  els.budgetDate.textContent = `${state.budgetDate || "จากชีทงบประมาณคงเหลือ"}${scopeText}`;
  const topRows = [...budgetRows]
    .filter((row) => budgetRowAmount(row) > 0)
    .sort((a, b) => budgetRowAmount(b) - budgetRowAmount(a))
    .slice(0, 6);

  if (!topRows.length) {
    els.remainingBudgetList.innerHTML = `<div class="muted">ไม่มีข้อมูลงบคงเหลือ</div>`;
    return;
  }

  els.remainingBudgetList.innerHTML = topRows
    .map((row) => {
      const topCodes = row.categories
        .filter((item) => item.value > 0 && (state.filters.code === "all" || item.code === state.filters.code || item.label.includes(state.filters.code)))
        .sort((a, b) => b.value - a.value)
        .slice(0, 2);
      const amount = budgetRowAmount(row);
      return `
        <div class="budget-item">
          <div class="budget-item-head">
            <strong title="${escapeHtml(row.unit)}">${escapeHtml(row.unit)}</strong>
            <span class="money">${formatCompactMoney(amount)}</span>
          </div>
          <div class="mini-metrics">
            ${topCodes
              .map((item) => `<span>${escapeHtml(item.code || item.label)}: ${formatCompactMoney(item.value)}</span>`)
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");
}

function renderAttention(tasks) {
  const items = tasks
    .filter((task) => task.statusKey !== "stopped" && (task.statusKey !== "done" || /ไม่ได้ตั้งงบ|รอ PO|ตรวจสอบ/.test(task.note)))
    .sort((a, b) => b.budget - a.budget)
    .slice(0, 6);

  if (!items.length) {
    els.attentionList.innerHTML = `<div class="muted">ไม่มีรายการที่ต้องเน้นในมุมมองนี้</div>`;
      return;
  }

  els.attentionList.innerHTML = items
    .map(
      (task) => `
        <button class="attention-item" type="button" data-attention-id="${escapeHtml(task.id)}">
          <div class="attention-item-head">
            <strong title="${escapeHtml(task.item)}">${escapeHtml(task.item)}</strong>
            <span class="money">${formatCompactMoney(task.budget)}</span>
          </div>
          <div class="mini-metrics">
            <span>${escapeHtml(task.sourceTab)}</span>
            <span>${escapeHtml(task.budgetCode || task.status)}</span>
          </div>
        </button>
      `
    )
    .join("");

  els.attentionList.querySelectorAll("[data-attention-id]").forEach((button) => {
    button.addEventListener("click", () => {
      focusTaskInSourceView(button.dataset.attentionId);
    });
  });
}

function renderBudgetAlerts(tasks, context, budgetRows) {
  const risks = [
    {
      key: "missing-code",
      title: "มีงบแต่ไม่มีรหัสงบ",
      detail: "เสี่ยงจับคู่กับงบคงเหลือไม่ได้",
      rows: tasks.filter((task) => taskMatchesIssue(task, "missing-code", tasks))
    },
    {
      key: "high-active-budget",
      title: "งานงบสูงยังไม่จบ",
      detail: `เกณฑ์งบสูงตั้งแต่ ${formatCompactMoney(highBudgetThreshold(tasks))}`,
      rows: tasks.filter((task) => taskMatchesIssue(task, "high-active-budget", tasks))
    },
    {
      key: "stopped-with-budget",
      title: "หยุดดำเนินการแต่ยังมีงบ",
      detail: "ควรเช็กว่ายังต้องกันงบไว้ไหม",
      rows: tasks.filter((task) => taskMatchesIssue(task, "stopped-with-budget", tasks))
    },
    {
      key: "active-no-budget",
      title: "งานยังไม่จบแต่ไม่มีงบ",
      detail: "ควรตรวจว่าตั้งงบครบหรือยัง",
      rows: tasks.filter((task) => taskMatchesIssue(task, "active-no-budget", tasks))
    }
  ].filter((item) => item.rows.length);

  const lowRemaining = budgetRows
    .filter((row) => {
      const amount = budgetRowAmount(row);
      return amount > 0 && amount <= 100000;
    })
    .sort((a, b) => budgetRowAmount(a) - budgetRowAmount(b))
    .slice(0, 3);

  if (!risks.length && !lowRemaining.length) {
    els.budgetAlertList.innerHTML = `<div class="muted">ยังไม่พบสัญญาณงบเสี่ยงในมุมมองนี้</div>`;
    return;
  }

  els.budgetAlertList.innerHTML = `
    ${risks
      .map(
        (risk) => `
          <button class="risk-item" type="button" data-chart-filter="issue" data-chart-value="${escapeHtml(risk.key)}">
            <span>${escapeHtml(risk.title)}</span>
            <strong>${numberFormatter.format(risk.rows.length)} รายการ</strong>
            <em>${escapeHtml(risk.detail)} | ${formatCompactMoney(sum(risk.rows, "budget"))}</em>
          </button>
        `
      )
      .join("")}
    ${lowRemaining
      .map(
        (row) => `
          <button class="risk-item low" type="button" data-chart-filter="source" data-chart-value="${escapeHtml(row.unit)}">
            <span>งบคงเหลือน้อย</span>
            <strong>${formatCompactMoney(budgetRowAmount(row))}</strong>
            <em>${escapeHtml(row.unit)}</em>
          </button>
        `
      )
      .join("")}
  `;
  bindChartFilterButtons(els.budgetAlertList);
}

function renderDataQuality(tasks) {
  const checks = [
    {
      key: "missing-owner",
      title: "ไม่มีผู้รับผิดชอบ",
      rows: tasks.filter((task) => taskMatchesIssue(task, "missing-owner", tasks))
    },
    {
      key: "missing-code",
      title: "ไม่มีรหัสงบ",
      rows: tasks.filter((task) => taskMatchesIssue(task, "missing-code", tasks))
    },
    {
      key: "missing-status",
      title: "ไม่มีสถานะ",
      rows: tasks.filter((task) => taskMatchesIssue(task, "missing-status", tasks))
    },
    {
      key: "active-no-budget",
      title: "ไม่มีงบประมาณ",
      rows: tasks.filter((task) => taskMatchesIssue(task, "active-no-budget", tasks))
    }
  ];

  els.dataQualityList.innerHTML = checks
    .map((check) => {
      const isClean = check.rows.length === 0;
      return `
        <button class="quality-item ${isClean ? "clean" : ""}" type="button" ${isClean ? "disabled" : `data-chart-filter="issue" data-chart-value="${escapeHtml(check.key)}"`}>
          <span>${escapeHtml(check.title)}</span>
          <strong>${isClean ? "ผ่าน" : `${numberFormatter.format(check.rows.length)} รายการ`}</strong>
        </button>
      `;
    })
    .join("");
  bindChartFilterButtons(els.dataQualityList);
}

function exportCurrentCsv() {
  const context = getViewContext();
  const rows = getFilteredTasks(context.tasks, context);
  const headers = ["รายการ", "ชีท", "หมวด", "สถานะ", "ความคืบหน้า", "ผู้รับเหมา", "งบประมาณ", "รหัสงบ", "PO Number", "ผู้รับผิดชอบ", "แผนงาน", "หมายเหตุ"];
  const csvRows = [
    headers,
    ...rows.map((task) => [
      task.item,
      task.sourceTab,
      task.section || task.sourceTitle,
      task.status,
      formatPercent(task.averageProgress),
      task.contractor,
      task.budget,
      task.budgetCode || "ไม่ระบุ",
      task.poNumber || "",
      task.owner || "",
      task.plan || "",
      task.note || ""
    ])
  ];
  const csv = `\ufeff${csvRows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(csv, `budget-utilize-${stamp}.csv`, "text/csv;charset=utf-8");
}

function renderPrintReport() {
  const context = getViewContext();
  const rows = getFilteredTasks(context.tasks, context);
  const budgetRows = getBudgetRowsForContext(context);
  const filters = getActiveFilterEntries(context);
  const generatedAt = new Date().toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  const loadedAt = state.lastLoadedAt
    ? state.lastLoadedAt.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })
    : "-";
  const modified = new Date(SOURCE_MODIFIED).toLocaleDateString("th-TH", { dateStyle: "medium" });
  const done = rows.filter((task) => task.statusKey === "done");
  const active = rows.filter((task) => task.statusKey === "active");
  const stopped = rows.filter((task) => task.statusKey === "stopped");
  const avgProgress = rows.length ? rows.reduce((total, task) => total + task.averageProgress, 0) / rows.length : 0;
  const tableRows = rows.slice(0, 200);
  const qualityRows = getQualityChecks(rows);
  const riskRows = getRiskChecks(rows);

  els.printReport.innerHTML = `
    <div class="print-cover">
      <div>
        <p>Budget Utilize</p>
        <h1>${escapeHtml(context.title)}</h1>
        <span>${escapeHtml(context.kicker)} | ${numberFormatter.format(rows.length)} รายการ</span>
      </div>
      <div class="print-meta">
        <span>Generated: ${escapeHtml(generatedAt)}</span>
        <span>Loaded: ${escapeHtml(loadedAt)}</span>
        <span>Source file: ${escapeHtml(modified)}</span>
      </div>
    </div>

    <section class="print-filter-row">
      <strong>ตัวกรอง</strong>
      <span>${filters.length ? escapeHtml(filters.map((item) => `${item.label}: ${item.value}`).join(" | ")) : "ไม่มีตัวกรอง"}</span>
    </section>

    <section class="print-summary-grid">
      ${[
        ["งบในรายการงาน", formatMoney(sum(rows, "budget"))],
        ["งบประมาณคงเหลือ", formatMoney(sumBudgetRows(budgetRows))],
        ["แล้วเสร็จ", `${formatPercent(ratio(done.length, rows.length))} (${numberFormatter.format(done.length)})`],
        ["กำลังดำเนินการ", `${numberFormatter.format(active.length)} รายการ`],
        ["ไม่ดำเนินการ", `${numberFormatter.format(stopped.length)} รายการ`],
        ["ความคืบหน้าเฉลี่ย", formatPercent(avgProgress)]
      ]
        .map(
          ([label, value]) => `
            <div>
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value)}</strong>
            </div>
          `
        )
        .join("")}
    </section>

    <section class="print-two-col">
      <article>
        <h2>Alert งบเสี่ยง</h2>
        ${riskRows
          .map(
            (item) => `
              <div class="print-check-row">
                <span>${escapeHtml(item.title)}</span>
                <strong>${numberFormatter.format(item.rows.length)} รายการ</strong>
              </div>
            `
          )
          .join("")}
      </article>
      <article>
        <h2>Data Quality</h2>
        ${qualityRows
          .map(
            (item) => `
              <div class="print-check-row ${item.rows.length ? "" : "clean"}">
                <span>${escapeHtml(item.title)}</span>
                <strong>${item.rows.length ? `${numberFormatter.format(item.rows.length)} รายการ` : "ผ่าน"}</strong>
              </div>
            `
          )
          .join("")}
      </article>
    </section>

    <section class="print-table-section">
      <h2>รายการงาน</h2>
      <table class="print-table">
        <thead>
          <tr>
            <th>รายการ</th>
            <th>ชีท / หมวด</th>
            <th>สถานะ</th>
            <th>ความคืบหน้า</th>
            <th>งบประมาณ</th>
            <th>รหัส</th>
            <th>PO</th>
            <th>ผู้รับผิดชอบ</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows
            .map(
              (task) => `
                <tr>
                  <td>
                    <strong>${escapeHtml(task.item)}</strong>
                    ${task.note || task.plan ? `<small>${escapeHtml(task.note || task.plan)}</small>` : ""}
                  </td>
                  <td>${escapeHtml(task.sourceTab)}<small>${escapeHtml(task.section || task.sourceTitle)}</small></td>
                  <td>${escapeHtml(task.status || statusLabels.blank)}</td>
                  <td>${formatPercent(task.averageProgress)}</td>
                  <td>${formatMoney(task.budget)}</td>
                  <td>${escapeHtml(task.budgetCode || "ไม่ระบุ")}</td>
                  <td>${escapeHtml(task.poNumber || "-")}</td>
                  <td>${escapeHtml(task.owner || "-")}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
      ${rows.length > tableRows.length ? `<p class="print-note">แสดง ${numberFormatter.format(tableRows.length)} จาก ${numberFormatter.format(rows.length)} รายการ</p>` : ""}
    </section>
  `;
}

function getQualityChecks(tasks) {
  return [
    {
      key: "missing-owner",
      title: "ไม่มีผู้รับผิดชอบ",
      rows: tasks.filter((task) => taskMatchesIssue(task, "missing-owner", tasks))
    },
    {
      key: "missing-code",
      title: "ไม่มีรหัสงบ",
      rows: tasks.filter((task) => taskMatchesIssue(task, "missing-code", tasks))
    },
    {
      key: "missing-status",
      title: "ไม่มีสถานะ",
      rows: tasks.filter((task) => taskMatchesIssue(task, "missing-status", tasks))
    },
    {
      key: "active-no-budget",
      title: "ไม่มีงบประมาณ",
      rows: tasks.filter((task) => taskMatchesIssue(task, "active-no-budget", tasks))
    }
  ];
}

function getRiskChecks(tasks) {
  return [
    {
      key: "missing-code",
      title: "มีงบแต่ไม่มีรหัสงบ",
      rows: tasks.filter((task) => taskMatchesIssue(task, "missing-code", tasks))
    },
    {
      key: "high-active-budget",
      title: "งานงบสูงยังไม่จบ",
      rows: tasks.filter((task) => taskMatchesIssue(task, "high-active-budget", tasks))
    },
    {
      key: "stopped-with-budget",
      title: "หยุดดำเนินการแต่ยังมีงบ",
      rows: tasks.filter((task) => taskMatchesIssue(task, "stopped-with-budget", tasks))
    },
    {
      key: "active-no-budget",
      title: "งานยังไม่จบแต่ไม่มีงบ",
      rows: tasks.filter((task) => taskMatchesIssue(task, "active-no-budget", tasks))
    }
  ];
}

function statusPill(task) {
  return `<span class="pill ${task.statusKey}">${escapeHtml(task.status || statusLabels.blank)}</span>`;
}

function progressCell(task) {
  const pct = task.averageProgress;
  return `
    <div class="progress-cell">
      <div class="progress-label"><span>${formatPercent(pct)}</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${Math.round(pct * 100)}%"></div></div>
    </div>
  `;
}

function readProgress(row, normalizedStatus) {
  const values = {
    bid: toProgress(row[2]),
    pr: toProgress(row[3]),
    po: toProgress(row[4]),
    con: toProgress(row[5])
  };

  if (Object.values(values).every((value) => value === null) && normalizedStatus === "done") {
    return { bid: 1, pr: 1, po: 1, con: 1 };
  }
  return values;
}

function averageProgress(progress, normalizedStatus) {
  const values = Object.values(progress).filter((value) => value !== null);
  if (!values.length) return normalizedStatus === "done" ? 1 : 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeStatus(status) {
  if (!status) return "blank";
  if (status.includes("แล้วเสร็จ")) return "done";
  if (status.includes("ไม่ดำเนินการ")) return "stopped";
  if (status.includes("กำลัง")) return "active";
  return "blank";
}

function isSectionRow(index, item) {
  if (siteTitleFromSummaryRow(index, item)) return true;
  return Boolean(index) && !/^งาน/.test(item) && !/[0-9],[0-9]/.test(item);
}

function siteTitleFromSummaryRow(index, item) {
  const text = clean(item);
  if (!text || /^งาน/.test(text)) return "";
  const siteLabel = budgetSiteLabelFromValue(text);
  if (!siteLabel) return "";
  const compactText = compactBudgetText(normalizeBudgetUnit(text));
  const exactSiteTitle = budgetSiteOrder.some((site) =>
    site.aliases.concat(site.label).some((alias) => compactText === compactBudgetText(normalizeBudgetUnit(alias)))
  );
  return exactSiteTitle ? text : "";
}

function extractSectionFromTitle(title) {
  return title
    .replace("สรุปงานปรับปรุง-พัฒนา", "")
    .replace("สรุปงานปรับปรุง", "")
    .replace("สรุปงานปี 2569", "")
    .replace("สรุปงาน", "")
    .trim();
}

function clean(value) {
  return String(value ?? "").trim();
}

function firstText(row = []) {
  return row.find((value) => clean(value))?.trim() || "";
}

function toNumber(value) {
  const cleaned = clean(value).replace(/,/g, "");
  if (!cleaned || cleaned === "#REF!") return 0;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function toProgress(value) {
  const cleaned = clean(value).replace("%", "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  if (!Number.isFinite(number)) return null;
  return number > 1 ? number / 100 : number;
}

function isBudgetCode(value) {
  return /^1[A-Z]\d{2}$/i.test(value);
}

function extractCode(value) {
  return value.match(/\(([^)]+)\)/)?.[1] || "";
}

function isMonth(value) {
  return /^(ม\.ค|ก\.พ|มี\.ค|เม\.ย|พ\.ค|มิ\.ย|ก\.ค|ส\.ค|ก\.ย|ต\.ค|พ\.ย|ธ\.ค)/.test(value);
}

function isLikelyOwner(value) {
  return ["ฟิล์ม", "กล้า", "มอส"].includes(value);
}

function normalizeOwnerDisplayName(value) {
  const name = clean(value);
  return ownerDisplayAliases.get(name) || name;
}

function personLabelFromTab(tab) {
  return clean(tab).replace(/^สรุปงาน\s*/, "") || clean(tab);
}

function unique(values) {
  return [...new Set(values)];
}

function sum(items, key) {
  return items.reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

function groupSum(items, getName) {
  const map = new Map();
  items.forEach((item) => {
    const name = getName(item) || "ไม่ระบุ";
    map.set(name, (map.get(name) || 0) + item.budget);
  });
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

function groupPersonRealizedBudget(tasks, countTasks = tasks) {
  const countMap = new Map();
  countTasks.forEach((task) => {
    const tab = clean(task.sourceTab);
    const name = clean(task.owner) || personLabelFromTab(tab) || "\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38";
    const key = tab || name;
    countMap.set(key, (countMap.get(key) || 0) + 1);
  });

  const map = new Map();
  tasks.forEach((task) => {
    const tab = clean(task.sourceTab);
    const name = clean(task.owner) || personLabelFromTab(tab) || "ไม่ระบุ";
    const key = tab || name;
    const current =
      map.get(key) || {
        name,
        count: 0,
        value: 0,
      filter: tab ? "personSheet" : "owner",
      filterValue: tab || name,
      color: chartPersonColor(name)
      };
    current.value += task.budget;
    current.count = countMap.get(key) || current.count + 1;
    map.set(key, current);
  });
  return [...map.values()]
    .map((item) => ({
      ...item,
      displayName: `${item.name} (${numberFormatter.format(item.count)} งาน)`
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

function groupTaskSummary(tasks, getName) {
  const map = new Map();
  tasks.forEach((task) => {
    const name = getName(task) || "ไม่ระบุ";
    const current =
      map.get(name) || {
        name,
        count: 0,
        activeCount: 0,
        doneCount: 0,
        budget: 0,
        progressTotal: 0
      };
    current.count += 1;
    current.budget += task.budget;
    current.progressTotal += task.averageProgress;
    if (task.statusKey === "done") current.doneCount += 1;
    if (isWatchableTask(task)) current.activeCount += 1;
    map.set(name, current);
  });

  return [...map.values()]
    .map((item) => ({
      ...item,
      averageProgress: ratio(item.progressTotal, item.count)
    }))
    .sort((a, b) => b.budget - a.budget || b.activeCount - a.activeCount);
}

function averageProgressStage(tasks, key) {
  const values = tasks
    .map((task) => task.progress?.[key])
    .filter((value) => value !== null && value !== undefined);
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function buildStatusDonutStyle(statusRows) {
  const total = statusRows.reduce((sum, item) => sum + item.rows.length, 0);
  if (!total) return "background: #e5ecea;";

  let cursor = 0;
  const segments = statusRows
    .map((item) => {
      const next = cursor + ratio(item.rows.length, total) * 100;
      const segment = `${statusColor(item.key)} ${cursor}% ${next}%`;
      cursor = next;
      return segment;
    })
    .join(", ");
  return `background: conic-gradient(${segments});`;
}

function buildBudgetCodeDonutStyle(rows) {
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  if (!total) return "background: #e5ecea;";

  let cursor = 0;
  const segments = rows
    .map((item, index) => {
      const next = cursor + ratio(item.value, total) * 100;
      const segment = `${chartCodeColor(item.name, index)} ${cursor}% ${next}%`;
      cursor = next;
      return segment;
    })
    .join(", ");
  return `background: conic-gradient(${segments});`;
}

function buildPersonDonutStyle(rows) {
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  if (!total) return "background: #e5ecea;";

  let cursor = 0;
  const segments = rows
    .map((item, index) => {
      const next = cursor + ratio(item.value, total) * 100;
      const segment = `${item.color || chartPersonColor(item.name, index)} ${cursor}% ${next}%`;
      cursor = next;
      return segment;
    })
    .join(", ");
  return `background: conic-gradient(${segments});`;
}

function statusColor(key) {
  return chartPalette.status[key]?.solid || chartPalette.status.blank.solid;
}

function statusGradient(key) {
  return chartPalette.status[key]?.gradient || chartPalette.status.blank.gradient;
}

function stageColor(key, index = 0) {
  return chartPalette.stage[stagePaletteIndex(key, index)].solid;
}

function stageGradient(key, index = 0) {
  return chartPalette.stage[stagePaletteIndex(key, index)].gradient;
}

function stagePaletteIndex(key, index = 0) {
  const optionIndex = progressStageOptions.findIndex(([stageKey]) => stageKey === key);
  return (optionIndex >= 0 ? optionIndex : index) % chartPalette.stage.length;
}

function stageLabel(key) {
  const labels = {
    bid: "Bid ยังไม่ครบ",
    pr: "PR ยังไม่ครบ",
    po: "PO ยังไม่ครบ",
    con: "Con ยังไม่ครบ"
  };
  return labels[key] || key;
}

function issueLabel(key) {
  const labels = {
    "missing-code": "มีงบแต่ไม่มีรหัสงบ",
    "missing-owner": "ไม่มีผู้รับผิดชอบ",
    "missing-status": "ไม่มีสถานะ",
    "active-no-budget": "งานยังไม่จบแต่ไม่มีงบ",
    "stopped-with-budget": "หยุดดำเนินการแต่ยังมีงบ",
    "high-active-budget": "งานงบสูงยังไม่จบ"
  };
  return labels[key] || key;
}

function highBudgetThreshold(tasks = state.tasks) {
  const budgets = tasks
    .filter((task) => isWatchableTask(task) && task.budget > 0)
    .map((task) => task.budget)
    .sort((a, b) => a - b);
  if (!budgets.length) return 300000;
  const percentile = budgets[Math.floor(budgets.length * 0.75)] || budgets[budgets.length - 1];
  return Math.max(300000, percentile);
}

function ratio(value, total) {
  return total ? value / total : 0;
}

function formatMoney(value) {
  return moneyFormatter.format(value || 0);
}

function formatCompactMoney(value) {
  if (value >= 1_000_000) return `${numberFormatter.format(value / 1_000_000)}M`;
  if (value >= 1_000) return `${numberFormatter.format(value / 1_000)}K`;
  return numberFormatter.format(value || 0);
}

function formatPercent(value) {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value * 100)}%`;
}

function codeColor(name, index) {
  const colors = ["#008f91", "#365dde", "#c67f1e", "#267f52", "#bf4355", "#7545df", "#159fb9", "#c945ad"];
  if (name.includes("1C01")) return "#c67f1e";
  if (name.includes("1C02")) return "#008f91";
  if (name.includes("1B02")) return "#365dde";
  if (name.includes("1B03")) return "#267f52";
  return colors[index % colors.length];
}

function personColor(name, index = 0) {
  const value = clean(name);
  if (value.includes("กล้า")) return "#00a6a6";
  if (value.includes("ฟิล์ม")) return "#4a72f5";
  if (value.includes("มอส")) return "#8a5cf6";
  const colors = ["#00a6a6", "#4a72f5", "#8a5cf6", "#e09a2d", "#2f9d62"];
  return colors[index % colors.length];
}

function codePalette(name, index = 0) {
  const value = clean(name).toUpperCase();
  if (value === clean(realizedBudgetCodeBuckets[0]).toUpperCase()) {
    return { solid: "#64748b", gradient: "linear-gradient(90deg, #cbd5e1 0%, #64748b 52%, #334155 100%)" };
  }
  if (value.includes("1C01")) return chartPalette.codeFallbacks[2];
  if (value.includes("1C02")) return chartPalette.codeFallbacks[0];
  if (value.includes("1B02")) return chartPalette.codeFallbacks[1];
  if (value.includes("1B03")) return chartPalette.codeFallbacks[3];
  return chartPalette.codeFallbacks[index % chartPalette.codeFallbacks.length];
}

function codeGradient(name, index) {
  return codePalette(name, index).gradient;
}

function chartCodeColor(name, index) {
  return codePalette(name, index).solid;
}

function sourcePalette(name, index = 0) {
  const siteLabel = budgetSiteLabelFromValue(name);
  const siteIndex = budgetSiteOrder.findIndex((site) => site.label === siteLabel);
  const paletteIndex = siteIndex >= 0 ? siteIndex : index;
  return chartPalette.site[paletteIndex % chartPalette.site.length];
}

function sourceGradient(name, index = 0) {
  return sourcePalette(name, index).gradient;
}

function sourceColor(name, index = 0) {
  return sourcePalette(name, index).solid;
}

function personPalette(name, index = 0) {
  const value = clean(name);
  if (writeOwnerOptions[0] && value.includes(writeOwnerOptions[0])) return chartPalette.owner.film;
  if (writeOwnerOptions[1] && value.includes(writeOwnerOptions[1])) return chartPalette.owner.kla;
  if (writeOwnerOptions[2] && value.includes(writeOwnerOptions[2])) return chartPalette.owner.mos;
  const fallback = [chartPalette.owner.kla, chartPalette.owner.film, chartPalette.owner.mos, chartPalette.owner.fallback];
  return fallback[index % fallback.length];
}

function personGradient(name, index = 0) {
  return personPalette(name, index).gradient;
}

function chartPersonColor(name, index = 0) {
  return personPalette(name, index).solid;
}

function csvCell(value) {
  const text = clean(value).replace(/"/g, '""');
  return `"${text}"`;
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setLoading(isLoading) {
  els.loadingPanel.classList.toggle("hidden", !isLoading);
  els.dashboard.classList.toggle("hidden", isLoading);
  els.errorPanel.classList.add("hidden");
  els.refreshButton.disabled = isLoading;
  els.exportCsvButton.disabled = isLoading;
  els.printPdfButton.disabled = isLoading;
  els.refreshButton.classList.toggle("spinning", isLoading);
  if (isLoading) {
    els.sourceStamp.textContent = "กำลัง sync จาก Google Sheet แบบ read-only...";
  }
}

function showError(error) {
  els.loadingPanel.classList.add("hidden");
  els.dashboard.classList.add("hidden");
  els.errorPanel.classList.remove("hidden");
  els.refreshButton.disabled = false;
  els.exportCsvButton.disabled = false;
  els.printPdfButton.disabled = false;
  els.refreshButton.classList.remove("spinning");
  els.errorText.textContent = `${error.message}. ตรวจสอบสิทธิ์การเปิดอ่านลิงก์ Google Sheet หรือการเชื่อมต่ออินเทอร์เน็ต`;
}
