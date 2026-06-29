import "server-only";

import { createSign } from "node:crypto";
import { defaultApprovalPermissions, type ApprovalPermission } from "@/data/approval-permissions";
import type { QuotationApprovalScope } from "@/data/quotation-approvals";
import { asGooglePrivateKeyError, getGoogleServiceAccountConfig, googleSheetsScope } from "@/lib/google/service-account";

const APPROVAL_PERMISSION_TAB = "ApprovalPermissions";
const APPROVAL_PERMISSION_HEADERS = [
  "userId",
  "name",
  "role",
  "canApproveQuotation",
  "approvalScopes",
  "maxApprovalAmount",
  "requiresTammasitFinalApproval",
  "enabled",
  "updatedAt",
] as const;

let cachedToken: { value: string; expiresAt: number } | null = null;

function getSheetId() {
  return process.env.GOOGLE_SHEET_ID_USERS || "";
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const { email, privateKey } = getGoogleServiceAccountConfig();
  if (!email || !privateKey || !getSheetId()) {
    throw new Error("Approval permission Google Sheet store is not configured.");
  }

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
  let assertion = "";
  try {
    assertion = `${unsigned}.${signer.sign(privateKey, "base64url")}`;
  } catch (error) {
    throw asGooglePrivateKeyError(error);
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google service account token failed (${response.status}).`);
  const token = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 };
  return token.access_token;
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
    throw new Error(`Approval permission Google Sheets request failed (${response.status}): ${detail.slice(0, 180)}`);
  }
  return response;
}

function bool(value: unknown) {
  return String(value || "").trim().toLowerCase() === "true";
}

function parseScopes(value: unknown): QuotationApprovalScope[] {
  const allowed: QuotationApprovalScope[] = ["all", "fit-out", "electrical", "solar", "renovation", "maintenance", "general"];
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is QuotationApprovalScope => allowed.includes(item as QuotationApprovalScope));
}

function rowToPermission(row: unknown[]): ApprovalPermission | null {
  const userId = String(row[0] || "").trim();
  if (!userId) return null;
  const rawAmount = String(row[5] || "").trim();
  return {
    userId,
    name: String(row[1] || userId).trim(),
    role: String(row[2] || "").trim(),
    canApproveQuotation: bool(row[3]),
    approvalScopes: parseScopes(row[4]),
    maxApprovalAmount: rawAmount === "" ? null : Number(rawAmount) || 0,
    requiresTammasitFinalApproval: bool(row[6]),
    enabled: bool(row[7]),
  };
}

function permissionToRow(permission: ApprovalPermission) {
  return [
    permission.userId,
    permission.name,
    permission.role,
    String(permission.canApproveQuotation),
    permission.approvalScopes.join(","),
    permission.maxApprovalAmount === null ? "" : String(permission.maxApprovalAmount),
    String(permission.requiresTammasitFinalApproval),
    String(permission.enabled),
    new Date().toISOString(),
  ];
}

async function ensureApprovalPermissionSheet() {
  const metadataResponse = await sheetsFetch("?fields=sheets.properties.title");
  const metadata = (await metadataResponse.json()) as { sheets?: Array<{ properties?: { title?: string } }> };
  const existing = new Set(metadata.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean));
  if (!existing.has(APPROVAL_PERMISSION_TAB)) {
    await sheetsFetch(":batchUpdate", {
      method: "POST",
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: APPROVAL_PERMISSION_TAB } } }],
      }),
    });
  }

  const headerRange = encodeURIComponent(`${APPROVAL_PERMISSION_TAB}!A1:I1`);
  await sheetsFetch(`/values/${headerRange}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [[...APPROVAL_PERMISSION_HEADERS]] }),
  });
}

async function readPermissionRows() {
  const range = encodeURIComponent(`${APPROVAL_PERMISSION_TAB}!A2:I`);
  const response = await sheetsFetch(`/values/${range}`);
  const payload = (await response.json()) as { values?: unknown[][] };
  return payload.values || [];
}

export async function listApprovalPermissions() {
  await ensureApprovalPermissionSheet();
  const rows = await readPermissionRows();
  const permissions = rows.map(rowToPermission).filter((item): item is ApprovalPermission => Boolean(item));
  if (permissions.length) return permissions;
  await saveApprovalPermissions(defaultApprovalPermissions);
  return defaultApprovalPermissions.map((item) => ({ ...item, approvalScopes: [...item.approvalScopes] }));
}

export async function saveApprovalPermissions(permissions: ApprovalPermission[]) {
  await ensureApprovalPermissionSheet();
  const clearRange = encodeURIComponent(`${APPROVAL_PERMISSION_TAB}!A2:I`);
  await sheetsFetch(`/values/${clearRange}:clear`, { method: "POST", body: JSON.stringify({}) });
  if (!permissions.length) return [];
  const appendRange = encodeURIComponent(`${APPROVAL_PERMISSION_TAB}!A:I`);
  await sheetsFetch(`/values/${appendRange}:append?valueInputOption=RAW&insertDataOption=OVERWRITE`, {
    method: "POST",
    body: JSON.stringify({ values: permissions.map(permissionToRow) }),
  });
  return permissions;
}
