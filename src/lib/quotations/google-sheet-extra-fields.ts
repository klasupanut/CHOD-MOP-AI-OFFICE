import "server-only";

import { createSign } from "node:crypto";
import { asGooglePrivateKeyError, getGoogleServiceAccountConfig, googleSheetsScope } from "@/lib/google/service-account";

type QuotationExtraFieldRow = {
  quotationId?: unknown;
  quotationNo?: unknown;
  projectType?: unknown;
  mainContractor?: unknown;
  contractorName?: unknown;
  approvalStatus?: unknown;
  approvalAt?: unknown;
  approvalBy?: unknown;
  approvalNote?: unknown;
  approvalUpdatedAt?: unknown;
  signingStatus?: unknown;
  signedAt?: unknown;
  signedByName?: unknown;
  signedByEmail?: unknown;
  signedPdfUrl?: unknown;
  internalVerifiedAt?: unknown;
};

const QUOTATIONS_TAB = "Quotations";
let cachedToken: { value: string; expiresAt: number } | null = null;
let cachedExtraMap: {
  value: Map<string, {
    projectType: string;
    mainContractor: string;
    approvalStatus: string;
    approvalAt: string;
    approvalBy: string;
    approvalNote: string;
    approvalUpdatedAt: string;
    signingStatus: string;
    signedAt: string;
    signedByName: string;
    signedByEmail: string;
    signedPdfUrl: string;
    internalVerifiedAt: string;
  }>;
  expiresAt: number;
} | null = null;

function getSheetId() {
  return process.env.GOOGLE_SHEET_ID_QUOTATION || "";
}

function isConfigured() {
  const { email, privateKey } = getGoogleServiceAccountConfig();
  return Boolean(email && privateKey && getSheetId());
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const { email, privateKey } = getGoogleServiceAccountConfig();
  if (!email || !privateKey || !getSheetId()) throw new Error("Quotation Google Sheet sync is not configured.");

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: email,
    scope: googleSheetsScope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: (() => {
        try {
          return `${unsigned}.${signer.sign(privateKey, "base64url")}`;
        } catch (error) {
          throw asGooglePrivateKeyError(error);
        }
      })(),
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google service account token failed (${response.status}).`);
  const token = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 };
  return cachedToken.value;
}

async function sheetsFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSheetId()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Quotation Google Sheet request failed (${response.status}): ${detail.slice(0, 180)}`);
  }
  return response;
}

function asString(value: unknown) {
  return String(value || "").trim();
}

function normalizeHeader(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function columnLetter(indexZeroBased: number) {
  let index = indexZeroBased + 1;
  let column = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    index = Math.floor((index - 1) / 26);
  }
  return column;
}

function asQuotationRow(value: unknown): QuotationExtraFieldRow | null {
  return value && typeof value === "object" ? value as QuotationExtraFieldRow : null;
}

