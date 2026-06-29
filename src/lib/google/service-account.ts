import "server-only";

export const googleSheetsScope = "https://www.googleapis.com/auth/spreadsheets";

export function normalizeGooglePrivateKey(rawKey: string | undefined) {
  let key = String(rawKey || "").trim();
  if (!key) return "";

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  key = key
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  const pem = key.match(/-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/);
  if (!pem) return key;

  const body = pem[1].replace(/\s+/g, "");
  const wrappedBody = body.match(/.{1,64}/g)?.join("\n") || body;
  return `-----BEGIN PRIVATE KEY-----\n${wrappedBody}\n-----END PRIVATE KEY-----\n`;
}

export function getGoogleServiceAccountConfig() {
  return {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
    privateKey: normalizeGooglePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
  };
}

export function asGooglePrivateKeyError(error: unknown) {
  if (error instanceof Error && /DECODER routines|unsupported|PEM|private key/i.test(error.message)) {
    return new Error("Google service account private key is invalid. Re-copy GOOGLE_PRIVATE_KEY in Vercel with the full BEGIN/END PRIVATE KEY value.");
  }
  return error;
}
