import "server-only";

import { createSign } from "node:crypto";
import {
  columnIndexToLetter,
  displayRenovationFieldValue,
  normalizeRenovationOperation,
  normalizeRenovationProject,
  quoteRenovationSheetTitle,
  resolveRenovationMutationTargets,
  RenovationStatusError,
  type RenovationFieldChangeInput,
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

export type RenovationFieldsUpdateInput = {
  project: string;
  operation: string;
  unitId: string;
  changes: RenovationFieldChangeInput[];
};

export async function updateRenovationFields(input: RenovationFieldsUpdateInput) {
  const project = normalizeRenovationProject(input.project);
  const operation = normalizeRenovationOperation(input.operation);
  const tab = quoteRenovationSheetTitle(project);
  const readRange = encodeURIComponent(`${tab}!A1:AZ`);
  const readResponse = await sheetsFetch(
    `/values/${readRange}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`,
  );
  const readPayload = (await readResponse.json()) as { values?: unknown[][] };
  const target = resolveRenovationMutationTargets(
    readPayload.values || [],
    input.unitId,
    operation,
    input.changes,
  );
  const changedFields = target.fields.filter((item) => item.changed);
  const confirmedValues = Object.fromEntries(
    target.fields.map((item) => [item.field.key, item.nextValue]),
  );

  if (!changedFields.length) {
    return {
      project,
      operation,
      unitId: String(input.unitId).trim(),
      values: confirmedValues,
      changedFields: [] as string[],
      changed: false,
    };
  }

  const ranges = changedFields.map((item) => {
    const column = columnIndexToLetter(item.columnIndex);
    return {
      field: item,
      cell: `${column}${target.rowNumber}`,
      range: `${tab}!${column}${target.rowNumber}`,
    };
  });
  const updateResponse = await sheetsFetch("/values:batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      valueInputOption: "RAW",
      includeValuesInResponse: true,
      responseValueRenderOption: "UNFORMATTED_VALUE",
      responseDateTimeRenderOption: "SERIAL_NUMBER",
      data: ranges.map((item) => ({
        range: item.range,
        majorDimension: "ROWS",
        values: [[item.field.googleValue]],
      })),
    }),
  });
  const updatePayload = (await updateResponse.json()) as {
    totalUpdatedCells?: number;
    responses?: Array<{
      updatedRange?: string;
      updatedRows?: number;
      updatedColumns?: number;
      updatedCells?: number;
      updatedData?: { values?: unknown[][] };
    }>;
  };

  if (updatePayload.totalUpdatedCells !== ranges.length
    || updatePayload.responses?.length !== ranges.length) {
    throw new RenovationStatusError(
      "Google Sheets did not confirm every renovation field update.",
      502,
    );
  }

  updatePayload.responses.forEach((response, index) => {
    const expected = ranges[index];
    const confirmedCell = String(response.updatedRange || "").split("!").at(-1);
    const confirmedValue = displayRenovationFieldValue(
      expected.field.field,
      response.updatedData?.values?.[0]?.[0],
    );
    if (
      response.updatedRows !== 1
      || response.updatedColumns !== 1
      || response.updatedCells !== 1
      || confirmedCell !== expected.cell
      || confirmedValue.toLowerCase() !== expected.field.nextValue.toLowerCase()
    ) {
      throw new RenovationStatusError(
        `Google Sheets did not confirm the exact ${expected.field.field.label} cell update.`,
        502,
      );
    }
    confirmedValues[expected.field.field.key] = confirmedValue;
  });

  return {
    project,
    operation,
    unitId: String(input.unitId).trim(),
    values: confirmedValues,
    changedFields: changedFields.map((item) => item.field.key),
    changed: true,
  };
}
