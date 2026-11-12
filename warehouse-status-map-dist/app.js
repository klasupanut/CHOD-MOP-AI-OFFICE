const statusConfig = {
  Available: { color: "#2fffc7", text: "#041611" },
  Occupied: { color: "#ff6f86", text: "#19050a" },
  "Under Construction": { color: "#ffd166", text: "#171004" }
};

const fallbackStatusConfig = { color: "#94a3b8", text: "#041015" };
const operations = window.WarehouseOperations;

const blockColors = {
  A: "#ff6f86",
  B: "#35d8ff",
  C: "#ffd166",
  D: "#2fffc7",
  E: "#a78bfa",
  F: "#ff9f1c",
  G: "#f472b6",
  H: "#38bdf8",
  I: "#84cc16",
  J: "#0f8f5f",
  AA: "#35d8ff",
  AB: "#ffd166",
  SR: "#77d8ff",
  UNIT: "#c770ff"
};

const MAP_WIDTH = 2048;
const MAP_HEIGHT = 1376;
const PROJECT_CHOD1 = "Factory&Warehouse Chodthanawat 1";
const PROJECT_CHOD2 = "Factory&Warehouse Chodthanawat 2";
const PROJECT_CHOD3 = "Factory&Warehouse Chodthanawat 3";
const PROJECT_CHOD5 = "Factory&Warehouse Chodthanawat 5";
const PROJECT_CHAENGWATTANA = "CHODBIZ CHAENGWATTANA";
const PROJECT_KM8_P1 = "CHOD BIZ BANGNA KM.8 P.1";
const PROJECT_KM8_P2 = "CHOD BIZ BANGNA KM.8 P.2";
const PROJECT_PTS4 = "CHODBIZ PUTTHAMONTHON SAI 4";
const embeddedSiteImages = window.warehouseSiteImages || {};
const projectImageAssets = Object.freeze({
  [PROJECT_CHAENGWATTANA]: embeddedSiteImages.chaengwattana || "",
  [PROJECT_CHOD1]: embeddedSiteImages.chod1 || "",
  [PROJECT_CHOD2]: embeddedSiteImages.chod2 || "",
  [PROJECT_CHOD3]: embeddedSiteImages.chod3 || "",
  [PROJECT_CHOD5]: embeddedSiteImages.rayong || "",
  [PROJECT_PTS4]: embeddedSiteImages.sai4 || "",
  [PROJECT_KM8_P1]: embeddedSiteImages.km8P1 || "",
  [PROJECT_KM8_P2]: embeddedSiteImages.km8P2 || ""
});
const MAP_ZOOM_MIN = 1;
const MAP_ZOOM_MAX = 3;
const MAP_ZOOM_STEP = 0.35;
const PNG_EXPORT_WIDTH = 1920;
const PNG_EXPORT_HEIGHT = 1080;
const PROJECT_NAME = PROJECT_CHOD2;
const DEFAULT_GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1I5Z_MjvqTZlkb7NJJMieP0_SKcNmervyP7w_KCHRpac/edit";
const RENOVATION_STATUS_API = "/api/renovation/status";
const SHEET_URL_STORAGE_KEY = "warehouseDashboard.googleSheetUrl";
const SHEET_SYNC_TIMEOUT_MS = 25000;
const PROJECT_SHEETS = [
  PROJECT_CHOD1,
  PROJECT_CHOD2,
  PROJECT_CHOD3,
  PROJECT_CHOD5,
  PROJECT_CHAENGWATTANA,
  PROJECT_KM8_P1,
  PROJECT_KM8_P2,
  PROJECT_PTS4
];
let projectSheets = [...PROJECT_SHEETS];
const UNIT_OFFSET_X = -38;
const UNIT_OFFSET_Y = 10;
const UNIT_BOX_SCALE = 0.74;
const DEFAULT_VIEW_PADDING = 45;
const VISIBLE_VIEW_PADDING = 42;
const cadUnits = window.cadUnits || [];
const chod2UnitPolygons = window.chod2UnitPolygons || [];
const chod2PlanViewBox = window.CHOD2_PLAN_VIEWBOX || { width: MAP_WIDTH, height: MAP_HEIGHT };
const chod2PlanDebugLines = window.chod2PlanDebugLines || [];
const CHOD2_DEBUG_MODE = new URLSearchParams(window.location.search).has("chod2Debug");
const rama2Units = window.rama2Units || [];
const km1Units = window.km1Units || [];
const chod5Units = window.chod5Units || [];
const chaengwattanaUnits = window.chaengwattanaUnits || [];
const km8P1Units = window.km8P1Units || [];
const km8P1PlanViewBox = window.KM8P1_PLAN_VIEWBOX || { width: 842, height: 1191 };
const pts4UnitPolygons = window.pts4UnitPolygons || [];
const pts4PlanViewBox = window.PTS4_PLAN_VIEWBOX || { width: 1684, height: 2384 };

const sampleUnits = cadUnits.map(({ unitId, block, area }) => [
  unitId,
  PROJECT_NAME,
  block,
  unitId,
  "Factory/Warehouse",
  area,
  0,
  "",
  "Available",
  "",
  "",
  "",
  "",
  "Sales",
  "Extracted from Master Plan KM.16 image; overlay position is approximate"
]).map(([unitId, project, block, unitNo, unitType, warehouseArea, officeArea, loadCapacity, status, customer, transferDate, contractTermYears, contractEndDate, owner, remark]) => ({
  unitId,
  project,
  phase: block,
  block,
  unitNo,
  unitType,
  warehouseArea: Number(warehouseArea),
  officeArea: Number(officeArea),
  loadCapacity: parseOptionalNumber(loadCapacity),
  area: Number(warehouseArea),
  status,
  customer,
  transferDate,
  contractTermYears: Number(contractTermYears || 0),
  contractEndDate,
  owner,
  remark
}));

const rama2SampleUnits = rama2Units.map(({ unitId, unitNo, block, area }) => ({
  unitId,
  project: PROJECT_CHOD3,
  phase: block,
  block,
  unitNo: unitNo || unitId,
  unitType: "Factory/Warehouse",
  warehouseArea: Number(area || 0),
  officeArea: 0,
  loadCapacity: null,
  area: Number(area || 0),
  status: "Available",
  customer: "",
  transferDate: "",
  contractTermYears: 0,
  contractEndDate: "",
  owner: "Sales",
  remark: "Extracted from Rama II layout plan PDF; overlay position is approximate"
}));

const km1SampleUnits = km1Units.map(({ unitId, unitNo, block, area }) => ({
  unitId,
  project: PROJECT_CHOD1,
  phase: block,
  block,
  unitNo: unitNo || unitId,
  unitType: "Factory/Warehouse",
  warehouseArea: Number(area || 0),
  officeArea: 0,
  loadCapacity: null,
  area: Number(area || 0),
  status: "Available",
  customer: "",
  transferDate: "",
  contractTermYears: 0,
  contractEndDate: "",
  owner: "Sales",
  remark: "Extracted from KM1 layout plan PDF; overlay position is approximate"
}));

const chod5SampleUnits = chod5Units.map(({ unitId, unitNo, block, area }) => ({
  unitId,
  project: PROJECT_CHOD5,
  phase: block,
  block,
  unitNo: unitNo || unitId,
  unitType: "Factory/Warehouse",
  warehouseArea: Number(area || 0),
  officeArea: 0,
  loadCapacity: null,
  area: Number(area || 0),
  status: "Available",
  customer: "",
  transferDate: "",
  contractTermYears: 0,
  contractEndDate: "",
  owner: "Sales",
  remark: "Extracted from Chodthanawat 5 layout plan PDF; overlay position is approximate"
}));

const chaengwattanaSampleUnits = chaengwattanaUnits.map(({ unitId, unitNo, block, area }) => ({
  unitId,
  project: PROJECT_CHAENGWATTANA,
  phase: block,
  block,
  unitNo: unitNo || unitId,
  unitType: "Factory/Warehouse",
  warehouseArea: Number(area || 0),
  officeArea: 0,
  loadCapacity: null,
  area: Number(area || 0),
  status: "Available",
  customer: "",
  transferDate: "",
  contractTermYears: 0,
  contractEndDate: "",
  owner: "Sales",
  remark: "Extracted from CHODBIZ Chaengwattana layout plan PDF; overlay position is approximate"
}));

const km8P1SampleUnits = km8P1Units.map(({ unitId, unitNo, block, area }) => ({
  unitId,
  project: PROJECT_KM8_P1,
  phase: block,
  block,
  unitNo: unitNo || unitId,
  unitType: "Factory/Warehouse",
  warehouseArea: Number(area || 0),
  officeArea: 0,
  loadCapacity: null,
  area: Number(area || 0),
  status: "Available",
  customer: "",
  transferDate: "",
  contractTermYears: 0,
  contractEndDate: "",
  owner: "Sales",
  remark: "Generated from CHOD BIZ Bangna KM.8 Phase 1 layout plan PDF; first-pass overlay"
}));

const pts4SampleUnits = pts4UnitPolygons.map(({ unitId, unitNo, block, area }) => ({
  unitId,
  project: PROJECT_PTS4,
  phase: block,
  block,
  unitNo: unitNo || unitId,
  unitType: "Factory/Warehouse",
  warehouseArea: Number(area || 0),
  officeArea: 0,
  loadCapacity: null,
  area: Number(area || 0),
  status: "Available",
  customer: "",
  transferDate: "",
  contractTermYears: 0,
  contractEndDate: "",
  owner: "Sales",
  remark: "Generated from Putthamonthon Sai 4 layout plan PDF; first-pass overlay"
}));

const cadUnitById = new Map(cadUnits.map((unit) => [unit.unitId, unit]));
let layoutUnits = cadUnits.map(({ unitId, block, x, y, width, height, rotate, cadX, cadY, cadZ }) => {
  const adjust = getUnitLayoutAdjustments(unitId);
  const scaledWidth = width * adjust.scale;
  const scaledHeight = height * adjust.scale * (adjust.heightScale || 1);
  return {
    unitId,
    block,
    x: x + UNIT_OFFSET_X + adjust.x + (width - scaledWidth) / 2,
    y: y + UNIT_OFFSET_Y + adjust.y + (height - scaledHeight) / 2,
    width: scaledWidth,
    height: scaledHeight,
    rotate,
    cadX,
    cadY,
    cadZ
  };
});
layoutUnits = resolveUnitCollisions(layoutUnits, new Set(["A", "B", "D", "E", "G", "J"]));
const projectPlanConfigs = {
  [PROJECT_CHOD1]: {
    units: km1Units,
    useCentroidLabels: true,
    mapWidth: 1190.52,
    mapHeight: 841.92,
    defaultPadding: 34,
    visiblePadding: 18,
    compactBlocks: new Set(["SR"]),
    rotation: "counterClockwise90",
    layerTransform: "matrix(0 -1 1 0 0 841.92)",
    image: {
      href: "./assets/master-plans/chod1-masterplan-sharp.png?v=20261022-1",
      x: 0,
      y: 0,
      width: 841.92,
      height: 1190.52,
      preserveAspectRatio: "xMinYMin meet",
      transform: "matrix(0 -1 1 0 0 841.92)"
    }
  },
  [PROJECT_CHOD2]: {
    units: chod2UnitPolygons.length ? chod2UnitPolygons : layoutUnits,
    mapWidth: chod2PlanViewBox.width,
    mapHeight: chod2PlanViewBox.height,
    defaultPadding: 22,
    defaultFitScale: 0.92,
    defaultOffsetX: 63,
    visiblePadding: VISIBLE_VIEW_PADDING,
    compactBlocks: new Set(["G", "J"]),
    useCentroidLabels: true,
    debugLines: chod2PlanDebugLines,
    image: {
      href: "./assets/master-plans/chod2-masterplan-sharp.png?v=20261022-1",
      x: 0,
      y: 0,
      width: chod2PlanViewBox.width,
      height: chod2PlanViewBox.height,
      preserveAspectRatio: "xMinYMin meet",
      transform: ""
    }
  },
  [PROJECT_CHOD3]: {
    units: rama2Units,
    useCentroidLabels: true,
    mapWidth: 770.28,
    mapHeight: 824.88,
    defaultPadding: 28,
    visiblePadding: 18,
    compactBlocks: new Set(["F", "G"]),
    rotation: "clockwise90MirrorX",
    layerTransform: "matrix(0 -1 -1 0 770.28 824.88)",
    image: {
      href: "./assets/master-plans/chod3-masterplan-aerial-v1.webp?v=20261112-1",
      x: 0,
      y: 0,
      width: 770.28,
      height: 824.88,
      preserveAspectRatio: "none",
      transform: ""
    }
  },
  [PROJECT_CHOD5]: {
    units: chod5Units,
    useCentroidLabels: true,
    mapWidth: 1190.52002,
    mapHeight: 841.92004,
    defaultPadding: 36,
    visiblePadding: 22,
    compactBlocks: new Set(["AA", "AB"]),
    rotation: "clockwise90",
    layerTransform: "matrix(0 1 -1 0 1190.52002 0)",
    image: {
      href: "./assets/master-plans/chod5-masterplan-aerial-v2.webp?v=20261112-1",
      x: 0,
      y: 0,
      width: 1190.52002,
      height: 841.92004,
      preserveAspectRatio: "none",
      transform: ""
    }
  },
  [PROJECT_CHAENGWATTANA]: {
    units: chaengwattanaUnits,
    mapWidth: 1683.71997,
    mapHeight: 1190.52002,
    defaultPadding: 30,
    defaultFillViewport: true,
    defaultFitScale: 0.98,
    visiblePadding: 16,
    compactBlocks: new Set(["A", "B", "C", "D", "E", "H", "K"]),
    planClass: "chaengwattana",
    useCentroidLabels: true,
    rotation: "counterClockwise90",
    layerTransform: "matrix(0 -1 1 0 0 1190.52002)",
    image: {
      href: "./assets/master-plans/chaengwattana-masterplan-sharp.png?v=20261022-1",
      x: 0,
      y: 0,
      width: 1190.52002,
      height: 1683.71997,
      preserveAspectRatio: "xMinYMin meet",
      transform: "matrix(0 -1 1 0 0 1190.52002)"
    }
  },
  [PROJECT_KM8_P1]: {
    units: km8P1Units,
    mapWidth: km8P1PlanViewBox.height,
    mapHeight: km8P1PlanViewBox.width,
    defaultPadding: 30,
    defaultFitScale: 0.96,
    visiblePadding: 18,
    compactBlocks: new Set(["AA", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]),
    useCentroidLabels: true,
    planClass: "km8-p1",
    rotation: "counterClockwise90",
    layerTransform: "matrix(0 -1 1 0 0 842)",
    image: {
      href: "./assets/master-plans/km8-masterplan-sharp.png?v=20261022-1",
      x: 0,
      y: 0,
      width: km8P1PlanViewBox.width,
      height: km8P1PlanViewBox.height,
      preserveAspectRatio: "xMinYMin meet",
      transform: "matrix(0 -1 1 0 0 842)"
    }
  },
  [PROJECT_PTS4]: {
    units: pts4UnitPolygons,
    mapWidth: pts4PlanViewBox.height,
    mapHeight: pts4PlanViewBox.width,
    defaultPadding: 34,
    defaultFitScale: 0.96,
    visiblePadding: 22,
    compactBlocks: new Set(["A", "B", "C", "D", "E"]),
    useCentroidLabels: true,
    planClass: "putthamonthon-sai4",
    rotation: "counterClockwise90",
    layerTransform: "matrix(0 -1 1 0 0 1684)",
    image: {
      href: "./assets/master-plans/sai4-masterplan-sharp.png?v=20261022-1",
      x: 0,
      y: 0,
      width: pts4PlanViewBox.width,
      height: pts4PlanViewBox.height,
      preserveAspectRatio: "xMinYMin meet",
      transform: "matrix(0 -1 1 0 0 1684)"
    }
  }
};

let unitRows = [...km1SampleUnits, ...sampleUnits, ...rama2SampleUnits, ...chod5SampleUnits, ...chaengwattanaSampleUnits, ...km8P1SampleUnits, ...pts4SampleUnits];
let filteredRows = [...unitRows];
let syncedUnitRows = [];
let selectedUnitId = null;
let mapZoomMode = "all";
let mapZoomLevel = 1;
let mapDragState = null;
let mapSuppressClick = false;
let mapResizeFrame = null;
let activeCategoryId = "slab";
let officeNodes = new Map();
let selectedOfficeNode = null;
let unitNodes = new Map();
let selectedShapeNode = null;
let selectedShapeParent = null;
let renovationWriteConfig = {
  state: "loading",
  enabled: false,
  projects: [],
  operations: {},
  reason: "Checking live write access..."
};
let renovationWritePending = false;
let renovationWriteFeedback = null;
let sheetSyncPromise = null;
let viewportFitFrame = null;
let sheetSyncState = "idle";
let sheetSyncError = "";
let selectedPortfolioProjectKey = "";
let portfolioMap = null;
let portfolioMapMarkers = [];
let portfolioMapProjects = [];
// TODO: wire this to MAP_STYLE_URL / build-time env config when a private CHOD map style is provided.
const PORTFOLIO_MAP_STYLE_URL = typeof window !== "undefined" && window.CHOD_MAP_STYLE_URL
  ? window.CHOD_MAP_STYLE_URL
  : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const PORTFOLIO_MAP_FIT_PADDING = { top: 164, right: 220, bottom: 82, left: 220 };
