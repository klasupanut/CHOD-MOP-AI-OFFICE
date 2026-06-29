import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(path) {
  const values = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    values[line.slice(0, index)] = line.slice(index + 1);
  }
  return values;
}

const env = loadEnv(resolve(".env.local"));
const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = (env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const spreadsheetId = env.GOOGLE_SHEET_ID_USERS;

if (!email || !privateKey || !spreadsheetId) {
  throw new Error("Google Sheets service-account environment is incomplete.");
}

const base64Url = (value) => Buffer.from(value).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
const payload = base64Url(JSON.stringify({
  iss: email,
  scope: "https://www.googleapis.com/auth/spreadsheets",
  aud: "https://oauth2.googleapis.com/token",
  exp: now + 3600,
  iat: now,
}));
const unsigned = `${header}.${payload}`;
const signer = createSign("RSA-SHA256");
signer.update(unsigned);
signer.end();
const assertion = `${unsigned}.${signer.sign(privateKey, "base64url")}`;

const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  }),
});
if (!tokenResponse.ok) throw new Error(`Google token request failed (${tokenResponse.status}).`);
const { access_token: token } = await tokenResponse.json();

async function sheets(path, init = {}) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Sheets request failed (${response.status}): ${detail.slice(0, 240)}`);
  }
  return response;
}

const metadataResponse = await sheets("?fields=sheets.properties.title");
const metadata = await metadataResponse.json();
const existing = new Set(metadata.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean));
const missing = ["Users", "Audit"].filter((title) => !existing.has(title));

if (missing.length) {
  await sheets(":batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
    }),
  });
}

const userHeaders = [
  "userId", "name", "email", "position", "role", "active",
  "modulePermissions", "quotationPermissions", "lastSignInProvider",
  "createdAt", "updatedAt",
];
const auditHeaders = ["timestamp", "event", "actorEmail", "targetEmail", "provider", "details"];

await Promise.all([
  sheets(`/values/${encodeURIComponent("Users!A1:K1")}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [userHeaders] }),
  }),
  sheets(`/values/${encodeURIComponent("Audit!A1:F1")}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [auditHeaders] }),
  }),
]);

const usersResponse = await sheets(`/values/${encodeURIComponent("Users!A2:K")}`);
const usersPayload = await usersResponse.json();
const superAdminEmail = (env.SUPER_ADMIN_EMAIL || "chod.mopteam@gmail.com").trim().toLowerCase();
const existingSuperAdmin = (usersPayload.values || []).some(
  (row) => String(row[2] || "").trim().toLowerCase() === superAdminEmail,
);

if (!existingSuperAdmin) {
  const timestamp = new Date().toISOString();
  const modules = [
    "Dashboard", "Tasks", "Projects", "PM Loop", "Renovation", "Fit-out Project",
    "Solar Projects", "Quotations", "Documents", "Approvals", "Reports", "Settings",
  ];
  const quotations = [
    "quotation.view", "quotation.create", "quotation.edit", "quotation.viewInternalCost",
    "quotation.viewMarkupProfit", "quotation.exportPdf", "quotation.createSigningLink",
    "quotation.changeStatus", "quotation.delete", "quotation.manageSignatures",
    "quotation.manageSettings",
  ];
  await sheets(`/values/${encodeURIComponent("Users!A:K")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({
      values: [[
        "super-admin", "CHOD MOP Team", superAdminEmail, "Super Admin", "Super Admin", "true",
        modules.join(","), quotations.join(","), "google", timestamp, timestamp,
      ]],
    }),
  });
  await sheets(`/values/${encodeURIComponent("Audit!A:F")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({
      values: [[timestamp, "login", superAdminEmail, "", "google", "Initial verified Google OAuth login"]],
    }),
  });
}

const [verifiedUsersResponse, verifiedAuditResponse] = await Promise.all([
  sheets(`/values/${encodeURIComponent("Users!A2:K")}`),
  sheets(`/values/${encodeURIComponent("Audit!A2:F")}`),
]);
const verifiedUsers = (await verifiedUsersResponse.json()).values || [];
const verifiedAudit = (await verifiedAuditResponse.json()).values || [];
const verifiedSuperAdmin = verifiedUsers.find(
  (row) => String(row[2] || "").trim().toLowerCase() === superAdminEmail,
);

console.log(JSON.stringify({
  authenticatedAs: email,
  spreadsheetReachable: true,
  tabsReady: ["Users", "Audit"],
  superAdminReady: true,
  superAdminProvider: String(verifiedSuperAdmin?.[8] || ""),
  auditRows: verifiedAudit.length,
}));
