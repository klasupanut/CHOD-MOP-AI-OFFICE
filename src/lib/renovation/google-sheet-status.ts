import "server-only";

import { createSign } from "node:crypto";
import {
  columnIndexToLetter,
  normalizeRenovationStatus,
  RENOVATION_PILOT_OPERATION,
  RENOVATION_PILOT_PROJECT,
  RenovationStatusError,
  quoteRenovationSheetTitle,
  resolveRenovationMutationTarget,
  type RenovationStatusValue,
} from "@/lib/renovation/status-schema";
import {
  asGooglePrivateKeyError,
  getGoogleServiceAccountConfig,
  googleSheetsScope,
} from "@/lib/google/service-account";

const DEFAULT_RENOVATION_SHEET_ID = "1I5Z_MjvqTZlkb7NJJMieP0_SKcNmervyP7w_KCHRpac";
const writeModeValues = new Set(["enabled", "true", "live", "1"]);

let cachedToken: { value: string; expiresAt: number } | null = null;

function spreadsheetId() {
  return process.env.GOOGLE_SHEET_ID_RENOVATION || DEFAULT_RENOVATION_SHEET_ID;
}

export function isRenovationWriteEnabled() {
  return writeModeValues.has(
    String(process.env.RENOVATION_WRITE_MODE || "").trim().toLowerCase(),
  );
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const { email, privateKey } = getGoogleServiceAccountConfig();
  if (!email || !privateKey || !spreadsheetId()) {
    throw new RenovationStatusError(
      "Renovation Google Sheet write store is not configured.",
      503,
    );
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
  if (!response.ok) {
    throw new RenovationStatusError(
      `Google service account token failed (${response.status}).`,
      502,
    );
  }

  const token = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!token.access_token) {
    throw new RenovationStatusError("Google service account returned no access token.", 502);
  }
  cachedToken = {
    value: token.access_token,
    expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000,
  };
  return token.access_token;
}

async function sheetsFetch(pathname: string, init?: RequestInit) {
  const token = await getAccessToken();
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId()}${pathname}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    const permissionHint = response.status === 403
      ? " Share the renovation sheet with GOOGLE_SERVICE_ACCOUNT_EMAIL as Editor."
      : "";
    throw new RenovationStatusError(
      `Renovation Google Sheets request failed (${response.status}).${permissionHint} ${detail.slice(0, 180)}`.trim(),
      response.status === 403 ? 503 : 502,
    );
  }
  return response;
}

export type RenovationStatusUpdateInput = {
  project: string;
  operation: string;
  unitId: string;
  status: unknown;
  expectedStatus: unknown;
};

export async function updateRenovationSlabStatus(input: RenovationStatusUpdateInput) {
  if (input.project !== RENOVATION_PILOT_PROJECT) {
    throw new RenovationStatusError("Live write is enabled only for CHOD 2 pilot data.", 403);
  }
  if (input.operation !== RENOVATION_PILOT_OPERATION) {
    throw new RenovationStatusError("Live write is enabled only for Slab Renovation.", 403);
  }

  const nextStatus = normalizeRenovationStatus(input.status);
  const tab = quoteRenovationSheetTitle(RENOVATION_PILOT_PROJECT);
  const readRange = encodeURIComponent(`${tab}!A1:AZ`);
  const readResponse = await sheetsFetch(
    `/values/${readRange}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`,
  );
  const readPayload = (await readResponse.json()) as { values?: unknown[][] };
  const target = resolveRenovationMutationTarget(
    readPayload.values || [],
    input.unitId,
    input.expectedStatus,
  );

  if (target.currentStatus === nextStatus) {
    return {
      project: RENOVATION_PILOT_PROJECT,
      operation: RENOVATION_PILOT_OPERATION,
      unitId: String(input.unitId).trim(),
      status: nextStatus,
      changed: false,
    };
  }

  const column = columnIndexToLetter(target.statusColumnIndex);
  const exactRange = `${tab}!${column}${target.rowNumber}`;
  const encodedRange = encodeURIComponent(exactRange);
  const updateResponse = await sheetsFetch(
    `/values/${encodedRange}?valueInputOption=RAW&includeValuesInResponse=true&responseValueRenderOption=UNFORMATTED_VALUE`,
    {
      method: "PUT",
      body: JSON.stringify({ values: [[nextStatus]] }),
    },
  );
  const updatePayload = (await updateResponse.json()) as {
    updatedRange?: string;
    updatedRows?: number;
    updatedColumns?: number;
    updatedCells?: number;
    updatedData?: { values?: unknown[][] };
  };
  const confirmedStatus = normalizeRenovationStatus(
    updatePayload.updatedData?.values?.[0]?.[0],
  );
  const confirmedCell = String(updatePayload.updatedRange || "").split("!").at(-1);
  if (
    updatePayload.updatedRows !== 1
    || updatePayload.updatedColumns !== 1
    || updatePayload.updatedCells !== 1
    || confirmedCell !== `${column}${target.rowNumber}`
    || confirmedStatus !== nextStatus
  ) {
    throw new RenovationStatusError(
      "Google Sheets did not confirm the exact one-cell renovation update.",
      502,
    );
  }

  return {
    project: RENOVATION_PILOT_PROJECT,
    operation: RENOVATION_PILOT_OPERATION,
    unitId: String(input.unitId).trim(),
    status: confirmedStatus as RenovationStatusValue,
    changed: true,
  };
}