const PORTFOLIO_MAP_MAX_OVERVIEW_ZOOM = 10.45;
const PORTFOLIO_MAP_OVERVIEW_ZOOM_DELTA = 0.04;
const PORTFOLIO_MAP_OVERVIEW_OFFSET = [0, -2];
const PORTFOLIO_LOCATION_FALLBACKS = [
  { keys: ["chodbizchaengwattana", "chaengwattana"], label: "Chaeng Watthana", mapLabel: "CHAENGWATTANA", lat: 13.89415906975707, lng: 100.54282928585633, calloutX: -206, calloutY: -92 },
  { keys: ["chodthanawat1", "chod1", "bangnakm1", "km1"], label: "Bangna KM.1", mapLabel: "BANGNA KM.1", lat: 13.671579000490906, lng: 100.61870429443513, calloutX: 178, calloutY: -104 },
  { keys: ["chodbizbangnakm8p1", "bangnakm8p1", "km8p1", "chodbizbangnakm8phase1"], label: "Bangna KM.8 P.1", mapLabel: "BANGNA KM.8 P.1", lat: 13.661873691878476, lng: 100.68123358554635, calloutX: 178, calloutY: -8 },
  { keys: ["chodbizbangnakm8p2", "bangnakm8p2", "km8p2", "chodbizbangnakm8phase2"], label: "Bangna KM.8 P.2", mapLabel: "BANGNA KM.8 P.2", lat: 13.665976563671506, lng: 100.68284513843174, calloutX: 178, calloutY: 72 },
  { keys: ["chodthanawat2", "chod2", "bangnakm16", "km16"], label: "Bangna KM.16", mapLabel: "BANGNA KM.16", lat: 13.624152219204376, lng: 100.74786439758927, calloutX: 178, calloutY: 104 },
  { keys: ["chodthanawat3", "chod3", "rama2"], label: "Rama 2", mapLabel: "RAMA 2 KM.25", lat: 13.569915549166332, lng: 100.29165774613207, calloutX: -206, calloutY: 104 },
  { keys: ["chodbizphuttamonthonsai4", "phuttamonthonsai4", "phuttamontonsai4", "chodbizputthamonthonsai4", "putthamonthonsai4", "putthamontonsai4", "sai4"], label: "Phutthamonthon Sai 4", mapLabel: "PHUTTHAMONTHON SAI 4", lat: 13.739003034109423, lng: 100.3296901842456, calloutX: -206, calloutY: -92 },
  { keys: ["chodthanawat5", "chod5", "rayong"], label: "Rayong", mapLabel: "RAYONG", lat: 13.078574786181527, lng: 101.18158340446243, calloutX: -196, calloutY: -104 }
];

const els = {
  sheetUrlInput: document.querySelector("#sheetUrlInput"),
  connectSheetBtn: document.querySelector("#connectSheetBtn"),
  dataStatus: document.querySelector("#dataStatus"),
  dataSourcePanel: document.querySelector(".sidebar .data-source-panel"),
  controlTitle: document.querySelector("#controlTitle"),
  projectTitle: document.querySelector("#projectTitle"),
  projectSubtitle: document.querySelector("#projectSubtitle"),
  projectFilter: document.querySelector("#projectFilter"),
  phaseFilter: document.querySelector("#phaseFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  clearFiltersBtn: document.querySelector("#clearFiltersBtn"),
  operationCategories: document.querySelector("#operationCategories"),
  operationDetails: document.querySelector("#operationDetails"),
  operationEmptyState: document.querySelector("#operationEmptyState"),
  detailCategory: document.querySelector("#detailCategory"),
  legend: document.querySelector("#legend"),
  unitLayer: document.querySelector("#unitLayer"),
  unitLabelLayer: document.querySelector("#unitLabelLayer"),
  unitOfficeLayer: document.querySelector("#unitOfficeLayer"),
  unitWorkLayer: document.querySelector("#unitWorkLayer"),
  unitTable: document.querySelector("#unitTable"),
  refreshRegisterBtn: document.querySelector("#refreshRegisterBtn"),
  exportCsvBtn: document.querySelector("#exportCsvBtn"),
  exportPngBtn: document.querySelector("#exportPngBtn"),
  visibleCount: document.querySelector("#visibleCount"),
  fitVisibleBtn: document.querySelector("#fitVisibleBtn"),
  zoomInBtn: document.querySelector("#zoomInBtn"),
  zoomOutBtn: document.querySelector("#zoomOutBtn"),
  mappingIssues: document.querySelector("#mappingIssues"),
  mapCard: document.querySelector(".map-card"),
  rightRail: document.querySelector(".right-rail"),
  mapViewport: document.querySelector(".map-viewport"),
  unitMap: document.querySelector("#unitMap"),
  masterPlanImage: document.querySelector("#masterPlanImage"),
  allProjectDashboard: document.querySelector("#allProjectDashboard"),
  projectPlanPending: document.querySelector("#projectPlanPending"),
  detailCard: document.querySelector("#detailCard"),
  renovationEditor: document.querySelector("#renovationEditor"),
  renovationEditorTitle: document.querySelector("#renovationEditorTitle"),
  renovationFields: document.querySelector("#renovationFields"),
  saveRenovationBtn: document.querySelector("#saveRenovationBtn"),
  renovationWriteMessage: document.querySelector("#renovationWriteMessage"),
  occupancyRate: document.querySelector("#occupancyRate"),
  totalUnits: document.querySelector("#totalUnits"),
  availableUnits: document.querySelector("#availableUnits"),
  soldUnits: document.querySelector("#soldUnits"),
  readyUnits: document.querySelector("#readyUnits"),
  lastUpdated: document.querySelector("#lastUpdated"),
  detailTitle: document.querySelector("#detailTitle"),
  detailStatus: document.querySelector("#detailStatus"),
  detailPhase: document.querySelector("#detailPhase"),
  detailArea: document.querySelector("#detailArea"),
  detailOfficeArea: document.querySelector("#detailOfficeArea"),
  detailLoadCapacity: document.querySelector("#detailLoadCapacity"),
  detailCustomer: document.querySelector("#detailCustomer"),
  detailTransfer: document.querySelector("#detailTransfer"),
  detailContractTerm: document.querySelector("#detailContractTerm"),
  detailContractEnd: document.querySelector("#detailContractEnd")
};

function getUnitLayoutAdjustments(unitId) {
  const match = unitId.match(/^([A-Z]+)(\d+)/);
  const block = match?.[1] || unitId.charAt(0);
  const number = Number(match?.[2] || 0);
  const adjust = { x: 0, y: 0, scale: UNIT_BOX_SCALE };

  if (["A", "B", "D", "E"].includes(block)) adjust.scale = 0.82;
  if (block === "G" || block === "J") adjust.scale = 0.56;
  if (block === "A" && number >= 1 && number <= 5) Object.assign(adjust, { x: -18, y: -5 });
  if (block === "C" && number >= 1 && number <= 4) Object.assign(adjust, { x: -13, y: -4 });
  if (block === "D" && number >= 1 && number <= 3) Object.assign(adjust, { x: -18, y: -6 });
  if (block === "F" && number >= 1 && number <= 4) Object.assign(adjust, { x: -13, y: -4 });
  if (block === "B" && number >= 1 && number <= 5) adjust.x -= 10;
  if (block === "I") adjust.y -= 5;
  if (block === "H" && number >= 6 && number <= 10) adjust.heightScale = 1.08;
  if (["B", "C", "E", "F", "I", "G", "J"].includes(block) || (block === "H" && number >= 5 && number <= 10)) {
    adjust.x -= 5;
  }

  return adjust;
}

function resolveUnitCollisions(units, targetBlocks) {
  const resolved = units.map((unit) => ({ ...unit }));
  for (let iteration = 0; iteration < 20; iteration += 1) {
    let moved = 0;
    for (let index = 0; index < resolved.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < resolved.length; nextIndex += 1) {
        const current = resolved[index];
        const next = resolved[nextIndex];
        if (current.block !== next.block || !targetBlocks.has(current.block)) continue;
        const overlap = getMinimumTranslation(current, next);
        if (!overlap) continue;
        const push = (overlap.depth + 0.8) / 2;
        current.x -= overlap.axis.x * push;
        current.y -= overlap.axis.y * push;
        next.x += overlap.axis.x * push;
        next.y += overlap.axis.y * push;
        moved += 1;
      }
    }
    if (!moved) break;
  }
  return resolved;
}

function getMinimumTranslation(first, second) {
  const firstPolygon = getRotatedRect(first);
  const secondPolygon = getRotatedRect(second);
  let best = null;
  for (const axis of [...getAxes(firstPolygon), ...getAxes(secondPolygon)]) {
    const firstRange = projectPolygon(firstPolygon, axis);
    const secondRange = projectPolygon(secondPolygon, axis);
    const depth = Math.min(firstRange.max, secondRange.max) - Math.max(firstRange.min, secondRange.min);
    if (depth <= 0) return null;
    if (!best || depth < best.depth) best = { axis, depth };
  }
  const firstCenter = getUnitCenter(first);
  const secondCenter = getUnitCenter(second);
  const direction = (secondCenter.x - firstCenter.x) * best.axis.x + (secondCenter.y - firstCenter.y) * best.axis.y;
  if (direction < 0) best.axis = { x: -best.axis.x, y: -best.axis.y };
  return best;
}

function getRotatedRect(unit) {
  const center = getUnitCenter(unit);
  const radians = (unit.rotate || 0) * Math.PI / 180;
  return [
    [unit.x, unit.y],
    [unit.x + unit.width, unit.y],
    [unit.x + unit.width, unit.y + unit.height],
    [unit.x, unit.y + unit.height]
  ].map(([x, y]) => {
    const dx = x - center.x;
    const dy = y - center.y;
    return {
      x: center.x + dx * Math.cos(radians) - dy * Math.sin(radians),
      y: center.y + dx * Math.sin(radians) + dy * Math.cos(radians)
    };
  });
}

function getUnitCenter(unit) {
  return { x: unit.x + unit.width / 2, y: unit.y + unit.height / 2 };
}

function getAxes(polygon) {
  return polygon.map((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    const edgeX = next.x - point.x;
    const edgeY = next.y - point.y;
    const length = Math.hypot(edgeX, edgeY) || 1;
    return { x: -edgeY / length, y: edgeX / length };
  });
}

function projectPolygon(polygon, axis) {
  const values = polygon.map((point) => point.x * axis.x + point.y * axis.y);
  return { min: Math.min(...values), max: Math.max(...values) };
}

function render() {
  operations.prepareOptions(unitRows);
  els.projectTitle.textContent = PROJECT_NAME;
  renderOptions();
  applyFilters();
  renderLegend();
  updateClock();
}

function renderOptions() {
  const optionRows = sheetSyncState === "synced" ? syncedUnitRows : unitRows;
  const optionSheets = projectSheets;
  setOptions(els.projectFilter, uniquePreserveOrder([...optionSheets, ...optionRows.map((row) => row.project)]));
  updateCategoryFilterOptions();
  updateBlockFilterOptions();
}

function setOptions(select, options) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="all">All</option>${options.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
  select.value = options.includes(current) ? current : "all";
}

function getStatusVisual(status) {
  return statusConfig[status] || fallbackStatusConfig;
}

function getStatusStyle(status) {
  const visual = getStatusVisual(status);
  return `--status-color:${visual.color};--status-text:${visual.text};`;
}

function getActiveCategory() {
  return operations.categories.find((category) => category.id === activeCategoryId) || operations.categories[0];
}

function getOperationVisual(row) {
  return operations.visual(row, getActiveCategory());
}

function getOperationStyle(visual) {
  return `--status-color:${visual.color};--status-text:${visual.text};`;
}

function updateCategoryFilterOptions() {
  document.querySelector("#categoryFilterLabel").textContent = activeCategoryId === "slab" ? "Warehouse Floor Option" : getActiveCategory().fields[0].label;
  const values = operations.legend(getRowsForProjectFilter(els.projectFilter.value), getActiveCategory());
  const current = els.statusFilter.value;
  els.statusFilter.innerHTML = '<option value="all">All</option>' + values.map((item) =>
    `<option value="${escapeHtml(item.key)}">${escapeHtml(item.label)}</option>`).join("");
  els.statusFilter.value = values.some((item) => item.key === current) ? current : "all";
}

function renderCategoryMenu() {
  document.body.dataset.operation = activeCategoryId;
  els.operationCategories.innerHTML = operations.categories.map((category) =>
    `<button type="button" class="operation-category ${category.id === activeCategoryId ? "is-active" : ""}" data-category="${category.id}" aria-pressed="${category.id === activeCategoryId}" title="${category.name}"><i data-lucide="${category.icon}" aria-hidden="true"></i><span>${category.name}</span></button>`).join("");
  window.lucide?.createIcons({ attrs: { "stroke-width": 1.7 } });
}

