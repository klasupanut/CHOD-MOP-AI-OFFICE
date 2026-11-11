export const RENOVATION_PROJECTS = [
  "Factory&Warehouse Chodthanawat 1",
  "Factory&Warehouse Chodthanawat 2",
  "Factory&Warehouse Chodthanawat 3",
  "Factory&Warehouse Chodthanawat 5",
  "CHODBIZ CHAENGWATTANA",
  "CHOD BIZ BANGNA KM.8 P.1",
  "CHOD BIZ BANGNA KM.8 P.2",
  "CHODBIZ PUTTHAMONTHON SAI 4",
] as const;

export const RENOVATION_UNIT_HEADER_ALIASES = ["unitNo", "unit no", "unit number"] as const;

export type RenovationFieldKind = "select" | "boolean" | "text" | "number" | "date" | "year";
export type RenovationOperationId = "slab" | "electrical" | "ventilation" | "tariff" | "lighting";

export type RenovationFieldDefinition = {
  key: string;
  label: string;
  headers: readonly string[];
  kind: RenovationFieldKind;
  options?: readonly string[];
  trueLabel?: string;
  falseLabel?: string;
  maxLength?: number;
  step?: string;
  multiline?: boolean;
};

export type RenovationOperationDefinition = {
  id: RenovationOperationId;
  label: string;
  fields: readonly RenovationFieldDefinition[];
};

const field = (
  key: string,
  label: string,
  headers: readonly string[],
  kind: RenovationFieldKind,
  extra: Partial<RenovationFieldDefinition> = {},
): RenovationFieldDefinition => ({ key, label, headers, kind, ...extra });

export const RENOVATION_OPERATION_DEFINITIONS: Record<RenovationOperationId, RenovationOperationDefinition> = {
  slab: {
    id: "slab",
    label: "Slab Renovation",
    fields: [
      field("warehouseFloorOption", "Warehouse Floor Option", ["Warehouse Floor Option"], "select", {
        options: ["OP1 - On Ground", "OP2 - 2 Ton", "OP3 - 3 Ton"],
      }),
      field("slabRenovationStatus", "Slab Renovation Status", ["Slab Renovation Status"], "select", {
        options: ["Completed / Past Work", "Planned Work"],
      }),
      field("slabType", "Slab Type", ["Slab Type"], "select", {
        options: ["Flat slab on pile", "Slab on ground"],
      }),
      field("slabPlanYear", "Plan Year", ["Slab Plan Year"], "year"),
      field("slabRenovationDate", "Renovation Date", ["Slab Renovation Date"], "date"),
      field("slabRemark", "Notes", ["Slab Remark"], "text", { maxLength: 500, multiline: true }),
      field("officeRenovated", "Office Renovated", ["Office Renovated"], "boolean", {
        trueLabel: "Renovated",
        falseLabel: "Not Renovated",
      }),
    ],
  },
  electrical: {
    id: "electrical",
    label: "Electrical & Plumbing System",
    fields: [
      field("electricalStatus", "Electric Work Status", ["Electric Work Status"], "boolean", {
        trueLabel: "Renovated",
        falseLabel: "Not Renovated",
      }),
      field("plumbingStatus", "Plumbing Renovated", ["Pumbling Renovated", "Plumbing Renovated"], "boolean", {
        trueLabel: "Renovated",
        falseLabel: "Not Renovated",
      }),
    ],
  },
  ventilation: {
    id: "ventilation",
    label: "Ventilation System",
    fields: [
      field("ventilationStep", "Work Step", ["Ventilation Step"], "select", {
        options: ["STEP 1 - I+L", "STEP 2 - R+I+L+J"],
      }),
      field("ventilationStatus", "System Status", ["Ventilation Status"], "select", {
        options: ["Completed / Past Work", "Planned Work", "In Progress"],
      }),
      field("ventilationType", "System Type", ["Ventilation Type"], "text", { maxLength: 120 }),
      field("shutterCanopyStatus", "Shutter Canopy", ["Shutter Canopy Status"], "select", {
        options: ["Installed", "Planned", "Needs Repair", "Not Installed"],
      }),
      field("ventilationRemark", "Notes", ["Ventilation Remark"], "text", { maxLength: 500, multiline: true }),
    ],
  },
  tariff: {
    id: "tariff",
    label: "Electricity Tariff",
    fields: [
      field("electricityTariffType", "Tariff Type", ["Electricity Tariff Type"], "select", {
        options: ["TOU (2.2.2)", "TOU (3.2.3)", "TOD", "TOD (2.1.2)"],
      }),
      field("electricityTimePeriod", "Time Period 1", ["Electricity Time Period"], "text", { maxLength: 120 }),
      field("electricityTariff", "Base Energy 1", ["Electricity Tariff"], "number", { step: "0.0001" }),
      field("electricityTimePeriod2", "Time Period 2", ["Electricity Time Period 2"], "text", { maxLength: 120 }),
      field("electricityTariff2", "Base Energy 2", ["Electricity Tariff 2"], "number", { step: "0.0001" }),
      field("electricityDemandCharge", "Demand Charge", ["Electricity Demand Charge"], "number", { step: "0.01" }),
      field("electricityFt", "Ft", ["Electricity Ft"], "number", { step: "0.0001" }),
      field("electricityServiceCharge", "Service Charge", ["Electricity Service Charge"], "number", { step: "0.01" }),
    ],
  },
  lighting: {
    id: "lighting",
    label: "Interior Lighting",
    fields: [
      field("lightingStatus", "Lighting Status", ["Lighting Status"], "select", {
        options: ["Operational", "Needs Repair", "Planned", "In Progress", "Not Installed"],
      }),
      field("lightingType", "Fixture Type", ["Lighting Type"], "text", { maxLength: 120 }),
      field("lightingIlluminanceLux", "Illuminance (Lux)", ["Lighting Illuminance (Lux)"], "number", { step: "0.01" }),
      field("lightingPowerW", "Power (W)", ["Lighting Power (W)"], "number", { step: "0.01" }),
      field("lightingInspectionDate", "Inspection Date", ["Lighting Inspection Date"], "date"),
      field("lightingRemark", "Notes", ["Lighting Remark"], "text", { maxLength: 500, multiline: true }),
    ],
  },
};

