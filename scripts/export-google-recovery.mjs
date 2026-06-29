import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = fs.readFileSync(path.join(rootDir, ".env.local"), "utf8");
const env = {};

for (const line of envText.split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
  const index = line.indexOf("=");
  env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
}

function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

async function getAccessToken() {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!email || !privateKey) throw new Error("Missing service account credentials in .env.local.");

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Token request failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function exportSpreadsheet(token, spreadsheetId, label, outDir) {
  const metadataResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const metadata = await metadataResponse.json();
  if (!metadataResponse.ok) {
    throw new Error(`${label} metadata failed: ${metadata.error?.message || JSON.stringify(metadata)}`);
  }

  const safeLabel = label.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
  const sheetDir = path.join(outDir, safeLabel);
  fs.mkdirSync(sheetDir, { recursive: true });

  const exported = {
    spreadsheetId,
    title: metadata.properties?.title || label,
    exportedAt: new Date().toISOString(),
    sheets: {},
  };

  for (const sheet of metadata.sheets || []) {
    const title = sheet.properties.title;
    const valuesResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(title)}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const values = await valuesResponse.json();
    if (!valuesResponse.ok) {
      throw new Error(`${label}/${title} values failed: ${values.error?.message || JSON.stringify(values)}`);
    }

    const rows = Array.isArray(values.values) ? values.values : [];
    exported.sheets[title] = rows;

    const fileBase = title.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase() || "sheet";
    fs.writeFileSync(path.join(sheetDir, `${fileBase}.csv`), toCsv(rows), "utf8");
  }

  fs.writeFileSync(path.join(sheetDir, "_spreadsheet.json"), JSON.stringify(exported, null, 2), "utf8");
  return {
    label,
    title: exported.title,
    spreadsheetId,
    sheetCount: Object.keys(exported.sheets).length,
    dir: sheetDir,
  };
}

async function exportAppsScript(outDir) {
  if (!env.QUOTATION_APPS_SCRIPT_URL) return null;

  const response = await fetch(env.QUOTATION_APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "listQuotations", payload: {} }),
  });
  const data = await response.json();
  const exported = {
    exportedAt: new Date().toISOString(),
    ok: response.ok && data.ok,
    status: response.status,
    response: data,
  };

  fs.writeFileSync(path.join(outDir, "quotation-apps-script-listQuotations.json"), JSON.stringify(exported, null, 2), "utf8");
  return { ok: exported.ok, count: Array.isArray(data.data) ? data.data.length : 0 };
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = path.join(rootDir, "backups", `google-sheets-recovery-${stamp}`);
fs.mkdirSync(outDir, { recursive: true });

const token = await getAccessToken();
const exports = [];
exports.push(await exportSpreadsheet(token, env.GOOGLE_SHEET_ID_USERS, "approved-users", outDir));
exports.push(await exportSpreadsheet(token, "1xRuzdRtxl8KvxwSe2wWqkd6TrrrKkDk0B6knKUIvEYI", "quotation-db", outDir));
const appsScript = await exportAppsScript(outDir);

const manifest = {
  exportedAt: new Date().toISOString(),
  outDir,
  exports,
  appsScript,
  note: "Local recovery backup exported via read-only Google Sheets API. Contains sensitive business data; keep private.",
};

fs.writeFileSync(path.join(outDir, "MANIFEST.json"), JSON.stringify(manifest, null, 2), "utf8");
console.log(JSON.stringify(manifest, null, 2));