function selectCategory(categoryId) {
  if (categoryId === activeCategoryId || !operations.categories.some((item) => item.id === categoryId)) return;
  activeCategoryId = categoryId;
  els.statusFilter.value = "all";
  renderCategoryMenu();
  applyFilters();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

function uniquePreserveOrder(values) {
  const seen = new Set();
  return values.filter((value) => {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function setDataStatus(message, isError = false) {
  els.dataStatus.textContent = message;
  els.dataStatus.classList.toggle("is-error", isError);
}

function mergePlannedFallbackRows(rows) {
  const planRows = rows.filter((row) => rowHasPlanUnit(row));
  const existingKeys = new Set(planRows.map(getProjectUnitKey));
  const fallbackRows = [...km1SampleUnits, ...sampleUnits, ...rama2SampleUnits, ...chod5SampleUnits, ...chaengwattanaSampleUnits, ...km8P1SampleUnits, ...pts4SampleUnits].filter((row) => !existingKeys.has(getProjectUnitKey(row)));
  return [...planRows, ...fallbackRows];
}

function rowHasPlanUnit(row) {
  const planConfig = getProjectPlanConfig(row.project);
  if (!planConfig) return true;
  const layoutIds = new Set(planConfig.units.flatMap((unit) => [getUnitLookupKey(unit.unitId), getUnitLookupKey(unit.unitNo)].filter(Boolean)));
  return getRowUnitKeys(row).some((key) => layoutIds.has(key));
}

function getUnitLookupKey(value) {
  return normalize(value).replace(/[^a-z0-9]/g, "");
}

function getRowUnitKeys(row) {
  return uniquePreserveOrder([row.unitId, row.unitNo].map(getUnitLookupKey).filter(Boolean));
}

function getProjectUnitKey(row) {
  return `${getProjectLookupKey(row.project)}|||${getUnitLookupKey(row.unitId || row.unitNo)}`;
}

function rowMatchesUnit(row, unitId) {
  const key = getUnitLookupKey(unitId);
  return Boolean(key && getRowUnitKeys(row).includes(key));
}

function getProjectLookupKey(projectName) {
  return getUnitLookupKey(getProjectPlanKey(projectName));
}

function rowMatchesProject(row, projectName) {
  return projectName === "all" || row.project === projectName || getProjectLookupKey(row.project) === getProjectLookupKey(projectName);
}

function getRowsForProjectFilter(projectName) {
  return projectName === "all" ? getAggregateSourceRows() : unitRows.filter((row) => rowMatchesProject(row, projectName));
}

function getAggregateSourceRows() {
  return syncedUnitRows;
}

function updateBlockFilterOptions(projectName = els.projectFilter.value) {
  setOptions(els.phaseFilter, unique(getRowsForProjectFilter(projectName).map((row) => row.block)));
}

function createProjectRowMap(projectName) {
  const map = new Map();
  unitRows
    .filter((row) => rowMatchesProject(row, projectName))
    .forEach((row) => {
      getRowUnitKeys(row).forEach((key) => {
        if (!map.has(key)) map.set(key, row);
      });
    });
  return map;
}

function applyFilters() {
  const project = els.projectFilter.value;
  updateBlockFilterOptions(project);
  updateCategoryFilterOptions();
  const block = els.phaseFilter.value;
  const status = els.statusFilter.value;
  els.projectTitle.textContent = project === "all"
    ? "Warehouse Portfolio Overview"
    : project;
  if (els.projectSubtitle) {
    els.projectSubtitle.hidden = false;
    els.projectSubtitle.textContent = getActiveCategory().name;
  }
  const sourceRows = getRowsForProjectFilter(project);

  filteredRows = sourceRows.filter((row) => {
    const matchesProject = rowMatchesProject(row, project);
    const matchesBlock = block === "all" || row.block === block;
    const matchesStatus = status === "all" || getOperationVisual(row).key === status;
    return matchesProject && matchesBlock && matchesStatus;
  });

  if (selectedUnitId && !filteredRows.some((row) => rowMatchesUnit(row, selectedUnitId))) {
    selectedUnitId = null;
  }

  renderMap();
  renderMetrics();
  renderLegend();
  renderTable();
  renderDetail();
  syncMasterPlanHeight();
}

function syncMasterPlanHeight() {
  if (!els.mapCard || !els.mapViewport || !els.dataSourcePanel) return;
  if (!window.matchMedia("(min-width: 1101px)").matches || els.dataSourcePanel.offsetParent === null) {
    els.mapCard.style.removeProperty("--map-card-height");
    els.mapViewport.style.removeProperty("--map-viewport-height");
    els.rightRail?.style.removeProperty("--right-rail-height");
    return;
  }

  if (viewportFitFrame) return;
  viewportFitFrame = requestAnimationFrame(() => {
    viewportFitFrame = null;
    const dataSourceBottom = els.dataSourcePanel.getBoundingClientRect().bottom;
    const mapCardTop = els.mapCard.getBoundingClientRect().top;
    const nextHeight = Math.max(260, Math.round(dataSourceBottom - mapCardTop));
    const rightRailTop = els.rightRail?.getBoundingClientRect().top ?? mapCardTop;
    const nextRailHeight = Math.max(260, Math.round(dataSourceBottom - rightRailTop));
    const currentHeight = Number.parseFloat(els.mapCard.style.getPropertyValue("--map-card-height")) || 0;

    if (Number.isFinite(nextHeight) && Math.abs(currentHeight - nextHeight) > 1) {
      els.mapCard.style.setProperty("--map-card-height", `${nextHeight}px`);
      els.mapViewport.style.removeProperty("--map-viewport-height");
      if (Number.isFinite(nextRailHeight)) {
        els.rightRail?.style.setProperty("--right-rail-height", `${nextRailHeight}px`);
      }
      if (!els.masterPlanImage.hidden) {
        requestAnimationFrame(() => fitMapToVisibleUnits());
      }
    }
  });
}

function scheduleMapResizeSync() {
  if (mapResizeFrame) return;
  mapResizeFrame = requestAnimationFrame(() => {
    mapResizeFrame = null;
    syncMasterPlanHeight();
    if (!els.masterPlanImage.hidden) fitMapToVisibleUnits();
    else portfolioMap?.resize();
  });
}

function renderLegend() {
  const category = getActiveCategory();
  const rows = getRowsForProjectFilter(els.projectFilter.value).filter((row) => els.phaseFilter.value === "all" || row.block === els.phaseFilter.value);
  els.legend.dataset.category = category.id;
  els.legend.innerHTML = operations.referenceLegend(rows, category).map((group) =>
    `<section class="floor-legend-section"><h4>${escapeHtml(group.title)}</h4>${group.items.map((visual) => {
      const kind = visual.kind || group.kind;
      const glyph = kind === "office" ? officeIconSvg()
        : kind === "plumbing" ? workIconSvg("Droplets")
        : kind === "step" && visual.symbols ? `<span class="step-legend-symbols">${Array.from({ length: visual.symbols }, () => workIconSvg("Badge")).join("")}</span>`
        : kind === "canopy" ? workIconSvg("Store") : '<i class="floor-swatch"></i>';
      const count = (sheetSyncState === "synced" || syncedUnitRows.length) ? formatNumber(visual.count || 0) : "-";
      const label = visual.optionLabel || visual.label;
      return `<div class="legend-item reference-legend-item ${visual.planned ? "is-planned" : ""}" style="${getOperationStyle(visual)}">${glyph}<span class="reference-legend-label" title="${escapeHtml(visual.label)}">${escapeHtml(label)}</span><b class="legend-count" aria-label="${count} units">${count}</b></div>`;
    }).join("")}${group.unclassified?.warehouse ? `<p class="legend-data-note">Status / option missing<br>Warehouse: ${formatNumber(group.unclassified.warehouse)}</p>` : ""}</section>`).join("");
}

function officeIconSvg() {
  return workIconSvg("Building2");
}

function workIconSvg(name) {
  const icon = window.lucide.createElement(window.lucide.icons[name]);
  icon.classList.add("office-floor-glyph");
  icon.setAttribute("width", "18");
  icon.setAttribute("height", "18");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("stroke-width", "1.8");
  return icon.outerHTML;
}

function ensureOfficeIconSymbol() {
  if (document.querySelector("#officeFloorSymbol")) return;
  const symbol = document.createElementNS("http://www.w3.org/2000/svg", "symbol");
  symbol.id = "officeFloorSymbol";
  symbol.setAttribute("viewBox", "0 0 24 24");
  symbol.innerHTML = window.lucide.createElement(window.lucide.icons.Building2).innerHTML;
  els.unitMap.querySelector("defs").appendChild(symbol);
  for (const [id, icon] of [["ventilationStepSymbol", "Badge"], ["shutterCanopySymbol", "Store"], ["plumbingSymbol", "Droplets"]]) {
    const other = document.createElementNS("http://www.w3.org/2000/svg", "symbol");
    other.id = id;
    other.setAttribute("viewBox", "0 0 24 24");
    other.innerHTML = window.lucide.createElement(window.lucide.icons[icon]).innerHTML;
    els.unitMap.querySelector("defs").appendChild(other);
  }
}

function renderMap() {
  const selectedProject = els.projectFilter.value;
  if (selectedProject === "all") {
    setMapDisplayMode("aggregate");
    renderAllProjectDashboard();
    els.visibleCount.textContent = `${filteredRows.length} total visible units`;
    return;
  }

  const planConfig = getProjectPlanConfig(selectedProject);
  if (!planConfig) {
    renderProjectPlanPending(selectedProject);
    setMapDisplayMode("pending");
    els.visibleCount.textContent = "Plan file pending";
    return;
  }

  applyPlanImage(planConfig);
  ensureOfficeIconSymbol();
  setMapDisplayMode("plan");
  const visibleIds = new Set(filteredRows.flatMap(getRowUnitKeys));
  const rowMap = createProjectRowMap(selectedProject);

  const renderedUnits = planConfig.units.map((unit) => {
      const row = rowMap.get(getUnitLookupKey(unit.unitId)) || rowMap.get(getUnitLookupKey(unit.unitNo));
      const fallbackBlock = unit.block || unit.unitId.charAt(0);
      const unitNo = row?.unitNo || unit.unitNo || unit.unitId;
      const labelNo = unit.unitNo || unit.unitId || row?.unitNo;
      const blockColor = blockColors[row?.block || fallbackBlock] || "#d8fbff";
      const hidden = !visibleIds.has(getUnitLookupKey(unit.unitId)) && !visibleIds.has(getUnitLookupKey(unit.unitNo));
      const selected = selectedUnitId === unit.unitId;
      const compact = planConfig.compactBlocks?.has(row?.block || fallbackBlock);
      const centroid = planConfig.useCentroidLabels && unit.points?.length ? getPolygonCentroid(unit.points) : null;
      const labelX = centroid?.x ?? unit.labelX ?? unit.x + unit.width / 2;
      const labelY = centroid?.y ?? unit.labelY ?? unit.y + unit.height / 2 + 4;
      const displayLabel = getDisplayPoint({ x: labelX, y: labelY }, planConfig);
      const labelBounds = getDisplayUnitBounds(unit, planConfig);
      const labelWidth = Math.max(8, labelBounds.maxX - labelBounds.minX - 5);
      const splitUnitName = /^UNIT\s+/i.test(labelNo) && labelWidth < labelNo.length * getUnitBadgeFont(planConfig, compact) * 0.62;
      const labelContent = splitUnitName
        ? `<tspan x="${displayLabel.x}" dy="-0.55em">UNIT</tspan><tspan x="${displayLabel.x}" dy="1.1em">${escapeHtml(labelNo.replace(/^UNIT\s+/i, ""))}</tspan>`
        : escapeHtml(labelNo);
      const shapeMarkup = renderUnitShape(unit, getOperationVisual(row), blockColor);
      const transform = unit.rotate && !unit.points ? ` transform="rotate(${unit.rotate} ${labelX} ${labelY})"` : "";
      return {
        block: row?.block || fallbackBlock,
        selected,
        shape: `
        <g class="unit-group ${compact ? "is-compact" : ""} ${hidden ? "is-hidden" : ""} ${selected ? "is-selected" : ""}" data-unit-id="${unit.unitId}" data-block="${escapeHtml(row?.block || fallbackBlock)}" tabindex="${hidden ? "-1" : "0"}" role="button" aria-label="${escapeHtml(labelNo)}: ${escapeHtml(getOperationVisual(row).label)}" aria-pressed="${selected}"${transform}>
          ${shapeMarkup}
        </g>`,
        displayLabel,
        office: activeCategoryId === "slab" && operations.hasOffice(row) && !hidden
          ? renderOfficeBadge(unit, row, displayLabel, planConfig, compact, labelNo)
          : "",
        work: hidden ? "" : activeCategoryId === "ventilation" ? renderVentilationBadges(unit, row, displayLabel, planConfig, compact, labelNo)
          : activeCategoryId === "electrical" ? renderPlumbingBadge(unit, row, displayLabel, planConfig, compact, labelNo) : "",
        label: `<text data-unit-label="${escapeHtml(unit.unitId)}" data-label-width="${labelWidth}" class="unit-label ${compact ? "is-compact" : ""} ${hidden ? "is-hidden" : ""}" x="${displayLabel.x}" y="${displayLabel.y}">${labelContent}</text>`
      };
    });

  const debugMarkup = CHOD2_DEBUG_MODE && planConfig.debugLines?.length ? renderPlanDebug(planConfig, renderedUnits) : "";
  const normalRenderedUnits = renderedUnits.filter((unit) => !unit.selected);
  const selectedRenderedUnits = renderedUnits.filter((unit) => unit.selected);
  els.unitLayer.innerHTML = debugMarkup + groupRenderedUnitsByBlock(renderedUnits)
    .map(([block, units]) => {
      const normalUnits = units.filter((unit) => !unit.selected);
      if (!normalUnits.length) return "";
      return `<g class="block-unit-layer" data-block="${escapeHtml(block)}">${normalUnits.map((unit) => unit.shape).join("")}</g>`;
    })
    .join("") + (selectedRenderedUnits.length
      ? `<g class="selected-unit-layer">${selectedRenderedUnits.map((unit) => unit.shape).join("")}</g>`
      : '<g class="selected-unit-layer"></g>');
  els.unitLabelLayer.innerHTML = normalRenderedUnits
    .map((unit) => unit.label)
    .concat(selectedRenderedUnits.map((unit) => unit.label))
    .join("");
  for (const label of els.unitLabelLayer.children) {
    if (label.classList.contains("is-hidden")) continue;
    const maxWidth = Number(label.dataset.labelWidth);
    const lines = label.children.length ? [...label.children] : [label];
    for (const line of lines) {
      if (line.getComputedTextLength() > maxWidth) {
        line.setAttribute("textLength", Math.max(6, maxWidth - 2));
        line.setAttribute("lengthAdjust", "spacingAndGlyphs");
      }
    }
  }
  els.unitOfficeLayer.innerHTML = renderedUnits.map((unit) => unit.office).join("");
  els.unitWorkLayer.innerHTML = renderedUnits.map((unit) => unit.work).join("");
  officeNodes = new Map([...els.unitOfficeLayer.children].map((node) => [node.dataset.officeUnit, node]));
  selectedOfficeNode = null;

  els.visibleCount.textContent = `${filteredRows.length} visible units`;
  fitMapToVisibleUnits();
  unitNodes = new Map([...els.unitLayer.querySelectorAll(".unit-group")].map((node) => [node.dataset.unitId, node]));
  selectedShapeNode = null;
  selectedShapeParent = null;
  if (selectedUnitId) updateSelectedUnitShape();
}

function renderUnitShape(unit, visual, blockColor) {
  const style = getOperationStyle(visual);
  const shapeClass = `unit-shape ${!visual.recorded || (activeCategoryId === "slab" && !visual.classified) || (activeCategoryId === "electrical" && !visual.renovated) ? "is-operation-missing" : ""} ${visual.renovated ? "is-electrical-renovated" : ""} ${visual.optionId ? "is-floor-option" : ""} ${visual.planned ? "is-planned" : ""}`;
  if (unit.points?.length) {
    const points = unit.points.map(([x, y]) => `${roundViewBox(x)},${roundViewBox(y)}`).join(" ");
    return `<polygon class="${shapeClass}" points="${points}" fill="${visual.fill || visual.color}" stroke="${visual.color}" style="${style}"></polygon>`;
  }

  return `<rect class="${shapeClass}" x="${unit.x}" y="${unit.y}" width="${unit.width}" height="${unit.height}" rx="3" fill="${visual.fill || visual.color}" stroke="${visual.color}" style="${style}"></rect>`;
}

// Match the existing CHOD2 A5 icon, independent of the unit footprint.
const UNIT_BADGE_RADIUS = 9;
const UNIT_BADGE_SIZE = UNIT_BADGE_RADIUS * 1.65;
const plumbingBadgeAlignments = new WeakMap();

function renderOfficeBadge(unit, row, label, config, compact, labelNo) {
  const visual = operations.floorVisual(row, "office");
  const position = getOfficeBadgePosition(unit, label, config, compact, labelNo);
  const size = UNIT_BADGE_SIZE;
  const description = `${labelNo} / Office renovated`;
  return `<g class="office-floor-badge" data-office-unit="${escapeHtml(unit.unitId)}" role="img" aria-label="${escapeHtml(description)}" style="color:${visual.color}" transform="translate(${roundViewBox(position.x)} ${roundViewBox(position.y)})"><title>${escapeHtml(description)}</title><circle class="renovation-icon-disc" r="${position.radius}"/><use href="#officeFloorSymbol" x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

function renderPlumbingBadge(unit, row, label, config, compact, labelNo) {
  if (operations.plumbingCompletion(row) !== true) return "";
  const position = getPlumbingBadgePosition(unit, label, config, compact, labelNo);
  const size = UNIT_BADGE_SIZE;
  const description = `${labelNo} / Pumbling renovated`;
  return `<g class="plumbing-badge" data-plumbing-unit="${escapeHtml(unit.unitId)}" role="img" aria-label="${escapeHtml(description)}" transform="translate(${roundViewBox(position.x)} ${roundViewBox(position.y)})"><title>${escapeHtml(description)}</title><circle class="renovation-icon-disc" r="${position.radius}"/><use href="#plumbingSymbol" x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

function renderVentilationBadges(unit, row, label, config, compact, labelNo) {
  const step = operations.ventilationVisual(row);
  const canopy = operations.canopyVisual(row);
  if (!step.symbols && !canopy.recorded) return "";
  const position = getOfficeBadgePosition(unit, label, config, compact, labelNo);
  const size = UNIT_BADGE_SIZE;
  const glyph = (symbol, x, y, solid = false) => `<use href="#${symbol}" x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" fill="${solid ? "currentColor" : "none"}" stroke="currentColor" stroke-width="${solid ? "1" : "2"}" stroke-linejoin="round"/>`;
  const stepMarkup = step.symbols ? Array.from({ length: step.symbols }, (_, index) => glyph("ventilationStepSymbol", (index - (step.symbols - 1) / 2) * size * 0.85, 0, true)).join("") : "";
  const stepTitle = `${labelNo} / ${step.label}`;
  const canopyTitle = `${labelNo} / ${canopy.label}`;
  const canopyPosition = { x: label.x - (position.x - label.x), y: label.y - (position.y - label.y) };
  return `${stepMarkup ? `<g class="work-unit-badge" data-work-unit="${escapeHtml(unit.unitId)}" tabindex="0" role="button" aria-label="${escapeHtml(stepTitle)}" style="color:${step.color}" transform="translate(${roundViewBox(position.x)} ${roundViewBox(position.y)})"><title>${escapeHtml(stepTitle)}</title>${stepMarkup}</g>` : ""}${canopy.recorded ? `<g class="work-unit-badge canopy-badge" data-work-unit="${escapeHtml(unit.unitId)}" tabindex="0" role="button" aria-label="${escapeHtml(canopyTitle)}" style="color:${canopy.color}" transform="translate(${roundViewBox(canopyPosition.x)} ${roundViewBox(canopyPosition.y)})"><title>${escapeHtml(canopyTitle)}</title>${glyph("shutterCanopySymbol", 0, 0)}</g>` : ""}`;
}

function getUnitBadgeFont(config, compact) {
  return config.planClass === "chaengwattana" ? 14 : config.planClass === "putthamonthon-sai4" ? 24 : config.planClass === "km8-p1" ? 13 : compact ? 14.5 : 17;
}

function getPlumbingBadgePosition(unit, label, config, compact, labelNo) {
  let alignments = plumbingBadgeAlignments.get(config);
  if (!alignments) {
    const blocks = new Map();
    for (const candidate of config.units) {
      const block = candidate.block || candidate.unitId.charAt(0);
      const centroid = config.useCentroidLabels && candidate.points?.length ? getPolygonCentroid(candidate.points) : null;
      const anchor = getDisplayPoint({
        x: centroid?.x ?? candidate.labelX ?? candidate.x + candidate.width / 2,
        y: centroid?.y ?? candidate.labelY ?? candidate.y + candidate.height / 2 + 4
      }, config);
      const position = getOfficeBadgePosition(candidate, anchor, config, config.compactBlocks?.has(block), candidate.unitNo || candidate.unitId);
      const direction = `${Math.sign(Math.round(position.x - anchor.x))},${Math.sign(Math.round(position.y - anchor.y))}`;
      if (!blocks.has(block)) blocks.set(block, new Map());
      const votes = blocks.get(block);
      votes.set(direction, (votes.get(direction) || 0) + 1);
    }
    alignments = new Map([...blocks].map(([block, votes]) => [block,
      [...votes].sort((a, b) => b[1] - a[1])[0][0].split(",").map(Number)]));
    plumbingBadgeAlignments.set(config, alignments);
  }
  // Narrow cells inherit their block's alignment instead of flipping to the opposite side.
  const [horizontal, vertical] = alignments.get(unit.block || unit.unitId.charAt(0)) || [1, 0];
  const font = getUnitBadgeFont(config, compact);
  return {
    x: label.x + horizontal * (labelNo.length * font * 0.28 + UNIT_BADGE_RADIUS + 3),
    y: label.y + vertical * (font / 2 + UNIT_BADGE_RADIUS + 2),
    radius: UNIT_BADGE_RADIUS
  };
}

function getOfficeBadgePosition(unit, label, config, compact, labelNo) {
  const localPoints = unit.points?.length ? unit.points.map(([x, y]) => ({ x, y })) : getRotatedRect(unit);
  const points = localPoints.map((point) => getDisplayPoint(point, config));
  const font = getUnitBadgeFont(config, compact);
  // This badge identifies office data, not the office's physical position within the unit.
  const radius = UNIT_BADGE_RADIUS;
  const dy = font / 2 + radius + 2;
  const dx = labelNo.length * font * 0.28 + radius + 3;
  const candidates = [[0, dy], [dx, 0], [-dx, 0], [0, -dy], [dx, dy], [-dx, dy]];
  for (const [ox, oy] of candidates) {
    const x = label.x + ox;
    const y = label.y + oy;
    if ([[0, 0], [-radius, -radius], [radius, -radius], [radius, radius], [-radius, radius]].every(([cx, cy]) => pointInOfficePolygon({ x: x + cx, y: y + cy }, points))) return { x, y, radius };
  }
  return { x: label.x, y: label.y + font / 2 + radius + 2, radius };
}

function pointInOfficePolygon(point, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function getPolygonCentroid(points) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  points.forEach(([x1, y1], index) => {
    const [x2, y2] = points[(index + 1) % points.length];
    const cross = x1 * y2 - x2 * y1;
    area += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  });
  area *= 0.5;
  if (Math.abs(area) < 1e-6) {
    return {
      x: points.reduce((sum, [x]) => sum + x, 0) / points.length,
      y: points.reduce((sum, [, y]) => sum + y, 0) / points.length
    };
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

function renderPlanDebug(planConfig, renderedUnits) {
  const lineMarkup = planConfig.debugLines.map((line) => {
    const points = line.points.map(([x, y]) => `${roundViewBox(x)},${roundViewBox(y)}`).join(" ");
    return `<polyline class="debug-plan-line debug-${line.kind}" points="${points}"></polyline>`;
  }).join("");
  const centroidMarkup = renderedUnits.map((unit) => {
    const cx = roundViewBox(unit.displayLabel.x);
    const cy = roundViewBox(unit.displayLabel.y);
    return `<circle class="debug-centroid" cx="${cx}" cy="${cy}" r="3"></circle>`;
  }).join("");
  return `<g class="debug-plan-layer">${lineMarkup}${centroidMarkup}</g>`;
}

function hasProjectPlan(projectName) {
  return Boolean(getProjectPlanConfig(projectName));
}

function groupRenderedUnitsByBlock(renderedUnits) {
  const groups = new Map();
  renderedUnits.forEach((unit) => {
    if (!groups.has(unit.block)) groups.set(unit.block, []);
    groups.get(unit.block).push(unit);
  });
  return [...groups.entries()];
}

function getProjectPlanConfig(projectName) {
  return projectPlanConfigs[getProjectPlanKey(projectName)] || null;
}

function getProjectPlanKey(projectName) {
  if (projectPlanConfigs[projectName]) return projectName;
  const key = getUnitLookupKey(projectName);
  if (key.includes("chodthanawat1") || key.includes("chod1") || key.includes("km1")) return PROJECT_CHOD1;
  if (key.includes("chodthanawat3") || key.includes("chod3") || key.includes("rama2")) return PROJECT_CHOD3;
  if (key.includes("chodthanawat5") || key.includes("chod5")) return PROJECT_CHOD5;
  if (key.includes("chodbizchaengwattana") || key.includes("chaengwattana")) return PROJECT_CHAENGWATTANA;
  if ((key.includes("chodbizbangnakm8") || key.includes("chodbizbangna8") || key.includes("bangnakm8") || key.includes("km8")) && (key.includes("p1") || key.includes("phase1"))) return PROJECT_KM8_P1;
  if (key.includes("chodbizputthamonthonsai4") || key.includes("putthamonthonsai4") || key.includes("phutthamonthonsai4") || key.includes("sai4")) return PROJECT_PTS4;
  if (key.includes("chodthanawat2") || key.includes("chod2") || key.includes("km16")) return PROJECT_CHOD2;
  return projectName;
}

function getFallbackPlanConfig() {
  return getProjectPlanConfig(PROJECT_CHOD2);
}

function getActivePlanConfig() {
  return getProjectPlanConfig(els.projectFilter.value) || getFallbackPlanConfig();
}

function applyPlanImage(planConfig) {
  els.unitMap.dataset.plan = planConfig.planClass || "";
  els.unitMap.dataset.operation = activeCategoryId;

  if (planConfig.layerTransform) {
    els.unitLayer.setAttribute("transform", planConfig.layerTransform);
  } else {
    els.unitLayer.removeAttribute("transform");
  }

  Object.entries(planConfig.image).forEach(([key, value]) => {
    if (key === "transform" && !value) {
      els.masterPlanImage.removeAttribute("transform");
      return;
    }
    if (els.masterPlanImage.getAttribute(key) !== String(value)) els.masterPlanImage.setAttribute(key, value);
  });
}

function setMapDisplayMode(mode) {
  const showPlan = mode === "plan";
  const showAggregateMap = mode === "aggregate";
  if (!showAggregateMap) {
    destroyPortfolioMap();
  }
  els.masterPlanImage.hidden = !showPlan;
  els.allProjectDashboard.hidden = !showAggregateMap;
  els.projectPlanPending.hidden = mode !== "pending";
  if (!showPlan && els.unitLayer.childElementCount) {
    els.unitLayer.replaceChildren();
    els.unitLabelLayer.replaceChildren();
    els.unitOfficeLayer.replaceChildren();
    els.unitWorkLayer.replaceChildren();
    officeNodes.clear();
    selectedOfficeNode = null;
    unitNodes.clear();
    selectedShapeNode = null;
    selectedShapeParent = null;
  }
  els.fitVisibleBtn.disabled = !(showPlan || showAggregateMap);
  els.zoomInBtn.disabled = !(showPlan || showAggregateMap);
  els.zoomOutBtn.disabled = showPlan ? mapZoomLevel <= MAP_ZOOM_MIN : !showAggregateMap;
  els.mapViewport.classList.toggle("is-state-view", !showPlan);

  if (!showPlan) {
    els.unitLayer.removeAttribute("transform");
    els.unitLabelLayer.removeAttribute("transform");
    els.unitMap.setAttribute("viewBox", getPlanDefaultViewBox(getFallbackPlanConfig()));
    els.mapViewport.classList.remove("is-zoomed");
    els.mapViewport.scrollLeft = 0;
    els.mapViewport.scrollTop = 0;
    els.mapViewport.style.setProperty("--map-zoom-scale", "1");
    els.fitVisibleBtn.textContent = "Overview";
  }

  if (showAggregateMap) {
    updatePortfolioMapControls();
  }
}

function updatePortfolioMapControls() {
  const canControlPortfolioMap = Boolean(portfolioMap);
  els.fitVisibleBtn.disabled = !canControlPortfolioMap;
  els.zoomInBtn.disabled = !canControlPortfolioMap;
  els.zoomOutBtn.disabled = !canControlPortfolioMap;
  els.fitVisibleBtn.textContent = "Overview";
}

function renderProjectPlanPending(projectName) {
  els.projectPlanPending.innerHTML = `
    <div class="pending-plan-panel">
      <span>PLAN FILE PENDING</span>
      <strong>${escapeHtml(projectName)}</strong>
      <small>Upload this project's master plan file later to enable an interactive unit map.</small>
    </div>
  `;
}

function renderAllProjectDashboard() {
  const summaries = getPortfolioProjectSummaries(filteredRows);
  const selectedSummary = summaries.find((project) => project.key === selectedPortfolioProjectKey) || null;
  const projectsWithLocation = summaries.filter((project) => project.hasLocation);
  const missingLocationCount = summaries.length - projectsWithLocation.length;
  const stateMessage = getPortfolioStateMessage(summaries, projectsWithLocation);
  const mapLibraryMissing = typeof window === "undefined" || !window.maplibregl;

  if (!els.allProjectDashboard.querySelector(".portfolio-map-shell")) {
    els.allProjectDashboard.innerHTML = `
    <div class="portfolio-map-shell">
      <div id="portfolioMap" class="portfolio-maplibre" aria-label="Greater Bangkok and Rayong portfolio map"></div>
      <div class="portfolio-location-note" hidden></div>
      <div class="portfolio-project-detail"></div>
      <div class="portfolio-empty-state map-empty" hidden></div>
    </div>
  `;
    bindPortfolioMapEvents(projectsWithLocation);
  }
  const note = els.allProjectDashboard.querySelector(".portfolio-location-note");
  note.hidden = !missingLocationCount;
  note.textContent = `${missingLocationCount} projects missing lat/lng`;
  const message = mapLibraryMissing ? { title: "Map unavailable", body: "Refresh to retry loading the map library.", isError: true } : stateMessage;
  const state = els.allProjectDashboard.querySelector(".portfolio-empty-state");
  state.hidden = !message;
  state.classList.toggle("is-error", Boolean(message?.isError));
  state.innerHTML = message ? `<strong>${escapeHtml(message.title)}</strong><small>${escapeHtml(message.body)}</small>` : "";
  renderSelectedProjectOverlay(selectedSummary);
  if (!portfolioMap) initializePortfolioMap(projectsWithLocation);
  else {
    const previousLocations = portfolioMapProjects.map((item) => `${item.key}:${item.lat}:${item.lng}`).join("|");
    portfolioMapProjects = projectsWithLocation;
    renderPortfolioMapMarkers(projectsWithLocation);
    if (previousLocations !== projectsWithLocation.map((item) => `${item.key}:${item.lat}:${item.lng}`).join("|")) fitPortfolioMapToProjects(projectsWithLocation);
  }
}

function renderSelectedProjectOverlay(project) {
  const detail = els.allProjectDashboard.querySelector(".portfolio-project-detail");
  if (detail) detail.innerHTML = project ? renderSelectedProjectCard(project) : "";
  portfolioMapMarkers.forEach((marker) => {
    const element = marker.getElement();
    element.classList.toggle("is-active", element.dataset.projectKey === selectedPortfolioProjectKey);
  });
}

function getPortfolioStateMessage(summaries, projectsWithLocation) {
  if (sheetSyncState === "syncing" || sheetSyncState === "idle") {
    return {
      title: "Syncing Google Sheet...",
      body: "Portfolio data will appear after the current sheet sync finishes."
    };
  }
  if (sheetSyncState === "error") {
    return {
      title: "Google Sheet sync failed",
      body: sheetSyncError || "Unable to load synced project data.",
      isError: true
    };
  }
  if (!summaries.length) {
    return {
      title: "No synced project data",
      body: "Adjust filters or refresh the connected Google Sheet."
    };
  }
  if (!projectsWithLocation.length) {
    return {
      title: "No location data available",
      body: "Add Latitude and Longitude fields in the synced Google Sheet to render project markers."
    };
  }
  return null;
}

function renderProjectOccupancyChart(projectName, rows) {
  const total = rows.length;
  const occupied = rows.filter((row) => row.status === "Occupied").length;
  const available = rows.filter((row) => row.status === "Available").length;
  const underConstruction = rows.filter((row) => row.status === "Under Construction").length;
  const occupancy = total ? (occupied / total) * 100 : 0;
  const availableRate = total ? (available / total) * 100 : 0;
  const constructionRate = total ? (underConstruction / total) * 100 : 0;
  return `
    <article class="project-chart-card">
      <header>
        <strong>${escapeHtml(projectName)}</strong>
        <span>${formatNumber(total)} units</span>
      </header>
      <div class="project-bar-stack" aria-label="${escapeHtml(projectName)} occupancy chart">
        <i class="bar-occupied" style="width:${Math.min(100, Math.max(0, occupancy))}%"></i>
        <i class="bar-available" style="width:${Math.min(100, Math.max(0, availableRate))}%"></i>
        <i class="bar-construction" style="width:${Math.min(100, Math.max(0, constructionRate))}%"></i>
      </div>
      <footer>
        <span><b class="dot-occupied"></b>${formatPercent(occupancy)}% Occupied</span>
        <span><b class="dot-available"></b>${formatPercent(availableRate)}% Available</span>
        <span><b class="dot-construction"></b>${formatPercent(constructionRate)}% Construction</span>
      </footer>
    </article>
  `;
}

function getPortfolioProjectSummaries(rows) {
  const rowsByProject = new Map();
  rows.forEach((row) => {
    if (!row.project) return;
    if (!rowsByProject.has(row.project)) rowsByProject.set(row.project, []);
    rowsByProject.get(row.project).push(row);
  });

  if (els.projectFilter.value === "all" && els.phaseFilter.value === "all" && els.statusFilter.value === "all") {
    const existingProjectKeys = new Set([...rowsByProject.keys()].map(getUnitLookupKey));
    projectSheets.forEach((projectName) => {
      const projectKey = getUnitLookupKey(projectName);
      if (!projectName || rowsByProject.has(projectName) || existingProjectKeys.has(projectKey)) return;
      rowsByProject.set(projectName, []);
      existingProjectKeys.add(projectKey);
    });
  }

  return [...rowsByProject.entries()].map(([projectName, projectRows]) => {
    const counts = getStatusCounts(projectRows);
    const total = projectRows.length;
    const hasRows = total > 0;
    const occupied = counts.Occupied || 0;
    const available = counts.Available || 0;
    const occupancy = total ? (occupied / total) * 100 : null;
    const availableRate = total ? (available / total) * 100 : null;
    const fallbackLocation = getPortfolioLocationFallback(projectName);
    const lat = fallbackLocation?.lat || firstNumber(projectRows, "lat") || "";
    const lng = fallbackLocation?.lng || firstNumber(projectRows, "lng") || "";
    const explicitStatus = firstText(projectRows, "projectStatus");
    const status = explicitStatus || (hasRows ? getDominantStatus(counts) : "");
    const warehouseAreaTotal = projectRows.reduce((sum, row) => sum + Number(row.warehouseArea || row.area || 0), 0);
    return {
      key: getProjectLookupKey(projectName) || slugify(projectName),
      name: projectName,
      rows: projectRows,
      total,
      counts,
      occupied,
      available,
      underConstruction: counts["Under Construction"] || 0,
      occupancy,
      availableRate,
      status,
      type: firstText(projectRows, "projectType") || firstText(projectRows, "unitType") || "-",
      location: firstText(projectRows, "projectLocation") || firstText(projectRows, "projectZone") || fallbackLocation?.label || "-",
      image: projectImageAssets[getProjectPlanKey(projectName)] || getSafeImageUrl(firstText(projectRows, "projectImage")) || "",
      route: firstText(projectRows, "projectRoute"),
      projectId: firstText(projectRows, "projectId"),
      slug: firstText(projectRows, "projectSlug") || slugify(projectName),
      mapLabel: fallbackLocation?.mapLabel || projectName,
      lat,
      lng,
      mapX: fallbackLocation?.mapX || "",
      mapY: fallbackLocation?.mapY || "",
      calloutX: fallbackLocation?.calloutX || "",
      calloutY: fallbackLocation?.calloutY || "",
      hasLocation: Number.isFinite(lat) && Number.isFinite(lng),
      nla: firstNumber(projectRows, "nla") || warehouseAreaTotal || "",
      trend: ["trendQ1", "trendQ2", "trendQ3", "trendQ4"].map((key) => firstNumber(projectRows, key)),
      operationSummary: operations.summary(projectRows, getActiveCategory())
    };
  });
}

function getStatusCounts(rows) {
  return Object.fromEntries(Object.keys(statusConfig).map((status) => [status, rows.filter((row) => row.status === status).length]));
}

function getDominantStatus(counts) {
  return Object.keys(statusConfig).reduce((dominant, status) => (counts[status] || 0) > (counts[dominant] || 0) ? status : dominant, "Available");
}

function firstText(rows, key) {
  const found = rows.find((row) => String(row[key] ?? "").trim());
  return found ? String(found[key]).trim() : "";
}

function firstNumber(rows, key) {
  const found = rows.find((row) => row[key] !== "" && row[key] !== null && row[key] !== undefined && Number.isFinite(Number(row[key])));
  return found ? Number(found[key]) : "";
}

function renderPortfolioScoreCard(label, value, tone) {
  return `
    <article class="portfolio-score-card ${tone}">
      <div>
        <span>${label}</span>
        <strong>${formatNumber(value)}</strong>
      </div>
      ${renderPortfolioScoreIcon(tone)}
    </article>
  `;
}

function renderPortfolioScoreIcon(tone) {
  const icons = {
    total: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 40h28M14 40V13l10-5 10 5v27M20 18h3M20 25h3M29 18h3M29 25h3" /></svg>`,
    available: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 38h32M12 38V21l12-8 12 8v17M18 38V26h12v12M15 21h18" /></svg>`,
    occupied: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 23a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM10 40c1.8-8.2 7-12.4 14-12.4S36.2 31.8 38 40" /></svg>`,
    construction: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 16h30M17 16v24M32 16v24M13 40h23M20 16l8 24M29 16l-7 24M19 10h17l3 6" /></svg>`
  };
  return `<span class="score-icon">${icons[tone] || icons.total}</span>`;
}

function getPortfolioLocationFallback(projectName) {
  const key = getUnitLookupKey(projectName);
  return PORTFOLIO_LOCATION_FALLBACKS.find((item) => item.keys.some((candidate) => key.includes(candidate)));
}

function destroyPortfolioMap() {
  portfolioMapMarkers.forEach((marker) => marker.remove());
  portfolioMapMarkers = [];
  portfolioMapProjects = [];
  if (portfolioMap) {
    portfolioMap.remove();
    portfolioMap = null;
  }
  els.allProjectDashboard.replaceChildren();
}

function initializePortfolioMap(projects) {
  const container = els.allProjectDashboard.querySelector("#portfolioMap");
  if (!container || !projects.length || typeof window === "undefined" || !window.maplibregl) return;

  portfolioMapProjects = projects;
  portfolioMap = new window.maplibregl.Map({
    container,
    style: PORTFOLIO_MAP_STYLE_URL,
    center: [100.73, 13.5],
    zoom: 8.2,
    minZoom: 7,
    maxZoom: 15,
    pitch: 0,
    bearing: 0,
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false
  });

  portfolioMap.addControl(new window.maplibregl.AttributionControl({ compact: true }), "bottom-right");
  portfolioMap.on("load", () => {
    tunePortfolioMapStyle();
    fitPortfolioMapToProjects(portfolioMapProjects);
    updatePortfolioMapControls();
  });
  portfolioMap.on("error", (event) => {
    console.warn("Portfolio map failed to load", event?.error || event);
  });
  portfolioMap.on("click", () => {
    if (!selectedPortfolioProjectKey) return;
    selectedPortfolioProjectKey = "";
    renderSelectedProjectOverlay(null);
  });

  renderPortfolioMapMarkers(projects);
  fitPortfolioMapToProjects(projects);
  updatePortfolioMapControls();
}

function tunePortfolioMapStyle() {
  if (!portfolioMap?.getStyle) return;
  const layers = portfolioMap.getStyle().layers || [];
  layers.forEach((layer) => {
    try {
      if (layer.type === "background") {
        portfolioMap.setPaintProperty(layer.id, "background-color", "#031018");
      }
      if (layer.type === "line" && /road|bridge|tunnel|street|transport/i.test(layer.id)) {
        const roadMeta = `${layer.id} ${JSON.stringify(layer.filter || [])}`.toLowerCase();
        const isMinorRoad = /minor|service|path|track|pedestrian|tertiary|residential|street|unclassified/.test(roadMeta);
        const isHighway = /motorway|trunk|highway|expressway|primary/.test(roadMeta);
        const isMajorRoad = isHighway || /major|secondary|bridge|tunnel/.test(roadMeta);
        const isWarmCorridor = isHighway && /casing|outline|major|bridge|tunnel|transport/.test(roadMeta);
        const roadWidth = isMinorRoad
          ? ["interpolate", ["linear"], ["zoom"], 7, 0.18, 10, 0.28, 13, 0.54]
          : isMajorRoad
            ? ["interpolate", ["linear"], ["zoom"], 7, 0.62, 10, 0.92, 13, 1.42]
            : ["interpolate", ["linear"], ["zoom"], 7, 0.32, 10, 0.52, 13, 0.88];

        portfolioMap.setPaintProperty(layer.id, "line-color", isWarmCorridor ? "rgba(210, 220, 120, 0.75)" : isMajorRoad ? "#35F2D0" : "#28E6C3");
        portfolioMap.setPaintProperty(layer.id, "line-opacity", isWarmCorridor ? 0.18 : isMinorRoad ? 0.2 : isMajorRoad ? 0.45 : 0.35);
        portfolioMap.setPaintProperty(layer.id, "line-width", roadWidth);
        portfolioMap.setPaintProperty(layer.id, "line-blur", isMinorRoad ? 0.12 : isMajorRoad ? 0.72 : 0.34);
      }
      if (layer.type === "symbol" && /place|state|province|country|admin|label/i.test(layer.id)) {
        const isRegionalLabel = /state|province|country|admin/i.test(layer.id);
        portfolioMap.setPaintProperty(layer.id, "text-color", isRegionalLabel ? "#8aa8b1" : "#9fc6ce");
        portfolioMap.setPaintProperty(layer.id, "text-halo-color", "#031018");
        portfolioMap.setPaintProperty(layer.id, "text-halo-width", isRegionalLabel ? 0.7 : 0.9);
        portfolioMap.setPaintProperty(layer.id, "text-opacity", isRegionalLabel ? 0.22 : 0.34);
      }
      if (layer.type === "fill" && /water|ocean|river/i.test(layer.id)) {
        const isDeepWater = /ocean|sea|marine/.test(layer.id.toLowerCase());
        portfolioMap.setPaintProperty(layer.id, "fill-color", isDeepWater ? "#031426" : "#061B33");
        portfolioMap.setPaintProperty(layer.id, "fill-opacity", isDeepWater ? 0.96 : 0.92);
      }
      if (layer.type === "line" && /coast|shore|water|waterway|river|ocean|sea/i.test(layer.id)) {
        portfolioMap.setPaintProperty(layer.id, "line-color", "rgba(45, 180, 255, 0.35)");
        portfolioMap.setPaintProperty(layer.id, "line-opacity", /coast|shore/i.test(layer.id) ? 0.5 : 0.28);
        portfolioMap.setPaintProperty(layer.id, "line-width", /coast|shore/i.test(layer.id) ? 1 : 0.7);
        portfolioMap.setPaintProperty(layer.id, "line-blur", /coast|shore/i.test(layer.id) ? 2 : 1.2);
      }
    } catch (error) {
      // Third-party styles may use layer-specific paint expressions; keep the base style if tuning fails.
    }
  });
}

function renderPortfolioMapMarkers(projects) {
  if (!portfolioMap || typeof window === "undefined" || !window.maplibregl) return;
  portfolioMapMarkers.forEach((marker) => marker.remove());
  portfolioMapMarkers = projects
    .filter((project) => Number.isFinite(Number(project.lat)) && Number.isFinite(Number(project.lng)))
    .map((project) => {
      const markerElement = createPortfolioMarkerElement(project);
      return new window.maplibregl.Marker({ element: markerElement, anchor: "center" })
        .setLngLat([Number(project.lng), Number(project.lat)])
        .addTo(portfolioMap);
    });
}

function createPortfolioMarkerElement(project) {
  const coverageText = project.operationSummary.coverage === null ? "-" : `${formatPercent(project.operationSummary.coverage)}%`;
  const active = selectedPortfolioProjectKey === project.key;
  const calloutX = Number(project.calloutX);
  const calloutY = Number(project.calloutY);
  const hasCalloutOffset = Number.isFinite(calloutX) && Number.isFinite(calloutY);
  const leaderWidth = hasCalloutOffset ? Math.min(232, Math.max(44, Math.hypot(calloutX, calloutY))) : 48;
  const leaderAngle = hasCalloutOffset ? Math.atan2(calloutY, calloutX) * 180 / Math.PI : 0;
  const calloutStyle = `${Number.isFinite(calloutX) ? `--callout-x:${calloutX}px;` : ""}${Number.isFinite(calloutY) ? `--callout-y:${calloutY}px;` : ""}--leader-width:${leaderWidth}px;--leader-angle:${leaderAngle}deg;`;
  const markerElement = document.createElement("button");
  markerElement.className = `portfolio-marker ${active ? "is-active" : ""}`;
  markerElement.type = "button";
  markerElement.dataset.projectKey = project.key;
  markerElement.setAttribute("aria-label", project.name);
  markerElement.setAttribute("style", `${getStatusStyle(project.status)}${calloutStyle}`);
  markerElement.innerHTML = `
      <span class="marker-dot"></span>
      <span class="map-callout">
        <strong>${escapeHtml(project.mapLabel || project.name)}</strong>
        <small>Data coverage ${coverageText}</small>
      </span>
  `;
  markerElement.addEventListener("click", (event) => {
    event.stopPropagation();
    selectedPortfolioProjectKey = markerElement.dataset.projectKey || "";
    renderSelectedProjectOverlay(project);
  });
  return markerElement;
}

function fitPortfolioMapToProjects(projects, options = {}) {
  if (!portfolioMap || typeof window === "undefined" || !window.maplibregl) return;
  const bounds = new window.maplibregl.LngLatBounds();
  const points = projects
    .filter((project) => Number.isFinite(Number(project.lat)) && Number.isFinite(Number(project.lng)))
    .map((project) => [Number(project.lng), Number(project.lat)]);

  if (!points.length) return;
  points.forEach((point) => bounds.extend(point));
  portfolioMap.resize();
  const camera = portfolioMap.cameraForBounds?.(bounds, {
    padding: PORTFOLIO_MAP_FIT_PADDING,
    maxZoom: PORTFOLIO_MAP_MAX_OVERVIEW_ZOOM,
    offset: PORTFOLIO_MAP_OVERVIEW_OFFSET
  });
  if (camera) {
    const cameraOptions = {
      center: camera.center,
      zoom: Math.min(PORTFOLIO_MAP_MAX_OVERVIEW_ZOOM, camera.zoom + PORTFOLIO_MAP_OVERVIEW_ZOOM_DELTA),
      bearing: camera.bearing || 0,
      pitch: camera.pitch || 0
    };
    if (options.animate) {
      portfolioMap.easeTo({ ...cameraOptions, duration: 450 });
    } else {
      portfolioMap.jumpTo(cameraOptions);
    }
    return;
  }
  portfolioMap.fitBounds(bounds, {
    padding: PORTFOLIO_MAP_FIT_PADDING,
    maxZoom: PORTFOLIO_MAP_MAX_OVERVIEW_ZOOM,
    offset: PORTFOLIO_MAP_OVERVIEW_OFFSET,
    duration: options.animate ? 450 : 0
  });
}

function renderSelectedProjectCard(project) {
  const imageUrl = getSafeImageUrl(project.image);
  const summary = project.operationSummary;
  const canOpenProject = canNavigateToProject(project);
  const displayName = project.mapLabel || project.name;
  return `
    <article class="selected-project-card">
      <div class="selected-project-image ${imageUrl ? "" : "is-placeholder"}" ${imageUrl ? `role="img" aria-label="${escapeHtml(displayName)} site photo" style="background-image:url('${escapeHtml(imageUrl)}')"` : ""}></div>
      <div class="selected-project-body">
        <h4 title="${escapeHtml(project.name)}">${escapeHtml(displayName)}</h4>
        <dl>
          <div><dt>Type</dt><dd>${escapeHtml(project.type || "-")}</dd></div>
          <div><dt>Total Units</dt><dd>${formatNumber(project.total)}</dd></div>
          <div><dt>Recorded</dt><dd>${summary.recorded} / ${summary.total}</dd></div>
          <div><dt>Needs Attention</dt><dd>${summary.attention}</dd></div>
        </dl>
        <button class="project-detail-link" type="button" data-project-key="${escapeHtml(project.key)}" ${canOpenProject ? "" : "disabled"}>View project detail <span aria-hidden="true">-></span></button>
      </div>
    </article>
  `;
}

function canNavigateToProject(project) {
  return [...els.projectFilter.options].some((option) => option.value === project.name);
}

function getSafeImageUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (Object.values(projectImageAssets).includes(url)) return url;
  return /^(https?:\/\/|data:image\/)/i.test(url) ? url.replace(/'/g, "%27") : "";
}

function renderPortfolioTrendCard(project) {
  const trendValues = project?.trend || [];
  const hasTrend = trendValues.some((value) => Number.isFinite(Number(value)));
  return `
    <article class="portfolio-trend-card">
      <header>
        <strong>Project Occupancy Trend (1 Year)</strong>
        <select aria-label="Trend range"><option>1Y</option></select>
      </header>
      ${hasTrend ? renderQuarterTrendChart(trendValues) : `<div class="trend-empty">No quarterly data available</div>`}
    </article>
  `;
}

function renderQuarterTrendChart(values) {
  const normalized = values.map((value) => Number.isFinite(Number(value)) ? Math.min(100, Math.max(0, Number(value))) : null);
  const points = normalized.map((value, index) => {
    if (value === null) return null;
    const x = 12 + index * 25.5;
    const y = 84 - value * 0.68;
    return { x, y, value };
  }).filter(Boolean);
  const path = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  return `
    <svg class="trend-chart" viewBox="0 0 100 100" role="img" aria-label="Quarterly occupancy trend">
      <path class="trend-axis" d="M8 84H96M8 16V84" />
      ${path ? `<path class="trend-line" d="${path}" />` : ""}
      ${points.map((point) => `<circle class="trend-point" cx="${point.x}" cy="${point.y}" r="2.6"><title>${formatPercent(point.value)}%</title></circle>`).join("")}
      ${["Q1", "Q2", "Q3", "Q4"].map((label, index) => `<text x="${12 + index * 25.5}" y="96">${label}</text>`).join("")}
    </svg>
  `;
}

function bindPortfolioMapEvents(projectsWithLocation = []) {
  initializePortfolioMap(projectsWithLocation);

  const mapShell = els.allProjectDashboard.querySelector(".portfolio-map-shell");
  mapShell?.addEventListener("click", (event) => {
    if (event.target.closest(".portfolio-marker, .selected-project-card, .maplibregl-control-container")) return;
    if (selectedPortfolioProjectKey) {
      selectedPortfolioProjectKey = "";
      renderSelectedProjectOverlay(null);
    }
  });

  mapShell?.addEventListener("click", (event) => {
    const detailButton = event.target.closest(".project-detail-link:not(:disabled)");
    if (!detailButton) return;
    event.stopPropagation();
    const project = getPortfolioProjectSummaries(filteredRows).find((item) => item.key === detailButton.dataset.projectKey);
    if (!project || !canNavigateToProject(project)) return;
    els.projectFilter.value = project.name;
    mapZoomMode = "all";
    selectedUnitId = null;
    applyFilters();
  });
}

function renderMapHealth() {
  const planConfig = getActivePlanConfig();
  const project = els.projectFilter.value;
  const layoutIds = new Set(planConfig.units.flatMap((unit) => [getUnitLookupKey(unit.unitId), getUnitLookupKey(unit.unitNo)].filter(Boolean)));
  const dataIds = new Set(unitRows.filter((row) => rowMatchesProject(row, project)).flatMap(getRowUnitKeys));
  const mappedIds = [...dataIds].filter((unitId) => layoutIds.has(unitId));
  const dataOnlyIds = [...dataIds].filter((unitId) => !layoutIds.has(unitId));
  const shapeOnlyIds = [...layoutIds].filter((unitId) => !dataIds.has(unitId));

  const issues = [
    dataOnlyIds.length ? `Data rows without SVG shape: ${dataOnlyIds.join(", ")}` : "",
    shapeOnlyIds.length ? `SVG shapes without data row: ${shapeOnlyIds.join(", ")}` : ""
  ].filter(Boolean);

  els.mappingIssues.hidden = !issues.length;
  els.mappingIssues.innerHTML = issues.map((issue) => `<p>${escapeHtml(issue)}</p>`).join("");
}

function fitMapToVisibleUnits() {
  const planConfig = getActivePlanConfig();
  if (mapZoomMode !== "visible") {
    els.unitMap.setAttribute("viewBox", getPlanDefaultViewBox(planConfig));
    applyMapZoomState();
    return;
  }

  const visibleIds = new Set(filteredRows.flatMap(getRowUnitKeys));
  const visibleUnits = planConfig.units.filter((unit) => visibleIds.has(getUnitLookupKey(unit.unitId)) || visibleIds.has(getUnitLookupKey(unit.unitNo)));
  if (!visibleUnits.length) {
    els.unitMap.setAttribute("viewBox", getPlanDefaultViewBox(planConfig));
    applyMapZoomState();
    return;
  }

  els.unitMap.setAttribute("viewBox", getBoundsViewBox(visibleUnits, planConfig.visiblePadding, 2, planConfig));
  applyMapZoomState();
}

function applyMapZoomState({ preserveCenter = false } = {}) {
  const viewport = els.mapViewport;
  const previousScrollWidth = Math.max(1, viewport.scrollWidth);
  const previousScrollHeight = Math.max(1, viewport.scrollHeight);
  const centerRatioX = (viewport.scrollLeft + viewport.clientWidth / 2) / previousScrollWidth;
  const centerRatioY = (viewport.scrollTop + viewport.clientHeight / 2) / previousScrollHeight;
  const isZoomed = mapZoomLevel > MAP_ZOOM_MIN || mapZoomMode === "visible";

  viewport.style.setProperty("--map-zoom-scale", mapZoomLevel.toFixed(2));
  viewport.classList.toggle("is-zoomed", isZoomed);

  if (!isZoomed) {
    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;
  } else if (preserveCenter) {
    requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max(0, viewport.scrollWidth * centerRatioX - viewport.clientWidth / 2);
      viewport.scrollTop = Math.max(0, viewport.scrollHeight * centerRatioY - viewport.clientHeight / 2);
    });
  }

  els.fitVisibleBtn.textContent = "Overview";
  els.zoomOutBtn.disabled = mapZoomLevel <= MAP_ZOOM_MIN;
  els.zoomInBtn.disabled = mapZoomLevel >= MAP_ZOOM_MAX;
}

function getPlanDefaultViewBox(planConfig) {
  if (planConfig.defaultViewBox) return planConfig.defaultViewBox;
  return getBoundsViewBox(planConfig.units, planConfig.defaultPadding, 1, planConfig, {
    fitViewport: true,
    fillViewport: Boolean(planConfig.defaultFillViewport),
    fitScale: planConfig.defaultFitScale ?? 1.02,
    offsetX: planConfig.defaultOffsetX ?? 0,
    offsetY: planConfig.defaultOffsetY ?? 0
  });
}

function getBoundsViewBox(units, padding, zoom = 1, planConfig = getFallbackPlanConfig(), options = {}) {
  if (!units.length) return `0 0 ${roundViewBox(planConfig.mapWidth)} ${roundViewBox(planConfig.mapHeight)}`;
  const bounds = units.map((unit) => getDisplayUnitBounds(unit, planConfig));
  const minX = Math.max(0, Math.min(...bounds.map((bound) => bound.minX)) - padding);
  const minY = Math.max(0, Math.min(...bounds.map((bound) => bound.minY)) - padding);
  const maxX = Math.min(planConfig.mapWidth, Math.max(...bounds.map((bound) => bound.maxX)) + padding);
  const maxY = Math.min(planConfig.mapHeight, Math.max(...bounds.map((bound) => bound.maxY)) + padding);
  let width = Math.max(240, (maxX - minX) / zoom);
  let height = Math.max(160, (maxY - minY) / zoom);
  if (options.fitViewport) {
    ({ width, height } = fitViewBoxSizeToViewport(width, height, planConfig, options.fitScale ?? planConfig.defaultFitScale ?? 1.02, {
      fillViewport: Boolean(options.fillViewport)
    }));
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const maxViewBoxX = Math.max(0, planConfig.mapWidth - width);
  const maxViewBoxY = Math.max(0, planConfig.mapHeight - height);
  const x = Math.min(Math.max(0, centerX - width / 2 + (options.offsetX || 0)), maxViewBoxX);
  const y = Math.min(Math.max(0, centerY - height / 2 + (options.offsetY || 0)), maxViewBoxY);
  return `${roundViewBox(x)} ${roundViewBox(y)} ${roundViewBox(width)} ${roundViewBox(height)}`;
}

function fitViewBoxSizeToViewport(width, height, planConfig, fitScale = 1, options = {}) {
  const aspect = getMapViewportAspectRatio(planConfig);
  let nextWidth = width;
  let nextHeight = height;
  let scale = fitScale;

  if (aspect > 0) {
    if (options.fillViewport) {
      const contentAspect = nextWidth / nextHeight;
      if (aspect >= contentAspect) {
        nextHeight = nextWidth / aspect;
      } else if (nextWidth / nextHeight > aspect) {
        nextHeight = nextWidth / aspect;
        scale = Math.max(1, fitScale);
      } else {
        nextWidth = nextHeight * aspect;
        scale = Math.max(1, fitScale);
      }
      nextWidth = Math.max(240, nextWidth);
      nextHeight = Math.max(160, nextHeight);
    } else if (nextWidth / nextHeight > aspect) {
      nextHeight = nextWidth / aspect;
    } else {
      nextWidth = nextHeight * aspect;
    }
  }

  nextWidth *= scale;
  nextHeight *= scale;

  if (nextWidth > planConfig.mapWidth) {
    const ratio = planConfig.mapWidth / nextWidth;
    nextWidth = planConfig.mapWidth;
    nextHeight *= ratio;
  }

  if (nextHeight > planConfig.mapHeight) {
    const ratio = planConfig.mapHeight / nextHeight;
    nextHeight = planConfig.mapHeight;
    nextWidth *= ratio;
  }

  return {
    width: options.fillViewport ? Math.min(planConfig.mapWidth, nextWidth) : Math.max(width, Math.min(planConfig.mapWidth, nextWidth)),
    height: options.fillViewport ? Math.min(planConfig.mapHeight, nextHeight) : Math.max(height, Math.min(planConfig.mapHeight, nextHeight))
  };
}

function getMapViewportAspectRatio(planConfig) {
  const width = els.mapViewport?.clientWidth || 0;
  const height = els.mapViewport?.clientHeight || 0;
  if (width > 0 && height > 0) return width / height;
  return planConfig.mapWidth / planConfig.mapHeight;
}

function getDisplayUnitBounds(unit, planConfig) {
  if (unit.points?.length) {
    const points = unit.points.map(([x, y]) => getDisplayPoint({ x, y }, planConfig));
    return {
      minX: Math.min(...points.map((point) => point.x)),
      minY: Math.min(...points.map((point) => point.y)),
      maxX: Math.max(...points.map((point) => point.x)),
      maxY: Math.max(...points.map((point) => point.y))
    };
  }

  if (planConfig.rotation === "clockwise90MirrorX") {
    return {
      minX: planConfig.mapWidth - unit.y - unit.height,
      minY: planConfig.mapHeight - unit.x - unit.width,
      maxX: planConfig.mapWidth - unit.y,
      maxY: planConfig.mapHeight - unit.x
    };
  }

  if (planConfig.rotation === "clockwise90") {
    return {
      minX: planConfig.mapWidth - unit.y - unit.height,
      minY: unit.x,
      maxX: planConfig.mapWidth - unit.y,
      maxY: unit.x + unit.width
    };
  }

  if (planConfig.rotation === "counterClockwise90") {
    return {
      minX: unit.y,
      minY: planConfig.mapHeight - unit.x - unit.width,
      maxX: unit.y + unit.height,
      maxY: planConfig.mapHeight - unit.x
    };
  }

  return {
    minX: unit.x,
    minY: unit.y,
    maxX: unit.x + unit.width,
    maxY: unit.y + unit.height
  };
}

function getDisplayPoint(point, planConfig) {
  if (planConfig.rotation === "clockwise90MirrorX") {
    return {
      x: planConfig.mapWidth - point.y,
      y: planConfig.mapHeight - point.x
    };
  }

  if (planConfig.rotation === "clockwise90") {
    return {
      x: planConfig.mapWidth - point.y,
      y: point.x
    };
  }

  if (planConfig.rotation === "counterClockwise90") {
    return {
      x: point.y,
      y: planConfig.mapHeight - point.x
    };
  }

  return point;
}

function roundViewBox(value) {
  return Math.round(value * 100) / 100;
}

function renderMetrics() {
  const summary = operations.summary(filteredRows, getActiveCategory());
  els.totalUnits.textContent = summary.total;
  els.availableUnits.textContent = summary.recorded;
  els.soldUnits.textContent = summary.attention;
  els.readyUnits.textContent = summary.missing;
  els.occupancyRate.textContent = summary.coverage === null ? "-" : formatPercent(summary.coverage);
}

const standardRegisterHeadings = els.unitTable.closest("table").querySelector("thead").innerHTML;

function renderTariffRegister(category) {
  const table = els.unitTable.closest("table");
  table.querySelector("thead").innerHTML = `<tr>${["No.", "Project", "Unit / Building", "Type", "Time Period", "Base Energy (THB/kWh)", "Demand Charge (THB/kW)", "Ft (THB/kWh)", "Service Charge (THB/month)"].map((label) => `<th>${label}</th>`).join("")}</tr>`;
  const definition = (key) => category.fields.find((item) => item.key === key);
  const value = (row, key) => escapeHtml(operations.display(row.operations?.[key], definition(key)));
  els.unitTable.innerHTML = filteredRows.map((row, index) => {
    const periods = operations.tariffPeriods(row);
    const visual = getOperationVisual(row);
    return periods.map((period, periodIndex) => {
      const span = ` rowspan="${periods.length}"`;
      return `<tr data-unit-id="${escapeHtml(row.unitId)}" data-project="${escapeHtml(row.project)}" tabindex="0">${periodIndex ? "" : `<td${span}>${index + 1}</td><td${span}>${escapeHtml(row.project)}</td><td${span}><strong>${escapeHtml(row.unitNo)}</strong></td><td${span}><span class="status-pill" style="${getOperationStyle(visual)}">${value(row, "electricityTariffType")}</span></td>`}<td class="tariff-period-cell">${escapeHtml(period.time || "-")}</td><td class="tariff-number-cell">${escapeHtml(operations.display(period.rate, definition("electricityTariff")).replace(/ THB\/kWh$/, ""))}</td>${periodIndex ? "" : ["electricityDemandCharge", "electricityFt", "electricityServiceCharge"].map((key) => `<td${span} class="tariff-number-cell">${value(row, key).replace(/ THB\/(?:kW|kWh|month)$/, "")}</td>`).join("")}</tr>`;
    }).join("");
  }).join("") || '<tr><td colspan="9" class="empty-register">No units match the current filters.</td></tr>';
}

function renderTable() {
  const category = getActiveCategory();
  const table = els.unitTable.closest("table");
  if (table.dataset.category === "tariff" && category.id !== "tariff") table.querySelector("thead").innerHTML = standardRegisterHeadings;
  table.dataset.category = category.id;
  document.querySelector("#registerTitle").textContent = category.name;
  if (category.id === "tariff") {
    renderTariffRegister(category);
    return;
  }
  const secondary = category.fields[1];
  const date = category.fields.find((definition) => definition.key.endsWith("Date"));
  document.querySelector("#registerTitle").textContent = category.name;
  document.querySelector("#operationValueHeading").textContent = category.fields[0].label;
  document.querySelector("#operationInfoHeading").textContent = category.id === "slab" ? "Office Renovated" : secondary.label;
  document.querySelector("#operationDateHeading").textContent = date?.label || "Notes";
  document.querySelector("#operationDateHeading").hidden = category.id === "electrical";
  els.unitTable.innerHTML = filteredRows
    .map((row) => {
      const visual = getOperationVisual(row);
      const officeVisual = category.id === "slab" ? operations.floorVisual(row, "office") : null;
      const hasData = visual.recorded || Boolean(officeVisual?.recorded);
      const dateOrNotes = date || category.fields.at(-1);
      return `
        <tr data-unit-id="${escapeHtml(row.unitId)}" data-project="${escapeHtml(row.project)}" tabindex="0">
          <td><strong>${escapeHtml(row.unitNo)}</strong></td>
          <td>${escapeHtml(row.block)}</td>
          <td><span class="status-pill" style="${getOperationStyle(category.id === "electrical" ? operations.renovationVisual(row, "electrical") : visual)}">${escapeHtml(category.id === "electrical" ? operations.renovationVisual(row, "electrical").label : visual.label)}</span></td>
          <td>${formatArea(row.warehouseArea ?? row.area)}</td>
          <td>${hasData ? "Recorded" : "No data"}</td>
          <td>${category.id === "electrical" ? `<span class="status-pill" style="${getOperationStyle(operations.renovationVisual(row, "plumbing"))}">${escapeHtml(operations.renovationVisual(row, "plumbing").label)}</span>`
            : officeVisual ? operations.hasOffice(row)
            ? `<span class="office-completion-tick" role="img" aria-label="Office renovated" title="Office renovated">${officeIconSvg()}</span>`
            : operations.officeCompletion(row) === false ? '<span title="Not marked complete">&#8212;</span>' : "-"
            : escapeHtml(operations.display(row.operations?.[secondary.key], secondary))}</td>
          <td${category.id === "electrical" ? " hidden" : ""}>${escapeHtml(operations.display(row.operations?.[dateOrNotes.key], dateOrNotes))}</td>
          <td>${escapeHtml(row.owner || "-")}</td>
        </tr>
      `;
    })
    .join("");

  if (!filteredRows.length) els.unitTable.innerHTML = '<tr><td colspan="8" class="empty-register">No units match the current filters.</td></tr>';
}

function refreshUnitRegister() {
  const url = getConfiguredSheetUrl();
  if (isGoogleSheetUrl(url)) {
    connectSheetUrl(url);
    return;
  }

  applyFilters();
  updateClock();
  setDataStatus("Unit register refreshed from current local data. Google Sheet URL is not configured.", true);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result), { once: true });
    reader.addEventListener("error", () => reject(reader.error || new Error("Unable to read the plan image.")), { once: true });
    reader.readAsDataURL(blob);
  });
}

async function getExportCss() {
  const localStyles = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map((link) => link.href)
    .filter((href) => {
      try {
        return new URL(href, document.baseURI).origin === window.location.origin;
      } catch {
        return false;
      }
    });
  const cssParts = await Promise.all(localStyles.map(async (href) => {
    const response = await fetch(href, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Unable to load export styles (${response.status}).`);
    return response.text();
  }));
  return cssParts.join("\n");
}

async function embedExportPlanImage(exportRoot) {
  const image = exportRoot.querySelector("#masterPlanImage");
  if (!image || image.hidden) return;
  const href = image.getAttribute("href") || image.getAttribute("xlink:href");
  if (!href || href.startsWith("data:")) return;
  const response = await fetch(new URL(href, document.baseURI), { credentials: "same-origin" });
  if (!response.ok) throw new Error(`Unable to load the site plan (${response.status}).`);
  const dataUrl = await blobToDataUrl(await response.blob());
  image.setAttribute("href", dataUrl);
  image.removeAttribute("xlink:href");
}

function loadExportImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error("The browser could not render the PNG frame.")), { once: true });
    image.src = url;
  });
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The browser could not create the PNG file.")), "image/png", 1);
  });
}

function roundedRectPath(context, x, y, width, height, radius = 10) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawExportPanel(context, x, y, width, height, radius = 11) {
  const fill = context.createLinearGradient(x, y, x + width, y + height);
  fill.addColorStop(0, "rgba(12, 29, 38, 0.98)");
  fill.addColorStop(1, "rgba(5, 16, 23, 0.99)");
  roundedRectPath(context, x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = "rgba(84, 204, 226, 0.34)";
  context.lineWidth = 1.2;
  context.stroke();
}

function drawExportHeading(context, text, x, y) {
  context.fillStyle = "#31d8ff";
  context.fillRect(x, y - 12, 4, 14);
  context.fillStyle = "#dff7fb";
  context.font = '700 16px "Segoe UI", Arial, sans-serif';
  context.textBaseline = "alphabetic";
  context.fillText(text, x + 12, y);
}

function drawExportPill(context, text, x, y, width, height) {
  roundedRectPath(context, x, y, width, height, 8);
  context.fillStyle = "rgba(49, 216, 255, 0.09)";
  context.fill();
  context.strokeStyle = "rgba(132, 245, 255, 0.32)";
  context.stroke();
  context.fillStyle = "#e5fbff";
  context.font = '700 12px "Segoe UI", Arial, sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x + width / 2, y + height / 2 + 0.5);
  context.textAlign = "start";
  context.textBaseline = "alphabetic";
}

function drawExportGrid(context, x, y, width, height) {
  context.save();
  roundedRectPath(context, x, y, width, height, 10);
  context.clip();
  const fill = context.createRadialGradient(x + width * 0.62, y + height * 0.25, 0, x + width * 0.62, y + height * 0.25, width * 0.68);
  fill.addColorStop(0, "#0d2631");
  fill.addColorStop(0.46, "#091923");
  fill.addColorStop(1, "#061017");
  context.fillStyle = fill;
  context.fillRect(x, y, width, height);
  context.strokeStyle = "rgba(49, 216, 255, 0.055)";
  context.lineWidth = 1;
  for (let lineX = x; lineX <= x + width; lineX += 44) {
    context.beginPath();
    context.moveTo(lineX, y);
    context.lineTo(lineX, y + height);
    context.stroke();
  }
  for (let lineY = y; lineY <= y + height; lineY += 44) {
    context.beginPath();
    context.moveTo(x, lineY);
    context.lineTo(x + width, lineY);
    context.stroke();
  }
  context.restore();
  roundedRectPath(context, x, y, width, height, 10);
  context.strokeStyle = "rgba(132, 245, 255, 0.16)";
  context.stroke();
}

async function createExportMapImage(width, height) {
  const map = els.unitMap.cloneNode(true);
  map.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  map.setAttribute("width", String(width));
  map.setAttribute("height", String(height));
  map.setAttribute("viewBox", getPlanDefaultViewBox(getActivePlanConfig()));
  map.removeAttribute("style");
  await embedExportPlanImage(map);

  const defs = map.querySelector("defs") || map.insertBefore(document.createElementNS("http://www.w3.org/2000/svg", "defs"), map.firstChild);
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = await getExportCss();
  defs.appendChild(style);

  const serialized = new XMLSerializer().serializeToString(map);
  const url = URL.createObjectURL(new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }));
  try {
    return { image: await loadExportImage(url), url };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function drawExportMetric(context, label, value, color, x, y, width, height) {
  roundedRectPath(context, x, y, width, height, 9);
  const fill = context.createLinearGradient(x, y, x + width, y + height);
  fill.addColorStop(0, `${color}2b`);
  fill.addColorStop(1, "rgba(7, 20, 28, 0.94)");
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = `${color}76`;
  context.stroke();
  context.fillStyle = "#9ab2bc";
  context.font = '700 11px "Segoe UI", Arial, sans-serif';
  context.fillText(label.toUpperCase(), x + 12, y + 20);
  context.fillStyle = color;
  context.font = '800 27px "Segoe UI", Arial, sans-serif';
  context.fillText(String(value), x + 12, y + 50);
}

function getExportLegendGroups() {
  const sections = [...els.legend.querySelectorAll(".floor-legend-section")];
  const groups = sections.length ? sections : [els.legend];
  return groups.map((section) => ({
    title: section.querySelector("h4")?.textContent?.trim() || (sections.length ? "" : "Status"),
    items: [...section.querySelectorAll(".legend-item")].map((item) => ({
      label: item.querySelector("span:not(.legend-count)")?.textContent?.trim() || item.textContent.trim(),
      count: item.querySelector(".legend-count")?.textContent?.trim() || "",
      color: getComputedStyle(item).getPropertyValue("--status-color").trim() || "#31d8ff",
      dashed: item.classList.contains("is-planned")
    }))
  })).filter((group) => group.title || group.items.length);
}

function drawExportRightRail(context, x, y, width, height) {
  const gap = 14;
  const coverageHeight = 82;
  const summaryHeight = 340;
  const legendY = y + coverageHeight + gap + summaryHeight + gap;
  const legendHeight = height - coverageHeight - summaryHeight - gap * 2;

  drawExportPanel(context, x, y, width, coverageHeight);
  drawExportHeading(context, "DATA COVERAGE", x + 14, y + 29);
  context.fillStyle = "#31d8ff";
  context.font = '800 30px "Segoe UI", Arial, sans-serif';
  context.textAlign = "right";
  context.fillText(`${els.occupancyRate.textContent.trim()}%`, x + width - 14, y + 57);
  context.textAlign = "start";

  const summaryY = y + coverageHeight + gap;
  drawExportPanel(context, x, summaryY, width, summaryHeight);
  drawExportHeading(context, "Category Summary", x + 14, summaryY + 29);
  const metrics = [
    ["Total Units", els.totalUnits.textContent.trim(), "#31d8ff"],
    ["Recorded", els.availableUnits.textContent.trim(), "#60bfff"],
    ["Needs Attention", els.soldUnits.textContent.trim(), "#ff879a"],
    ["No Data", els.readyUnits.textContent.trim(), "#869bad"]
  ];
  metrics.forEach((metric, index) => drawExportMetric(context, metric[0], metric[1], metric[2], x + 14, summaryY + 46 + index * 70, width - 28, 58));

  drawExportPanel(context, x, legendY, width, legendHeight);
  drawExportHeading(context, "Legend", x + 14, legendY + 29);
  let cursorY = legendY + 54;
  const bottom = legendY + legendHeight - 12;
  getExportLegendGroups().forEach((group) => {
    if (cursorY + 20 > bottom) return;
    if (group.title) {
      context.fillStyle = "#9bb5bf";
      context.font = '700 11px "Segoe UI", Arial, sans-serif';
      context.fillText(group.title, x + 14, cursorY);
      cursorY += 14;
    }
    group.items.forEach((item) => {
      if (cursorY + 30 > bottom) return;
      roundedRectPath(context, x + 14, cursorY, width - 28, 26, 7);
      context.fillStyle = "rgba(8, 25, 33, 0.76)";
      context.fill();
      context.strokeStyle = `${item.color}58`;
      context.setLineDash(item.dashed ? [4, 3] : []);
      context.stroke();
      context.setLineDash([]);
      roundedRectPath(context, x + 22, cursorY + 8, 18, 10, 3);
      context.fillStyle = item.color;
      context.fill();
      context.fillStyle = "#d8edf2";
      context.font = '700 10px "Segoe UI", Arial, sans-serif';
      context.fillText(item.label.toUpperCase(), x + 48, cursorY + 17, width - 92);
      if (item.count) {
        context.textAlign = "right";
        context.fillText(item.count, x + width - 22, cursorY + 17);
        context.textAlign = "start";
      }
      cursorY += 31;
    });
    cursorY += 5;
  });
}

async function exportSiteMapPng() {
  if (els.projectFilter.value === "all") {
    setDataStatus("Select a site before exporting a 16:9 PNG.", true);
    return;
  }

  const originalLabel = els.exportPngBtn.querySelector("span")?.textContent || "PNG 16:9";
  els.exportPngBtn.disabled = true;
  const label = els.exportPngBtn.querySelector("span");
  if (label) label.textContent = "Preparing...";

  let pngUrl = "";
  let mapUrl = "";
  try {
    await document.fonts?.ready;
    const canvas = document.createElement("canvas");
    canvas.width = PNG_EXPORT_WIDTH;
    canvas.height = PNG_EXPORT_HEIGHT;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas export is not supported by this browser.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const pageGradient = context.createLinearGradient(0, 0, PNG_EXPORT_WIDTH, PNG_EXPORT_HEIGHT);
    pageGradient.addColorStop(0, "#07141b");
    pageGradient.addColorStop(0.6, "#071119");
    pageGradient.addColorStop(1, "#040b10");
    context.fillStyle = pageGradient;
    context.fillRect(0, 0, PNG_EXPORT_WIDTH, PNG_EXPORT_HEIGHT);

    const margin = 18;
    const gap = 14;
    const railWidth = 268;
    const frameHeight = PNG_EXPORT_HEIGHT - margin * 2;
    const mapCardWidth = PNG_EXPORT_WIDTH - margin * 2 - gap - railWidth;
    drawExportPanel(context, margin, margin, mapCardWidth, frameHeight, 12);

    const contentX = margin + 14;
    const contentWidth = mapCardWidth - 28;
    const titleY = margin + 34;
    context.fillStyle = "#e7f5f8";
    context.font = '800 28px "Segoe UI", Arial, sans-serif';
    context.fillText(els.projectTitle.textContent.trim(), contentX, titleY, contentWidth - 360);
    context.fillStyle = "#a3bbc4";
    context.font = '500 14px "Segoe UI", Arial, sans-serif';
    context.fillText(els.projectSubtitle.textContent.trim(), contentX, titleY + 27);

    const controlsY = margin + 22;
    const overviewWidth = 86;
    const smallButtonWidth = 38;
    const controlsRight = margin + mapCardWidth - 14;
    drawExportPill(context, "Overview", controlsRight - overviewWidth, controlsY, overviewWidth, 36);
    drawExportPill(context, "+", controlsRight - overviewWidth - 5 - smallButtonWidth, controlsY, smallButtonWidth, 36);
    drawExportPill(context, "−", controlsRight - overviewWidth - 10 - smallButtonWidth * 2, controlsY, smallButtonWidth, 36);
    context.fillStyle = "#9ab2bc";
    context.font = '500 13px "Segoe UI", Arial, sans-serif';
    context.textAlign = "right";
    context.fillText(els.visibleCount.textContent.trim(), controlsRight - overviewWidth - smallButtonWidth * 2 - 24, controlsY + 23);
    context.textAlign = "start";

    const mapY = margin + 82;
    const mapHeight = frameHeight - 96;
    drawExportGrid(context, contentX, mapY, contentWidth, mapHeight);
    const mapAsset = await createExportMapImage(contentWidth, mapHeight);
    mapUrl = mapAsset.url;
    context.save();
    roundedRectPath(context, contentX, mapY, contentWidth, mapHeight, 10);
    context.clip();
    context.drawImage(mapAsset.image, contentX, mapY, contentWidth, mapHeight);
    context.restore();

    drawExportRightRail(context, margin + mapCardWidth + gap, margin, railWidth, frameHeight);

    const png = await canvasToPngBlob(canvas);
    pngUrl = URL.createObjectURL(png);
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `renovation-${slugify(els.projectFilter.value)}-${slugify(getActiveCategory().name)}-${getExportTimestamp()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setDataStatus(`Exported ${els.projectFilter.value} as a 1920 x 1080 PNG.`);
  } catch (error) {
    console.error("PNG export failed", error);
    setDataStatus(`PNG export failed: ${error.message}`, true);
  } finally {
    if (mapUrl) URL.revokeObjectURL(mapUrl);
    if (pngUrl) window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
    els.exportPngBtn.disabled = false;
    if (label) label.textContent = originalLabel;
  }
}

function exportVisibleUnitsCsv() {
  if (!filteredRows.length) {
    setDataStatus("No visible units to export.", true);
    return;
  }

  const columns = [
    ...(activeCategoryId === "tariff" ? [["project", "Project"], ["unitNo", "Unit / Building"]] : [
    ["project", "Project"],
    ["block", "Block"],
    ["unitNo", "Unit"],
    ["unitType", "Type"],
    ["warehouseArea", "Warehouse Area"],
    ["officeArea", "Office Area"],
    ["loadCapacity", "Load Capacity"],
    ["owner", "Owner"],
    ["remark", "Remark"]]),
    ...[...getActiveCategory().fields, ...(getActiveCategory().officeFields || [])].map((definition) => [definition.key,
      activeCategoryId === "slab" ? `${definition.key.startsWith("office") ? "Office Floor" : "Warehouse Floor"}: ${definition.label}` : definition.label])
  ];
  const csv = [
    columns.map(([, label]) => escapeCsvValue(label)).join(","),
    ...filteredRows.map((row) => columns.map(([key]) => escapeCsvValue(row.operations?.[key] ?? row[key] ?? "")).join(","))
  ].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  const projectName = els.projectFilter.value === "all" ? "all-projects" : els.projectFilter.value;
  link.href = URL.createObjectURL(blob);
  link.download = `warehouse-unit-register-${slugify(projectName)}-${getExportTimestamp()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  setDataStatus(`Exported ${filteredRows.length} visible unit${filteredRows.length === 1 ? "" : "s"} to CSV.`);
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function slugify(value) {
  return String(value || "project").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
}

function getExportTimestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function selectUnit(unitId, projectName) {
  if (mapSuppressClick) return;
  if (projectName && (els.projectFilter.value === "all" || !rowMatchesProject({ project: projectName }, els.projectFilter.value))) {
    els.projectFilter.value = projectName;
    mapZoomMode = "all";
    mapZoomLevel = 1;
    applyFilters();
  }
  if (!rowMatchesUnit({ unitId: selectedUnitId, unitNo: selectedUnitId }, unitId)) {
    renovationWriteFeedback = null;
  }
  selectedUnitId = unitId;
  updateSelectedUnitShape();
  renderDetail();
}

function updateSelectedUnitShape() {
  if (selectedOfficeNode) {
    selectedOfficeNode.classList.remove("is-selected");
  }
  selectedOfficeNode = officeNodes.get(selectedUnitId) || null;
  if (selectedOfficeNode) {
    selectedOfficeNode.classList.add("is-selected");
    els.unitOfficeLayer.appendChild(selectedOfficeNode);
  }
  if (selectedShapeNode) {
    selectedShapeNode.classList.remove("is-selected");
    selectedShapeNode.setAttribute("aria-pressed", "false");
    selectedShapeParent?.appendChild(selectedShapeNode);
  }
  selectedShapeNode = unitNodes.get(selectedUnitId) || null;
  selectedShapeParent = null;
  if (!selectedShapeNode) return;
  const block = selectedShapeNode.dataset.block;
  selectedShapeParent = [...els.unitLayer.querySelectorAll(".block-unit-layer")].find((node) => node.dataset.block === block);
  if (!selectedShapeParent) {
    selectedShapeParent = document.createElementNS("http://www.w3.org/2000/svg", "g");
    selectedShapeParent.classList.add("block-unit-layer");
    selectedShapeParent.dataset.block = block;
    els.unitLayer.insertBefore(selectedShapeParent, els.unitLayer.querySelector(".selected-unit-layer"));
  }
  selectedShapeNode.classList.add("is-selected");
  selectedShapeNode.setAttribute("aria-pressed", "true");
  els.unitLayer.querySelector(".selected-unit-layer")?.appendChild(selectedShapeNode);
  const label = [...els.unitLabelLayer.children].find((node) => node.dataset.unitLabel === selectedUnitId);
  if (label) els.unitLabelLayer.appendChild(label);
}

function clearSelection() {
  if (!selectedUnitId) return;
  selectedUnitId = null;
  updateSelectedUnitShape();
  renderDetail();
}

function handleMapClick(event) {
  if (mapSuppressClick) return;
  const work = event.target.closest("[data-work-unit]");
  if (work) {
    selectUnit(work.dataset.workUnit);
    return;
  }
  const office = event.target.closest("[data-office-unit]");
  if (office) {
    selectUnit(office.dataset.officeUnit);
    return;
  }
  const node = event.target.closest(".unit-group");
  if (node) {
    selectUnit(node.dataset.unitId);
    return;
  }
  clearSelection();
}

function handlePageClick(event) {
  if (mapSuppressClick) return;
  if (!selectedUnitId) return;
  if (event.target.closest(".unit-group, [data-office-unit], [data-work-unit], #detailCard, #unitTable tr, button, input, select, label")) return;
  clearSelection();
}

function renderDetail() {
  const selectedProject = els.projectFilter.value;
  const row = unitRows.find((item) => rowMatchesUnit(item, selectedUnitId) && rowMatchesProject(item, selectedProject))
    || unitRows.find((item) => rowMatchesUnit(item, selectedUnitId));
  const category = getActiveCategory();
  if (!row) {
    els.detailCard.hidden = true;
    els.detailCard.classList.remove("is-open");
    els.detailTitle.textContent = "Select a unit";
    els.operationDetails.replaceChildren();
    els.renovationEditor.hidden = true;
    return;
  }

  els.detailCard.hidden = false;
  els.detailCard.classList.add("is-open");
  els.detailTitle.textContent = row.unitNo;
  els.detailCategory.textContent = category.name;
  const isSlab = category.id === "slab";
  const definitions = category.id === "tariff" && operations.tariffPeriods(row).length === 1
    ? category.fields.filter((definition) => !["electricityTimePeriod2", "electricityTariff2"].includes(definition.key)) : category.fields;
  const area = formatArea(row.warehouseArea ?? row.area);
  const fields = [...(category.id === "tariff" ? [["Project", row.project || "-"]] : [["Block", row.block || "-"], ["Warehouse Area", area]]),
    ...definitions.map((definition) => [definition.key === "electricalStatus" ? "Electrical" : definition.key === "plumbingStatus" ? "Pumbling" : definition.label, operations.display(row.operations?.[definition.key], definition)])];
  els.operationDetails.innerHTML = fields.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  els.operationEmptyState.hidden = isSlab ? operations.hasFloorData(row, "warehouse") : getOperationVisual(row).recorded;
  els.operationEmptyState.textContent = `No ${isSlab ? "warehouse floor" : category.name.toLowerCase()} data in the connected sheet.`;
  renderRenovationEditor(row, category);
}

function normalizeRenovationEditorValue(field, value) {
  const text = String(value ?? "").trim();
  if (field?.kind === "boolean") {
    const key = text.toLowerCase();
    if (["true", "yes", "1", "checked", "renovated", "completed"].includes(key)) return "TRUE";
    if (["false", "no", "0", "unchecked", "not renovated", "notrenovated", "not completed"].includes(key)) return "FALSE";
  }
  if (field?.kind === "number" && text) {
    const numeric = Number(text.replaceAll(",", ""));
    if (Number.isFinite(numeric)) return String(numeric);
  }
  return text;
}

function renderRenovationField(field, row) {
  const rawValue = row.operations?.[field.key] ?? "";
  const currentValue = normalizeRenovationEditorValue(field, rawValue);
  const inputId = `renovation-field-${field.key}`;
  const common = `id="${escapeHtml(inputId)}" data-renovation-field="${escapeHtml(field.key)}" data-current-value="${escapeHtml(currentValue)}" aria-describedby="renovationWriteMessage"`;
  let control = "";

  if (field.kind === "select" || field.kind === "boolean") {
    const configuredOptions = Array.isArray(field.options) ? field.options : [];
    const options = configuredOptions.some((option) => String(option.value).toLowerCase() === currentValue.toLowerCase()) || !currentValue
      ? configuredOptions
      : [{ value: currentValue, label: `${currentValue} (current)` }, ...configuredOptions];
    control = `<select ${common}>
      <option value="" ${currentValue ? "disabled" : "selected disabled"}>Select...</option>
      ${options.map((option) => `<option value="${escapeHtml(option.value)}" ${String(option.value).toLowerCase() === currentValue.toLowerCase() ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
    </select>`;
  } else if (field.multiline) {
    control = `<textarea ${common} maxlength="${Number(field.maxLength || 500)}">${escapeHtml(currentValue)}</textarea>`;
  } else {
    const type = field.kind === "date" ? "date" : field.kind === "number" || field.kind === "year" ? "number" : "text";
    const attributes = field.kind === "year"
      ? 'min="1900" max="2099" step="1"'
      : field.kind === "number"
        ? `step="${escapeHtml(field.step || "any")}"`
        : `maxlength="${Number(field.maxLength || 200)}"`;
    control = `<input ${common} type="${type}" value="${escapeHtml(currentValue)}" ${attributes} />`;
  }

  return `<div class="renovation-editor__field" data-renovation-field-row="${escapeHtml(field.key)}">
    <label for="${escapeHtml(inputId)}">${escapeHtml(field.label)}</label>
    ${control}
  </div>`;
}

function getRenovationOperationConfig(categoryId = activeCategoryId) {
  return renovationWriteConfig.operations?.[categoryId] || null;
}

function getRenovationEditorChanges() {
  const operation = getRenovationOperationConfig();
  if (!operation) return [];
  return operation.fields.flatMap((field) => {
    const input = els.renovationFields.querySelector(`[data-renovation-field="${field.key}"]`);
    if (!input) return [];
    const expectedValue = normalizeRenovationEditorValue(field, input.dataset.currentValue || "");
    const value = normalizeRenovationEditorValue(field, input.value);
    if (!value || value.toLowerCase() === expectedValue.toLowerCase()) return [];
    return [{ field: field.key, value, expectedValue }];
  });
}

function updateRenovationEditorState({ clearFeedback = false } = {}) {
  const canWrite = renovationWriteConfig.state === "ready" && renovationWriteConfig.enabled;
  const changes = getRenovationEditorChanges();
  els.renovationFields.querySelectorAll("[data-renovation-field]").forEach((input) => {
    input.disabled = !canWrite || renovationWritePending;
    const field = getRenovationOperationConfig()?.fields.find((item) => item.key === input.dataset.renovationField);
    const current = normalizeRenovationEditorValue(field, input.dataset.currentValue || "");
    const next = normalizeRenovationEditorValue(field, input.value);
    input.closest(".renovation-editor__field")?.classList.toggle("is-changed", Boolean(next) && next.toLowerCase() !== current.toLowerCase());
  });
  els.saveRenovationBtn.disabled = !canWrite || renovationWritePending || !changes.length;
  els.saveRenovationBtn.textContent = renovationWritePending ? "Saving..." : `Save changes${changes.length ? ` (${changes.length})` : ""}`;
  if (clearFeedback) renovationWriteFeedback = null;
  if (clearFeedback || !renovationWriteFeedback) {
    els.renovationWriteMessage.textContent = renovationWriteConfig.reason;
    els.renovationWriteMessage.classList.toggle("is-error", renovationWriteConfig.state === "error");
    els.renovationWriteMessage.classList.remove("is-success");
  }
}

function renderRenovationEditor(row, category) {
  const operation = getRenovationOperationConfig(category.id);
  const projectEnabled = renovationWriteConfig.projects.includes(row.project);
  els.renovationEditor.hidden = !operation || !projectEnabled;
  if (!operation || !projectEnabled) return;

  els.renovationEditorTitle.textContent = `Update ${operation.label || category.name}`;
  els.renovationFields.innerHTML = operation.fields.map((field) => renderRenovationField(field, row)).join("");
  const feedback = renovationWriteFeedback
    && rowMatchesUnit(row, renovationWriteFeedback.unitId)
    && renovationWriteFeedback.operation === category.id
    ? renovationWriteFeedback
    : null;
  els.renovationWriteMessage.textContent = feedback?.message || renovationWriteConfig.reason;
  els.renovationWriteMessage.classList.toggle("is-error", feedback?.kind === "error" || renovationWriteConfig.state === "error");
  els.renovationWriteMessage.classList.toggle("is-success", feedback?.kind === "success");
  updateRenovationEditorState();
}

async function loadRenovationWriteConfig() {
  renovationWriteConfig = {
    ...renovationWriteConfig,
    state: "loading",
    reason: "Checking live write access..."
  };
  renderDetail();
  try {
    const response = await fetch(RENOVATION_STATUS_API, {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Write access check failed (${response.status}).`);
    renovationWriteConfig = {
      state: "ready",
      enabled: Boolean(payload.enabled),
      projects: Array.isArray(payload.projects) ? payload.projects.map((value) => String(value)) : [],
      operations: payload.operations && typeof payload.operations === "object" ? payload.operations : {},
      reason: payload.reason || (payload.enabled ? "Live write is ready." : "Live write is locked.")
    };
  } catch (error) {
    renovationWriteConfig = {
      ...renovationWriteConfig,
      state: "error",
      enabled: false,
      reason: error?.message || "Unable to check renovation write access."
    };
  }
  renderDetail();
}

function updateLocalRenovationFields(project, unitId, values) {
  const updateRows = (rows) => rows.forEach((row) => {
    if (!rowMatchesProject(row, project) || !rowMatchesUnit(row, unitId)) return;
    row.operations = { ...(row.operations || {}), ...values };
  });
  updateRows(syncedUnitRows);
  updateRows(unitRows);
}

async function saveSelectedRenovationFields() {
  if (renovationWritePending || !renovationWriteConfig.enabled) return;
  const selectedProject = els.projectFilter.value;
  const row = unitRows.find((item) => rowMatchesUnit(item, selectedUnitId) && rowMatchesProject(item, selectedProject))
    || unitRows.find((item) => rowMatchesUnit(item, selectedUnitId));
  const changes = getRenovationEditorChanges();
  if (!row || !changes.length || !renovationWriteConfig.projects.includes(row.project)) return;
  const operationId = activeCategoryId;

  renovationWritePending = true;
  renovationWriteFeedback = {
    kind: "pending",
    unitId: row.unitId || row.unitNo,
    operation: operationId,
    message: `Saving ${changes.length} field${changes.length === 1 ? "" : "s"} for ${row.unitNo}...`
  };
  els.renovationWriteMessage.textContent = renovationWriteFeedback.message;
  els.renovationWriteMessage.classList.remove("is-error", "is-success");
  updateRenovationEditorState();

  try {
    const response = await fetch(RENOVATION_STATUS_API, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        project: row.project,
        operation: operationId,
        unitId: row.unitNo || row.unitId,
        changes
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || payload.detail || `Save failed (${response.status}).`);
    const savedValues = payload.result?.values && typeof payload.result.values === "object" ? payload.result.values : {};
    updateLocalRenovationFields(row.project, row.unitNo || row.unitId, savedValues);
    renovationWriteFeedback = {
      kind: "success",
      unitId: row.unitId || row.unitNo,
      operation: operationId,
      message: `Saved ${row.unitNo}: ${payload.result?.changedFields?.length || 0} field${payload.result?.changedFields?.length === 1 ? "" : "s"} updated.`
    };
    renovationWritePending = false;
    applyFilters();
  } catch (error) {
    renovationWritePending = false;
    renovationWriteFeedback = {
      kind: "error",
      unitId: row.unitId || row.unitNo,
      operation: operationId,
      message: error?.message || "Unable to save renovation data."
    };
    els.renovationWriteMessage.textContent = renovationWriteFeedback.message;
    els.renovationWriteMessage.classList.add("is-error");
    els.renovationWriteMessage.classList.remove("is-success");
    updateRenovationEditorState();
  }
}

function clearFilters() {
  els.projectFilter.value = "all";
  els.phaseFilter.value = "all";
  els.statusFilter.value = "all";
  applyFilters();
}

function showOverviewPlan() {
  if (els.projectFilter.value === "all") {
    fitPortfolioMapToProjects(portfolioMapProjects, { animate: true });
    updatePortfolioMapControls();
    return;
  }
  mapZoomMode = "all";
  mapZoomLevel = MAP_ZOOM_MIN;
  fitMapToVisibleUnits();
}

function zoomMap(direction) {
  if (els.fitVisibleBtn.disabled) return;
  if (els.projectFilter.value === "all") {
    if (!portfolioMap) return;
    if (direction > 0) {
      portfolioMap.zoomIn({ duration: 260 });
    } else {
      portfolioMap.zoomOut({ duration: 260 });
    }
    updatePortfolioMapControls();
    return;
  }
  const nextZoom = Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, mapZoomLevel + direction * MAP_ZOOM_STEP));
  if (nextZoom === mapZoomLevel) return;
  mapZoomMode = "all";
  mapZoomLevel = Number(nextZoom.toFixed(2));
  els.unitMap.setAttribute("viewBox", getPlanDefaultViewBox(getActivePlanConfig()));
  applyMapZoomState({ preserveCenter: true });
}

function updateClock() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(now).replace(/ /g, "-");
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now);
  els.lastUpdated.textContent = `${date} ${time}`;
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }
  row.push(current);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function mapCsvRows(rows) {
  const [header, ...body] = rows;
  const keys = header.map((key) => normalize(key));
  return body.map((line) => {
    const row = Object.fromEntries(keys.map((key, index) => [key, line[index] || ""]));
    return {
      unitId: row.unitid || row["unit layout id"] || row["layoutid"] || row.id || row.unitno || row.unit || row["unit number"],
      project: row.project || PROJECT_NAME,
      phase: row.phase || row.block,
      block: row.block,
      unitNo: row.unitno || row.unit || row["unit number"],
      unitType: row.unittype || row.type || row["unit type"],
      warehouseArea: Number(row.warehousearea || row["warehouse area"] || row.area || 0),
      officeArea: Number(row.officearea || row["office area"] || 0),
      loadCapacity: parseOptionalNumber(row.loadcapacity || row["load capacity"] || ""),
      area: Number(row.warehousearea || row["warehouse area"] || row.area || 0),
      price: Number(row.price || row.sellingprice || row["selling price"] || 0),
      status: normalizeStatus(row.status),
      progress: Number(row.progress || row.constructionprogress || row["construction progress"] || 0),
      customer: row.customer || row.ownername || "",
      contractDate: row.contractdate || row["contract date"] || "",
      transferDate: row.transferdate || row["transfer date"] || "",
      contractTermYears: Number(row.contracttermyears || row["contract term years"] || row.contractterm || row["contract term"] || 0),
      contractEndDate: row.contractenddate || row["contract end date"] || calculateContractEndDate(row.transferdate || row["transfer date"], row.contracttermyears || row["contract term years"] || row.contractterm || row["contract term"]),
      defectStatus: row.defectstatus || row["defect status"] || "",
      paymentStatus: row.paymentstatus || row["payment status"] || "",
      owner: row.owner || row.responsible || "",
      remark: row.remark || "",
      projectLocation: row.projectlocation || row["project location"] || row.location || row.zone || "",
      projectZone: row.projectzone || row["project zone"] || row.zone || "",
      projectStatus: row.projectstatus || row["project status"] || "",
      projectType: row.projecttype || row["project type"] || row.type || "",
      projectImage: row.projectimage || row["project image"] || row.thumbnail || row.image || "",
      projectRoute: row.projectroute || row["project route"] || row.route || row.url || "",
      projectId: row.projectid || row["project id"] || "",
      projectSlug: row.projectslug || row["project slug"] || row.slug || "",
      lat: parseOptionalNumber(row.lat || row.latitude || ""),
      lng: parseOptionalNumber(row.lng || row.lon || row.long || row.longitude || ""),
      nla: parseOptionalNumber(row.nla || row["net leasable area"] || ""),
      trendQ1: parseOptionalNumber(row.q1 || row["q1 occupancy"] || row["occupancy q1"] || ""),
      trendQ2: parseOptionalNumber(row.q2 || row["q2 occupancy"] || row["occupancy q2"] || ""),
      trendQ3: parseOptionalNumber(row.q3 || row["q3 occupancy"] || row["occupancy q3"] || ""),
      trendQ4: parseOptionalNumber(row.q4 || row["q4 occupancy"] || row["occupancy q4"] || ""),
      operations: operations.fromSheet(row)
    };
  }).filter((row) => row.unitId && row.unitNo);
}

function mapObjectRows(rows, fallbackProject = PROJECT_NAME) {
  return rows.map((source) => {
    const row = Object.fromEntries(Object.entries(source).map(([key, value]) => [normalize(key).replace(/\s/g, ""), value]));
    const transferDate = row.transferdate || "";
    const contractTermYears = row.contracttermyears || row.contractterm || "";
    return {
      unitId: row.unitid || row.unitlayoutid || row.layoutid || row.id || row.unitno || row.unit || row.unitnumber,
      project: fallbackProject || row.project || PROJECT_NAME,
      phase: row.phase || row.block,
      block: row.block,
      unitNo: row.unitno || row.unit || row.unitnumber || row.unitid,
      unitType: row.unittype || row.type || "Factory/Warehouse",
      warehouseArea: Number(row.warehousearea || row.area || 0),
      officeArea: Number(row.officearea || 0),
      loadCapacity: parseOptionalNumber(row.loadcapacity || ""),
      area: Number(row.warehousearea || row.area || 0),
      status: normalizeStatus(row.status),
      customer: row.customer || row.ownername || "",
      transferDate,
      contractTermYears: Number(contractTermYears || 0),
      contractEndDate: row.contractenddate || calculateContractEndDate(transferDate, contractTermYears),
      owner: row.owner || row.responsible || "",
      remark: row.remark || "",
      projectLocation: row.projectlocation || row.location || row.zone || "",
      projectZone: row.projectzone || row.zone || "",
      projectStatus: row.projectstatus || "",
      projectType: row.projecttype || row.type || "",
      projectImage: row.projectimage || row.thumbnail || row.image || "",
      projectRoute: row.projectroute || row.route || row.url || "",
      projectId: row.projectid || "",
      projectSlug: row.projectslug || row.slug || "",
      lat: parseOptionalNumber(row.lat || row.latitude || ""),
      lng: parseOptionalNumber(row.lng || row.lon || row.long || row.longitude || ""),
      nla: parseOptionalNumber(row.nla || row.netleasablearea || ""),
      trendQ1: parseOptionalNumber(row.q1 || row.q1occupancy || row.occupancyq1 || ""),
      trendQ2: parseOptionalNumber(row.q2 || row.q2occupancy || row.occupancyq2 || ""),
      trendQ3: parseOptionalNumber(row.q3 || row.q3occupancy || row.occupancyq3 || ""),
      trendQ4: parseOptionalNumber(row.q4 || row.q4occupancy || row.occupancyq4 || ""),
      operations: operations.fromSheet(source)
    };
  }).filter((row) => row.unitId && row.unitNo);
}

function normalizeStatus(value) {
  const text = String(value || "").trim();
  const lower = text.toLowerCase();
  if (lower === "sold" || lower === "reserved" || lower === "occupied") return "Occupied";
  if (lower === "defect / risk" || lower === "defect/risk" || lower === "ready to transfer" || lower === "overdue payment" || lower === "under construction") return "Under Construction";
  return Object.keys(statusConfig).find((status) => status.toLowerCase() === text.toLowerCase()) || "Available";
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value || 0);
}

function formatArea(value) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value || 0)} sq.m.`;
}

function formatPercent(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value || 0);
}

function formatLoadCapacity(value) {
  const capacity = Number(value || 0);
  if (!capacity) return "-";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(capacity)} Ton/Sq.m.`;
}

function formatContractTerm(value) {
  const years = Number(value || 0);
  return years ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(years)} years` : "-";
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : "";
}

function calculateContractEndDate(transferDate, contractTermYears) {
  const years = Number(contractTermYears || 0);
  if (!transferDate || !years) return "";
  const date = new Date(transferDate);
  if (Number.isNaN(date.getTime())) return "";
  date.setMonth(date.getMonth() + Math.round(years * 12));
  return date.toISOString().slice(0, 10);
}

function formatCadPoint(unit) {
  if (!unit) return "-";
  return `X ${formatCoord(unit.cadX)} / Y ${formatCoord(unit.cadY)} / Z ${formatCoord(unit.cadZ)}`;
}

function formatCoord(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(value || 0);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function isGoogleSheetUrl(value) {
  return /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[-\w]+/i.test(String(value || "").trim());
}

function getGoogleSheetId(url) {
  return (url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/) || [])[1];
}

function getStoredSheetUrl() {
  try {
    return localStorage.getItem(SHEET_URL_STORAGE_KEY) || "";
  } catch (error) {
    return "";
  }
}

function storeSheetUrl(url) {
  try {
    localStorage.setItem(SHEET_URL_STORAGE_KEY, url);
  } catch (error) {
    // Ignore storage failures in local file contexts.
  }
}

function getConfiguredSheetUrl() {
  const currentUrl = els.sheetUrlInput.value.trim();
  const storedUrl = getStoredSheetUrl().trim();
  if (isGoogleSheetUrl(currentUrl)) return currentUrl;
  if (isGoogleSheetUrl(storedUrl)) return storedUrl;
  return DEFAULT_GOOGLE_SHEET_URL;
}

function initializeSheetSource() {
  const url = getConfiguredSheetUrl();
  if (isGoogleSheetUrl(url)) {
    els.sheetUrlInput.value = url;
    setDataStatus("Ready. Press Refresh to sync the configured Google Sheet.");
  }
}

function connectSheetUrl(sourceUrl = getConfiguredSheetUrl()) {
  if (sheetSyncPromise) return sheetSyncPromise;
  els.connectSheetBtn.disabled = true;
  els.refreshRegisterBtn.disabled = true;
  sheetSyncPromise = syncSheetSource(sourceUrl).finally(() => {
    sheetSyncPromise = null;
    els.connectSheetBtn.disabled = false;
    els.refreshRegisterBtn.disabled = false;
  });
  return sheetSyncPromise;
}

async function syncSheetSource(sourceUrl) {
  const url = typeof sourceUrl === "string" ? sourceUrl.trim() : getConfiguredSheetUrl();
  if (!isGoogleSheetUrl(url)) {
    setDataStatus("Paste a valid Google Sheet URL only.", true);
    els.sheetUrlInput.focus();
    return;
  }
  els.sheetUrlInput.value = url;
  try {
    sheetSyncState = "syncing";
    sheetSyncError = "";
    if (els.projectFilter.value === "all") applyFilters();
    setDataStatus("Syncing Google Sheet...");
    const sheetNames = await loadGoogleSheetNames(url).catch((error) => {
      console.warn("Unable to load Google Sheet tab list", error);
      return PROJECT_SHEETS;
    });
    const uniqueSheetNames = uniquePreserveOrder(sheetNames.length ? sheetNames : PROJECT_SHEETS);
    // Bound requests to three tabs at a time; preserve sheet order when combining results.
    const synced = [];
    const failedSheetNames = [];
    for (let start = 0; start < uniqueSheetNames.length; start += 3) {
      const batch = uniqueSheetNames.slice(start, start + 3);
      const results = await Promise.allSettled(batch.map(async (sheetName) => {
        const rows = await loadGoogleSheetRows(url, sheetName);
        return { sheetName, rows: mapObjectRows(rows, sheetName) };
      }));
      results.forEach((result, index) => {
        if (result.status === "fulfilled") synced.push(result.value);
        else {
          failedSheetNames.push(batch[index]);
          console.warn(`Skipped sheet "${batch[index]}"`, result.reason);
        }
      });
      setDataStatus(`Syncing Google Sheet... ${Math.min(start + 3, uniqueSheetNames.length)} / ${uniqueSheetNames.length}`);
    }
    if (!synced.some((item) => item.rows.length)) throw new Error("No unit rows found");
    // Retain the last confirmed rows for a failed tab instead of replacing them with blanks.
    if (failedSheetNames.length) {
      for (const sheetName of failedSheetNames) {
        const previous = syncedUnitRows.filter((row) => row.project === sheetName);
        if (previous.length) synced.push({ sheetName, rows: previous });
      }
    }

    syncedUnitRows = synced.flatMap((item) => item.rows);
    projectSheets = uniqueSheetNames;
    unitRows = mergePlannedFallbackRows(syncedUnitRows);
    sheetSyncState = "synced";
    storeSheetUrl(url);
    render();
    setDataStatus(failedSheetNames.length ? `Synced with ${failedSheetNames.length} unavailable tabs. Refresh to retry.` : "Synced.", Boolean(failedSheetNames.length));
  } catch (error) {
    console.error(error);
    sheetSyncState = "error";
    sheetSyncError = error?.message || "Google Sheet sync failed";
    if (els.projectFilter.value === "all") applyFilters();
    setDataStatus("Unable to sync. Share the sheet as Anyone with the link: Viewer, then paste the normal Google Sheet URL.", true);
  }
}

function loadGoogleSheetNames(url) {
  return new Promise((resolve, reject) => {
    const sheetId = getGoogleSheetId(url);
    if (!sheetId) {
      reject(new Error("Invalid Google Sheet URL"));
      return;
    }

    const callbackName = `warehouseSheetNamesCallback_${Date.now()}_${Math.round(Math.random() * 100000)}`;
    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Google Sheet tab list timed out"));
    }, SHEET_SYNC_TIMEOUT_MS);
    const cleanup = () => {
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = (payload) => {
      try {
        const names = (payload?.feed?.entry || [])
          .map((entry) => cleanSheetValue(entry?.title?.$t))
          .filter(Boolean);
        if (!names.length) throw new Error("No sheet tabs found");
        resolve(names);
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Google Sheet tab list failed"));
    };
    script.src = `https://spreadsheets.google.com/feeds/worksheets/${sheetId}/public/basic?alt=json-in-script&callback=${callbackName}&cacheBust=${Date.now()}`;
    document.body.appendChild(script);
  });
}

function loadGoogleSheetRows(url, sheetName) {
  return new Promise((resolve, reject) => {
    const sheetId = getGoogleSheetId(url);
    if (!sheetId) {
      reject(new Error("Invalid Google Sheet URL"));
      return;
    }

    const callbackName = `warehouseSheetCallback_${Date.now()}_${Math.round(Math.random() * 100000)}`;
    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Google Sheet sync timed out: ${sheetName}`));
    }, SHEET_SYNC_TIMEOUT_MS);
    const cleanup = () => {
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = (payload) => {
      try {
        resolve(googleVizToRows(payload));
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    };

    script.onerror = () => {
      cleanup();
      reject(new Error(`Google Sheet script load failed: ${sheetName}`));
    };
    // Every project tab has one header row, including optional empty operation columns.
    script.src = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?headers=1&tqx=out:json;responseHandler:${callbackName}&sheet=${encodeURIComponent(sheetName)}&cacheBust=${Date.now()}`;
    document.body.appendChild(script);
  });
}

function googleVizToRows(payload) {
  const table = payload?.table;
  if (!table?.cols?.length) return [];
  let headers = table.cols.map((col, index) => cleanSheetValue(col.label || col.id || `Column ${index + 1}`));
  let rows = (table.rows || []).map((row) => headers.map((_, index) => {
    const cell = row.c?.[index];
    return cleanSheetValue(cell?.v ?? cell?.f ?? "");
  }));

  if (isGenericSheetHeaders(headers) && rows.length && looksLikeHeaderRow(rows[0])) {
    headers = rows[0];
    rows = rows.slice(1);
  }

  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
}

function cleanSheetValue(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const dateMatch = String(value ?? "").match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)$/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return new Date(Number(year), Number(month), Number(day)).toISOString().slice(0, 10);
  }
  return String(value ?? "").trim();
}

function isGenericSheetHeaders(headers) {
  return headers.every((header, index) => {
    const normalized = normalize(header);
    return normalized === `column ${index + 1}` || normalized === String.fromCharCode(97 + index) || normalized === `col${index + 1}`;
  });
}

function looksLikeHeaderRow(row) {
  const knownHeaders = new Set([
    "project",
    "block",
    "unitno",
    "unit number",
    "unittype",
    "unit type",
    "warehousearea",
    "warehouse area",
    "officearea",
    "office area",
    "loadcapacity",
    "load capacity",
    "status",
    "customer",
    "transferdate",
    "transfer date",
    "contracttermyears",
    "contract term years",
    "contractenddate",
    "contract end date",
    "owner",
    "remark"
  ]);
  return row.filter((cell) => knownHeaders.has(normalize(cell).replace(/\s/g, "")) || knownHeaders.has(normalize(cell))).length >= 3;
}

function startViewportDrag(event) {
  if (event.button !== 0 || !els.mapViewport.classList.contains("is-zoomed")) return;
  if (event.target.closest("button, input, select, label")) return;
  mapDragState = {
    x: event.clientX,
    y: event.clientY,
    scrollLeft: els.mapViewport.scrollLeft,
    scrollTop: els.mapViewport.scrollTop,
    active: false
  };
}

function dragViewport(event) {
  if (!mapDragState) return;
  const deltaX = event.clientX - mapDragState.x;
  const deltaY = event.clientY - mapDragState.y;
  if (!mapDragState.active && Math.hypot(deltaX, deltaY) < 4) return;
  if (!mapDragState.active) {
    mapDragState.active = true;
    mapSuppressClick = true;
    els.mapViewport.classList.add("is-dragging");
  }
  event.preventDefault();
  els.mapViewport.scrollLeft = mapDragState.scrollLeft - deltaX;
  els.mapViewport.scrollTop = mapDragState.scrollTop - deltaY;
}

function handleViewportWheel(event) {
  if (!els.mapViewport.classList.contains("is-zoomed")) return;
  if (event.shiftKey && !event.deltaX) {
    event.preventDefault();
    els.mapViewport.scrollLeft += event.deltaY;
    return;
  }
  if (event.deltaX) {
    event.preventDefault();
    els.mapViewport.scrollLeft += event.deltaX;
    els.mapViewport.scrollTop += event.deltaY;
  }
}

function stopViewportDrag() {
  if (!mapDragState) return;
  const wasDragging = mapDragState.active;
  mapDragState = null;
  els.mapViewport.classList.remove("is-dragging");
  if (wasDragging) {
    window.setTimeout(() => {
      mapSuppressClick = false;
    }, 0);
  }
}

els.sheetUrlInput.addEventListener("paste", (event) => {
  const pasted = event.clipboardData?.getData("text") || "";
  if (!isGoogleSheetUrl(pasted)) {
    event.preventDefault();
    setDataStatus("Only Google Sheet URLs can be pasted here.", true);
  }
});

els.connectSheetBtn.addEventListener("click", () => connectSheetUrl());
els.refreshRegisterBtn.addEventListener("click", refreshUnitRegister);
els.exportCsvBtn.addEventListener("click", exportVisibleUnitsCsv);
els.exportPngBtn.addEventListener("click", exportSiteMapPng);
els.renovationFields.addEventListener("input", () => updateRenovationEditorState({ clearFeedback: true }));
els.renovationFields.addEventListener("change", () => updateRenovationEditorState({ clearFeedback: true }));
els.saveRenovationBtn.addEventListener("click", saveSelectedRenovationFields);
els.operationCategories.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (button) selectCategory(button.dataset.category);
});
document.querySelector("#closeDetailBtn").addEventListener("click", clearSelection);
els.unitTable.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-unit-id]");
  if (row) selectUnit(row.dataset.unitId, row.dataset.project);
});
els.unitTable.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const row = event.target.closest("tr[data-unit-id]");
  if (row) { event.preventDefault(); selectUnit(row.dataset.unitId, row.dataset.project); }
});
els.unitWorkLayer.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const work = event.target.closest("[data-work-unit]");
  if (work) { event.preventDefault(); selectUnit(work.dataset.workUnit); }
});
els.unitLayer.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const node = event.target.closest(".unit-group");
  if (node) { event.preventDefault(); selectUnit(node.dataset.unitId); }
});

