import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_RENOVATION_SHEET_ID = "1I5Z_MjvqTZlkb7NJJMieP0_SKcNmervyP7w_KCHRpac";

function parseEnv(text) {
  const values = new Map();
  text.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) return;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values.set(match[1], value.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n"));
  });
  return values;
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

async function main() {
  const env = parseEnv(await readFile(path.join(process.cwd(), ".env.local"), "utf8"));
  const email = env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") || "";
  const privateKey = env.get("GOOGLE_PRIVATE_KEY") || "";
  const fileId = env.get("GOOGLE_SHEET_ID_RENOVATION") || DEFAULT_RENOVATION_SHEET_ID;
  if (!email || !privateKey || !fileId) {
    console.log(JSON.stringify({ configured: false, canEdit: false }));
    process.exitCode = 1;
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/drive.metadata.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 600,
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
  if (!tokenResponse.ok) {
    console.log(JSON.stringify({ configured: true, tokenStatus: tokenResponse.status, canEdit: false }));
    process.exitCode = 1;
    return;
  }
  const token = await tokenResponse.json();
  const fileResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,capabilities(canEdit,canShare)`,
    { headers: { Authorization: `Bearer ${token.access_token}` } },
  );
  if (!fileResponse.ok) {
    const detail = await fileResponse.json().catch(() => ({}));
    const reason = detail?.error?.errors?.[0]?.reason || detail?.error?.status || "unknown";
    console.log(JSON.stringify({ configured: true, driveStatus: fileResponse.status, reason, canEdit: false }));
    process.exitCode = 1;
    return;
  }
  const file = await fileResponse.json();
  console.log(JSON.stringify({
    configured: true,
    driveStatus: fileResponse.status,
    canEdit: Boolean(file.capabilities?.canEdit),
    canShare: Boolean(file.capabilities?.canShare),
  }));
  if (!file.capabilities?.canEdit) process.exitCode = 2;
}

main().catch((error) => {
  console.error(JSON.stringify({ configured: true, canEdit: false, error: error?.message || "Access check failed" }));
  process.exitCode = 1;
});