export type RenovationFieldChangeInput = {
  field: unknown;
  value: unknown;
  expectedValue: unknown;
};

export type RenovationMutationField = {
  field: RenovationFieldDefinition;
  columnIndex: number;
  currentValue: string;
  nextValue: string;
  googleValue: string | number | boolean;
  changed: boolean;
};

export type RenovationMutationTarget = {
  rowNumber: number;
  fields: RenovationMutationField[];
};

export class RenovationStatusError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RenovationStatusError";
    this.status = status;
  }
}

export function normalizeRenovationHeader(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

export function normalizeRenovationUnitId(value: unknown) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeRenovationProject(value: unknown) {
  const text = String(value ?? "").trim();
  const project = RENOVATION_PROJECTS.find((candidate) => candidate.toLowerCase() === text.toLowerCase());
  if (!project) throw new RenovationStatusError("Unsupported renovation project.", 403);
  return project;
}

export function normalizeRenovationOperation(value: unknown): RenovationOperationId {
  const key = String(value ?? "").trim().toLowerCase() as RenovationOperationId;
  if (!RENOVATION_OPERATION_DEFINITIONS[key]) {
    throw new RenovationStatusError("Unsupported renovation operation.", 403);
  }
  return key;
}

function findUniqueColumn(headers: unknown[], aliases: readonly string[], label: string) {
  const accepted = new Set(aliases.map(normalizeRenovationHeader));
  const matches = headers
    .map((header, index) => ({ index, key: normalizeRenovationHeader(header) }))
    .filter(({ key }) => accepted.has(key));

  if (matches.length !== 1) {
    throw new RenovationStatusError(
      matches.length
        ? `Renovation sheet has duplicate ${label} columns.`
        : `Renovation sheet is missing the ${label} column.`,
      409,
    );
  }
  return matches[0].index;
}

function getField(operation: RenovationOperationId, key: unknown) {
  const fieldKey = String(key ?? "").trim();
  const definition = RENOVATION_OPERATION_DEFINITIONS[operation].fields.find((candidate) => candidate.key === fieldKey);
  if (!definition) {
    throw new RenovationStatusError(`Field ${fieldKey || "(blank)"} is not writable for ${operation}.`, 403);
  }
  return definition;
}

function booleanValue(value: unknown) {
  if (typeof value === "boolean") return value;
  const key = String(value ?? "").trim().toLowerCase();
  if (["true", "yes", "1", "checked", "renovated", "completed"].includes(key)) return true;
  if (["false", "no", "0", "unchecked", "not renovated", "notrenovated", "not completed"].includes(key)) return false;
  return null;
}

export function displayRenovationFieldValue(field: RenovationFieldDefinition, value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (field.kind === "boolean") {
    const parsed = booleanValue(value);
    return parsed === null ? text : parsed ? "TRUE" : "FALSE";
  }
  if (field.kind === "number") {
    const numeric = Number(text.replaceAll(",", ""));
    return Number.isFinite(numeric) ? String(numeric) : text;
  }
  if (field.kind === "date") {
    const serial = typeof value === "number" ? value : /^\d+(?:\.\d+)?$/.test(text) ? Number(text) : Number.NaN;
    if (Number.isFinite(serial) && serial > 0) {
      return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000).toISOString().slice(0, 10);
    }
  }
  return text;
}