async function ensureExtraHeaders() {
  const range = encodeURIComponent(`${QUOTATIONS_TAB}!AQ1:AW1`);
  await sheetsFetch(`/values/${range}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({
      values: [[
        "project_type",
        "main_contractor",
        "approval_status",
        "approval_at",
        "approval_by",
        "approval_note",
        "approval_updated_at",
      ]],
    }),
  });
}

async function readExtraFieldMap() {
  if (cachedExtraMap && cachedExtraMap.expiresAt > Date.now()) return cachedExtraMap.value;

  const headerRange = encodeURIComponent(`${QUOTATIONS_TAB}!A1:AZ1`);
  const headerResponse = await sheetsFetch(`/values/${headerRange}`);
  const headerPayload = (await headerResponse.json()) as { values?: unknown[][] };
  const headers = headerPayload.values?.[0] || [];
  const headerIndex = new Map(headers.map((header, index) => [normalizeHeader(header), index]));
  const getHeaderIndex = (aliases: string[]) => {
    for (const alias of aliases) {
      const index = headerIndex.get(normalizeHeader(alias));
      if (typeof index === "number") return index;
    }
    return -1;
  };
  const signingStatusIndex = getHeaderIndex(["signing_status", "signingStatus", "customer_signing_status"]);
  const signedAtIndex = getHeaderIndex(["signed_at", "signedAt", "client_signed_at"]);
  const signedByNameIndex = getHeaderIndex(["signed_by_name", "signedByName", "signer_name", "client_signed_by"]);
  const signedByEmailIndex = getHeaderIndex(["signed_by_email", "signedByEmail", "signer_email", "client_signed_email"]);
  const signedPdfUrlIndex = getHeaderIndex(["signed_pdf_url", "signedPdfUrl", "client_signed_pdf_url", "signed_pdf", "clientSignedPdfUrl"]);
  const internalVerifiedAtIndex = getHeaderIndex(["internal_verified_at", "internalVerifiedAt"]);

  const range = encodeURIComponent(`${QUOTATIONS_TAB}!A2:AZ`);
  const response = await sheetsFetch(`/values/${range}`);
  const payload = (await response.json()) as { values?: unknown[][] };
  const map = new Map<string, {
    projectType: string;
    mainContractor: string;
    approvalStatus: string;
    approvalAt: string;
    approvalBy: string;
    approvalNote: string;
    approvalUpdatedAt: string;
    signingStatus: string;
    signedAt: string;
    signedByName: string;
    signedByEmail: string;
    signedPdfUrl: string;
    internalVerifiedAt: string;
  }>();
  for (const row of payload.values || []) {
    const quotationId = asString(row[0]);
    if (!quotationId) continue;
    map.set(quotationId, {
      projectType: asString(row[42]),
      mainContractor: asString(row[43]),
      approvalStatus: asString(row[44]),
      approvalAt: asString(row[45]),
      approvalBy: asString(row[46]),
      approvalNote: asString(row[47]),
      approvalUpdatedAt: asString(row[48]),
      signingStatus: signingStatusIndex >= 0 ? asString(row[signingStatusIndex]) : "",
      signedAt: signedAtIndex >= 0 ? asString(row[signedAtIndex]) : "",
      signedByName: signedByNameIndex >= 0 ? asString(row[signedByNameIndex]) : "",
      signedByEmail: signedByEmailIndex >= 0 ? asString(row[signedByEmailIndex]) : "",
      signedPdfUrl: signedPdfUrlIndex >= 0 ? asString(row[signedPdfUrlIndex]) : "",
      internalVerifiedAt: internalVerifiedAtIndex >= 0 ? asString(row[internalVerifiedAtIndex]) : "",
    });
  }
  cachedExtraMap = { value: map, expiresAt: Date.now() + 30_000 };
  return map;
}

export async function syncQuotationExtraFields(quotation: unknown) {
  if (!isConfigured()) return;
  const row = asQuotationRow(quotation);
  const quotationId = asString(row?.quotationId);
  if (!quotationId) return;

  await ensureExtraHeaders();
  const range = encodeURIComponent(`${QUOTATIONS_TAB}!A2:A`);
  const response = await sheetsFetch(`/values/${range}`);
  const payload = (await response.json()) as { values?: unknown[][] };
  const index = (payload.values || []).findIndex((entry) => asString(entry[0]) === quotationId);
  if (index < 0) return;

  const rowNumber = index + 2;
  const quotationNo = asString(row?.quotationNo);
  if (quotationNo) {
    const quotationNoRange = encodeURIComponent(`${QUOTATIONS_TAB}!B${rowNumber}:B${rowNumber}`);
    await sheetsFetch(`/values/${quotationNoRange}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [[quotationNo]] }),
    });
  }

  const updateRange = encodeURIComponent(`${QUOTATIONS_TAB}!AQ${rowNumber}:AR${rowNumber}`);
  await sheetsFetch(`/values/${updateRange}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({
      values: [[asString(row?.projectType), asString(row?.mainContractor || row?.contractorName)]],
    }),
  });
  cachedExtraMap = null;
}

export async function updateQuotationSheetStatus(input: {
  quotationId: string;
  quotationNo: string;
  status: string;
  updatedAt: string;
}) {
  if (!isConfigured()) return { ok: true, skipped: true as const };

  const range = encodeURIComponent(`${QUOTATIONS_TAB}!A2:B`);
  const response = await sheetsFetch(`/values/${range}`);
  const payload = (await response.json()) as { values?: unknown[][] };
  const index = (payload.values || []).findIndex((entry) => {
    const quotationId = asString(entry[0]);
    const quotationNo = asString(entry[1]);
    return quotationId === input.quotationId || quotationNo === input.quotationNo;
  });
  if (index < 0) {
    return { ok: false, skipped: false as const, error: `Quotation ${input.quotationNo} was not found in the quotation sheet.` };
  }

  const rowNumber = index + 2;
  const statusRange = encodeURIComponent(`${QUOTATIONS_TAB}!AB${rowNumber}:AB${rowNumber}`);
  await sheetsFetch(`/values/${statusRange}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [[input.status]] }),
  });
  const updatedAtRange = encodeURIComponent(`${QUOTATIONS_TAB}!AF${rowNumber}:AF${rowNumber}`);
  await sheetsFetch(`/values/${updatedAtRange}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [[input.updatedAt]] }),
  });
  return { ok: true, skipped: false as const };
}

export async function updateQuotationSheetInternalApproval(input: {
  quotationId: string;
  quotationNo: string;
  status: string;
  approver: string;
  note?: string;
  updatedAt: string;
}) {
  if (!isConfigured()) return { ok: true, skipped: true as const };

  await ensureExtraHeaders();
  const range = encodeURIComponent(`${QUOTATIONS_TAB}!A2:B`);
  const response = await sheetsFetch(`/values/${range}`);
  const payload = (await response.json()) as { values?: unknown[][] };
  const index = (payload.values || []).findIndex((entry) => {
    const quotationId = asString(entry[0]);
    const quotationNo = asString(entry[1]);
    return quotationId === input.quotationId || quotationNo === input.quotationNo;
  });
  if (index < 0) {
    return { ok: false, skipped: false as const, error: `Quotation ${input.quotationNo} was not found in the quotation sheet.` };
  }

  const rowNumber = index + 2;

  // AB remains the quotation's internal workflow status.
  // Client signing must use signing_status / signed_at and must not overwrite this field.
  const statusRange = encodeURIComponent(`${QUOTATIONS_TAB}!AB${rowNumber}:AB${rowNumber}`);
  await sheetsFetch(`/values/${statusRange}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [[input.status]] }),
  });

  const updatedAtRange = encodeURIComponent(`${QUOTATIONS_TAB}!AF${rowNumber}:AF${rowNumber}`);
  await sheetsFetch(`/values/${updatedAtRange}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [[input.updatedAt]] }),
  });

  const approvalRange = encodeURIComponent(`${QUOTATIONS_TAB}!AS${rowNumber}:AW${rowNumber}`);
  await sheetsFetch(`/values/${approvalRange}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({
      values: [[input.status, input.updatedAt, input.approver, input.note || "", input.updatedAt]],
    }),
  });

  cachedExtraMap = null;
  return { ok: true, skipped: false as const };
}

