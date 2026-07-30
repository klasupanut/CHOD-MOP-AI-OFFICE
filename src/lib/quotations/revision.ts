const REVISION_PATTERN = /(?:^|\b)REV[-\s]?(\d{1,3})$/i;

export function normalizeQuotationRevision(value: unknown) {
  const normalized = String(value || "").trim();
  const match = normalized.match(REVISION_PATTERN) || normalized.match(/^(\d{1,3})$/);
  if (!match) return "";

  const sequence = Number(match[1]);
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999) return "";
  return `REV-${String(sequence).padStart(2, "0")}`;
}

export function quotationReference(
  quotationNo: unknown,
  revision: unknown,
  includeRevision = true,
) {
  const number = String(quotationNo || "").trim();
  const normalizedRevision = normalizeQuotationRevision(revision);
  return includeRevision && normalizedRevision
    ? `${number} ${normalizedRevision}`.trim()
    : number;
}

export function sheetBoolean(value: unknown) {
  if (value === true || value === 1) return true;
  return ["true", "1", "yes", "y"].includes(String(value || "").trim().toLowerCase());
}