function comparableRenovationFieldValue(field: RenovationFieldDefinition, value: unknown) {
  return displayRenovationFieldValue(field, value).toLowerCase();
}

export function normalizeWritableRenovationFieldValue(field: RenovationFieldDefinition, value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new RenovationStatusError(`${field.label} cannot be cleared from the web app.`);
  }

  if (field.kind === "select") {
    const match = field.options?.find((candidate) => candidate.toLowerCase() === text.toLowerCase());
    if (!match) throw new RenovationStatusError(`Unsupported ${field.label} value.`);
    return { displayValue: match, googleValue: match };
  }
  if (field.kind === "boolean") {
    const parsed = booleanValue(value);
    if (parsed === null) throw new RenovationStatusError(`Unsupported ${field.label} value.`);
    return { displayValue: parsed ? "TRUE" : "FALSE", googleValue: parsed };
  }
  if (field.kind === "number") {
    const numeric = Number(text.replaceAll(",", ""));
    if (!Number.isFinite(numeric) || Math.abs(numeric) > 1_000_000_000) {
      throw new RenovationStatusError(`${field.label} must be a valid number.`);
    }
    return { displayValue: String(numeric), googleValue: numeric };
  }
  if (field.kind === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
      throw new RenovationStatusError(`${field.label} must use YYYY-MM-DD.`);
    }
    const serial = (Date.parse(`${text}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86_400_000;
    return { displayValue: text, googleValue: serial };
  }
  if (field.kind === "year") {
    if (!/^(?:19|20)\d{2}$/.test(text)) throw new RenovationStatusError(`${field.label} must be a four-digit year.`);
    return { displayValue: text, googleValue: text };
  }
  const maxLength = field.maxLength || 200;
  if (text.length > maxLength) throw new RenovationStatusError(`${field.label} is longer than ${maxLength} characters.`);
  return { displayValue: text, googleValue: text };
}

export function resolveRenovationMutationTargets(
  values: unknown[][],
  unitId: unknown,
  operationValue: unknown,
  changes: RenovationFieldChangeInput[],
): RenovationMutationTarget {
  if (!Array.isArray(values) || values.length < 2) {
    throw new RenovationStatusError("Renovation sheet has no usable data rows.", 409);
  }
  if (!Array.isArray(changes) || !changes.length || changes.length > 12) {
    throw new RenovationStatusError("Submit between 1 and 12 renovation field changes.");
  }

  const operation = normalizeRenovationOperation(operationValue);
  const unitKey = normalizeRenovationUnitId(unitId);
  if (!unitKey || !/^[A-Z0-9][A-Z0-9._/-]{0,39}$/.test(unitKey)) {
    throw new RenovationStatusError("Invalid renovation unit ID.");
  }

  const [headers, ...rows] = values;
  const unitColumnIndex = findUniqueColumn(headers, RENOVATION_UNIT_HEADER_ALIASES, "unitNo");
  const matches = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => normalizeRenovationUnitId(row[unitColumnIndex]) === unitKey);

  if (matches.length !== 1) {
    throw new RenovationStatusError(
      matches.length
        ? `Unit ${unitKey} appears more than once; no data was changed.`
        : `Unit ${unitKey} was not found; no data was changed.`,
      409,
    );
  }

  const seen = new Set<string>();
  const targetFields = changes.map((change) => {
    const definition = getField(operation, change.field);
    if (seen.has(definition.key)) throw new RenovationStatusError(`Field ${definition.key} was submitted more than once.`);
    seen.add(definition.key);

    const columnIndex = findUniqueColumn(headers, definition.headers, definition.label);
    const currentValue = displayRenovationFieldValue(definition, matches[0].row[columnIndex]);
    if (comparableRenovationFieldValue(definition, currentValue)
      !== comparableRenovationFieldValue(definition, change.expectedValue)) {
      throw new RenovationStatusError(
        `Unit ${unitKey} ${definition.label} changed since it was loaded. Refresh before updating.`,
        409,
      );
    }

    const normalized = normalizeWritableRenovationFieldValue(definition, change.value);
    return {
      field: definition,
      columnIndex,
      currentValue,
      nextValue: normalized.displayValue,
      googleValue: normalized.googleValue,
      changed: comparableRenovationFieldValue(definition, currentValue)
        !== comparableRenovationFieldValue(definition, normalized.displayValue),
    };
  });

  return { rowNumber: matches[0].rowNumber, fields: targetFields };
}

export function columnIndexToLetter(index: number) {
  if (!Number.isInteger(index) || index < 0) {
    throw new RenovationStatusError("Invalid renovation column index.", 500);
  }
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

export function quoteRenovationSheetTitle(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}