[els.projectFilter, els.phaseFilter, els.statusFilter].forEach((select) => select.addEventListener("change", applyFilters));
els.clearFiltersBtn.addEventListener("click", clearFilters);
els.fitVisibleBtn.addEventListener("click", showOverviewPlan);
els.zoomInBtn.addEventListener("click", () => zoomMap(1));
els.zoomOutBtn.addEventListener("click", () => zoomMap(-1));
els.unitMap.addEventListener("click", handleMapClick);
els.mapViewport.addEventListener("mousedown", startViewportDrag);
els.mapViewport.addEventListener("wheel", handleViewportWheel, { passive: false });
els.mapViewport.addEventListener("auxclick", (event) => {
  if (event.button === 1) event.preventDefault();
});
document.addEventListener("click", handlePageClick);
document.addEventListener("mousemove", dragViewport);
document.addEventListener("mouseup", stopViewportDrag);
window.addEventListener("resize", scheduleMapResizeSync);
if ("ResizeObserver" in window) {
  const layoutResizeObserver = new ResizeObserver(scheduleMapResizeSync);
  // The viewport height is an output of this calculation; observing it creates a feedback loop.
  layoutResizeObserver.observe(els.dataSourcePanel);
}
setInterval(updateClock, 1000);

initializeSheetSource();
document.body.dataset.mode = "op";
renderCategoryMenu();
render();
loadRenovationWriteConfig().catch((error) => console.error(error));
connectSheetUrl().catch((error) => console.error(error));
