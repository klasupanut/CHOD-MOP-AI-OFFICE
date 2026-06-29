export type SheetKey = "pm-loop" | "renovation" | "quotation" | "solar" | "documents";

const sheetEnv: Record<SheetKey, string | undefined> = {
  "pm-loop": process.env.GOOGLE_SHEET_ID_PM_LOOP,
  renovation: process.env.GOOGLE_SHEET_ID_RENOVATION,
  quotation: process.env.GOOGLE_SHEET_ID_QUOTATION,
  solar: process.env.GOOGLE_SHEET_ID_SOLAR,
  documents: process.env.GOOGLE_SHEET_ID_DOCUMENTS,
};

// Deliberately returns configuration only. Add the Google API client when real data is enabled.
export function getGoogleSheetsConfig(key: SheetKey) {
  return {
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "",
    privateKeyConfigured: Boolean(process.env.GOOGLE_PRIVATE_KEY),
    sheetId: sheetEnv[key] ?? "",
    configured: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && sheetEnv[key]),
  };
}
