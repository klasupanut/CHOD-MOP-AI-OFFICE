export const RENOVATION_PILOT_PROJECT = "Factory&Warehouse Chodthanawat 2";
export const RENOVATION_PILOT_OPERATION = "slab";
export const RENOVATION_UNIT_HEADER_ALIASES = ["unitNo", "unit no", "unit number"] as const;
export const RENOVATION_STATUS_HEADER_ALIASES = [
  "Slab Renovation Status",
  "warehouse floor status",
  "warehouse slab status",
] as const;

export const RENOVATION_STATUS_VALUES = [
  "",
  "Completed / Past Work",
  "Planned Work",
] as const;

export const RENOVATION_WRITABLE_STATUS_VALUES = [
  "Completed / Past Work",
  "Planned Work",
] as const;

export type RenovationStatusValue = (typeof RENOVATION_STATUS_VALUES)[number];

export type RenovationMutationTarget = {
  rowNumber: number;
  statusColumnIndex: number;
  currentStatus: RenovationStatusValue;
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

export function normalizeRenovationStatus(value: unknown): RenovationStatusValue {
  const text = String(value ?? "").trim();
  const match = RENOVATION_STATUS_VALUES.find(
    (candidate) => candidate.toLowerCase() === text.toLowerCase(),
  );
  if (match === undefined) {
    throw new RenovationStatusError("Unsupported Slab Renovation Status value.");
  }
  return match;
}

export function normalizeWritableRenovationStatus(value: unknown) {
  const status = normalizeRenovationStatus(value);
  if (!RENOVATION_WRITABLE_STATUS_VALUES.includes(
    status as (typeof RENOVATION_WRITABLE_STATUS_VALUES)[number],
  )) {
    throw new RenovationStatusError(
      "Choose Completed / Past Work or Planned Work. Existing status cannot be cleared from the web app.",
    );
  }
  return status as (typeof RENOVATION_WRITABLE_STATUS_VALUES)[number];
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

export function resolveRenovationMutationTarget(
  values: unknown[][],
  unitId: unknown,
  expectedStatus: unknown,
): RenovationMutationTarget {
  if (!Array.isArray(values) || values.length < 2) {
    throw new RenovationStatusError("Renovation sheet has no usable data rows.", 409);
  }

  const unitKey = normalizeRenovationUnitId(unitId);
  if (!unitKey || !/^[A-Z0-9][A-Z0-9._/-]{0,39}$/.test(unitKey)) {
    throw new RenovationStatusError("Invalid renovation unit ID.");
  }

  const [headers, ...rows] = values;
  const unitColumnIndex = findUniqueColumn(
    headers,
    RENOVATION_UNIT_HEADER_ALIASES,
    "unitNo",
  );
  const statusColumnIndex = findUniqueColumn(
    headers,
    RENOVATION_STATUS_HEADER_ALIASES,
    "Slab Renovation Status",
  );

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

  const currentStatus = normalizeRenovationStatus(matches[0].row[statusColumnIndex]);
  const expected = normalizeRenovationStatus(expectedStatus);
  if (currentStatus !== expected) {
    throw new RenovationStatusError(
      `Unit ${unitKey} changed since it was loaded. Refresh before updating.`,
      409,
    );
  }

  return {
    rowNumber: matches[0].rowNumber,
    statusColumnIndex,
    currentStatus,
  };
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