async function readQuotationHeaders() {
  const range = encodeURIComponent(`${QUOTATIONS_TAB}!A1:AZ1`);
  const response = await sheetsFetch(`/values/${range}`);
  const payload = (await response.json()) as { values?: unknown[][] };
  const headers = payload.values?.[0] || [];
  return new Map(headers.map((header, index) => [normalizeHeader(header), index]));
}

function findHeaderIndex(headers: Map<string, number>, aliases: string[]) {
  for (const alias of aliases) {
    const index = headers.get(normalizeHeader(alias));
    if (typeof index === "number") return index;
  }
  return -1;
}

export async function updateQuotationSheetInternalVerification(input: {
  quotationId: string;
  quotationNo: string;
  verifiedBy: string;
  verifiedAt: string;
  signedPdfUrl?: string;
  signedPdfFilename?: string;
}) {
  if (!isConfigured()) return { ok: true, skipped: true as const };

  const range = encodeURIComponent(`${QUOTATIONS_TAB}!A2:B`);
  const response = await sheetsFetch(`/values/${range}`);
  const payload = (await response.json()) as { values?: unknown[][] };
  const index = (payload.values || []).findIndex((entry) => {
    const quotationId = asString(entry[0]);
    const quotationNo = asString(entry[1]);
    return quotationId === input.quotationId || quotationNo === input.quotationNo;
  });
  if (index < 0) {
    return { ok: false, skipped: false as const, error: `Quotation ${input.quotationNo} was not found in the quotation sheet.` };
  }

  const headers = await readQuotationHeaders();
  const signingStatusIndex = findHeaderIndex(headers, ["signing_status", "signingStatus", "customer_signing_status"]);
  const signedAtIndex = findHeaderIndex(headers, ["signed_at", "signedAt", "client_signed_at"]);
  const signedByNameIndex = findHeaderIndex(headers, ["signed_by_name", "signedByName", "signer_name", "client_signed_by"]);
  const signedByEmailIndex = findHeaderIndex(headers, ["signed_by_email", "signedByEmail", "signer_email", "client_signed_email"]);
  const signedPdfUrlIndex = findHeaderIndex(headers, ["signed_pdf_url", "signedPdfUrl", "client_signed_pdf_url", "signed_pdf", "clientSignedPdfUrl"]);
  const signedPdfFilenameIndex = findHeaderIndex(headers, ["signed_pdf_filename", "signedPdfFilename", "client_signed_pdf_filename"]);
  const updatedAtIndex = findHeaderIndex(headers, ["updated_at", "updatedAt"]);
  const rowNumber = index + 2;

  const updates: Array<{ index: number; value: string }> = [
    { index: signingStatusIndex, value: "INTERNAL_VERIFIED" },
    { index: signedAtIndex, value: input.verifiedAt },
    { index: signedByNameIndex, value: "Internal Verification" },
    { index: signedByEmailIndex, value: input.verifiedBy },
    { index: signedPdfUrlIndex, value: input.signedPdfUrl || "" },
    { index: signedPdfFilenameIndex, value: input.signedPdfFilename || "" },
    { index: updatedAtIndex, value: input.verifiedAt },
  ].filter((entry) => entry.index >= 0);

  if (!updates.some((entry) => entry.index === signingStatusIndex)) {
    return {
      ok: false,
      skipped: false as const,
      error: "Quotation sheet does not have a signing_status column. Deploy/update the Auto Quotation sheet schema before using Internal Verify.",
    };
  }

  await Promise.all(updates.map((entry) => {
    const column = columnLetter(entry.index);
    const updateRange = encodeURIComponent(`${QUOTATIONS_TAB}!${column}${rowNumber}:${column}${rowNumber}`);
    return sheetsFetch(`/values/${updateRange}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [[entry.value]] }),
    });
  }));

  cachedExtraMap = null;
  return {
    ok: true,
    skipped: false as const,
    signingStatus: "INTERNAL_VERIFIED",
    signedAt: input.verifiedAt,
    signedByName: "Internal Verification",
    signedByEmail: input.verifiedBy,
    signedPdfUrl: input.signedPdfUrl || "",
    signedPdfFilename: input.signedPdfFilename || "",
  };
}

export async function enrichQuotationExtraFields<T>(data: T): Promise<T> {
  if (!isConfigured()) return data;
  try {
    const map = await readExtraFieldMap();
    const enrichOne = <V>(value: V): V => {
      const row = asQuotationRow(value);
      const quotationId = asString(row?.quotationId);
      const extra = quotationId ? map.get(quotationId) : null;
      if (!row || !extra) return value;
      return {
        ...value as object,
        projectType: asString(row.projectType) || extra.projectType,
        mainContractor: asString(row.mainContractor) || extra.mainContractor,
        // The dedicated sheet column is written by the internal approval flow
        // and is therefore authoritative over an older Apps Script payload.
        approvalStatus: extra.approvalStatus || asString(row.approvalStatus),
        approvalAt: asString(row.approvalAt) || extra.approvalAt,
        approvalBy: asString(row.approvalBy) || extra.approvalBy,
        approvalNote: asString(row.approvalNote) || extra.approvalNote,
        approvalUpdatedAt: asString(row.approvalUpdatedAt) || extra.approvalUpdatedAt,
        signingStatus: asString(row.signingStatus) || extra.signingStatus,
        signedAt: asString(row.signedAt) || extra.signedAt,
        signedByName: asString(row.signedByName) || extra.signedByName,
        signedByEmail: asString(row.signedByEmail) || extra.signedByEmail,
        signedPdfUrl: asString(row.signedPdfUrl) || extra.signedPdfUrl || (
          (asString(row.signingStatus) || extra.signingStatus).toUpperCase() === "INTERNAL_VERIFIED"
            ? asString((row as { pdfUrl?: unknown }).pdfUrl)
            : ""
        ),
        internalVerifiedAt: asString(row.internalVerifiedAt) || extra.internalVerifiedAt,
      } as V;
    };
    return Array.isArray(data) ? data.map((entry) => enrichOne(entry)) as T : enrichOne(data);
  } catch (error) {
    console.error("Unable to enrich quotation extra fields", error);
    return data;
  }
}
