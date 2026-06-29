import "server-only";

import { createSign } from "node:crypto";

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
};

const QUOTATIONS_TAB = "Quotations";
const sheetsScope = "https://www.googleapis.com/auth/spreadsheets";
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
  }>;
  expiresAt: number;
} | null = null;

function getSheetId() {
  return process.env.GOOGLE_SHEET_ID_QUOTATION || "";
}

function getServiceAccountConfig() {
  return {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
    privateKey: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  };
}

function isConfigured() {
  const { email, privateKey } = getServiceAccountConfig();
  return Boolean(email && privateKey && getSheetId());
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const { email, privateKey } = getServiceAccountConfig();
  if (!email || !privateKey || !getSheetId()) throw new Error("Quotation Google Sheet sync is not configured.");

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: email,
    scope: sheetsScope,
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
      assertion: `${unsigned}.${signer.sign(privateKey, "base64url")}`,
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

  const range = encodeURIComponent(`${QUOTATIONS_TAB}!A2:AW`);
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
        approvalStatus: asString(row.approvalStatus) || extra.approvalStatus,
        approvalAt: asString(row.approvalAt) || extra.approvalAt,
        approvalBy: asString(row.approvalBy) || extra.approvalBy,
        approvalNote: asString(row.approvalNote) || extra.approvalNote,
        approvalUpdatedAt: asString(row.approvalUpdatedAt) || extra.approvalUpdatedAt,
      } as V;
    };
    return Array.isArray(data) ? data.map((entry) => enrichOne(entry)) as T : enrichOne(data);
  } catch (error) {
    console.error("Unable to enrich quotation extra fields", error);
    return data;
  }
}
