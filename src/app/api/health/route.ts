import { NextResponse } from "next/server";
import { probeApprovedUsersSheet } from "@/lib/auth/google-sheets-store";
import { getQuotationAppsScriptUrl, probeQuotationAppsScript } from "@/lib/quotations/apps-script-backend";

export const dynamic = "force-dynamic";

const bootedAt = new Date().toISOString();
const DEFAULT_FITOUT_SHEET_ID = "1UdyLxEI-v07rzwpKanJAGuJlyPV8bC9BN9gxBxXnB1U";

type HealthCheck = {
  ok: boolean;
  label: string;
  message: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const deep = url.searchParams.get("deep") === "1";
  const appUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3010";
  const fitoutSheetId = process.env.GOOGLE_SHEET_ID_FITOUT_PROJECT || DEFAULT_FITOUT_SHEET_ID;

  const checks: HealthCheck[] = [
    {
      ok: true,
      label: "app",
      message: "CHOD MOP OFFICE route handler is alive.",
    },
    {
      ok: Boolean(process.env.AUTH_SECRET),
      label: "auth-secret",
      message: process.env.AUTH_SECRET ? "AUTH_SECRET is configured." : "AUTH_SECRET is missing; login will fail.",
    },
    {
      ok: appUrl.includes("localhost:3010") || appUrl.includes("127.0.0.1:3010") || !appUrl.includes("localhost"),
      label: "auth-url",
      message: `Active auth URL: ${appUrl}`,
    },
    {
      ok: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
      label: "google-oauth",
      message: process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
        ? "Google OAuth client is configured."
        : "Google OAuth client is missing; login button may fail.",
    },
    {
      ok: Boolean(fitoutSheetId),
      label: "fitout-sheet-id",
      message: `Fit-out sheet ID: ${fitoutSheetId}`,
    },
    {
      ok: process.env.NEXT_PUBLIC_USE_SUPABASE !== "true" || Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      label: "supabase",
      message: process.env.NEXT_PUBLIC_USE_SUPABASE === "true"
        ? "Supabase is enabled; URL and anon key must be configured."
        : "Supabase is disabled for local MVP.",
    },
    {
      ok: Boolean(getQuotationAppsScriptUrl()),
      label: "quotation-backend-config",
      message: getQuotationAppsScriptUrl()
        ? "QUOTATION_APPS_SCRIPT_URL is configured."
        : "QUOTATION_APPS_SCRIPT_URL is missing; PDF export, sign link and customer OTP will fail.",
    },
  ];

  if (deep) {
    checks.push(await probeUsersSheet(10_000));
    checks.push(await probePublicSheet(fitoutSheetId, "RESTORATION", 10_000));
    checks.push(await probePublicSheet(fitoutSheetId, "FIT-OUT", 10_000));
    const quotationProbe = await probeQuotationAppsScript(10_000);
    checks.push({
      ok: quotationProbe.configured && quotationProbe.reachable,
      label: "quotation-apps-script",
      message: quotationProbe.message,
    });
  }

  const hardFailures = checks.filter((check) => !check.ok && ["app", "auth-url", "fitout-sheet-id", "supabase", "quotation-backend-config"].includes(check.label));
  const status = hardFailures.length ? "degraded" : "ok";

  return NextResponse.json(
    {
      ok: hardFailures.length === 0,
      status,
      app: "CHOD MOP OFFICE",
      bootedAt,
      checkedAt: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV || "unknown",
      appUrl,
      deep,
      checks,
    },
    { status: 200 },
  );
}

async function probeUsersSheet(timeoutMs: number): Promise<HealthCheck> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Users Google Sheet check timed out after ${timeoutMs}ms.`)), timeoutMs);
  });

  try {
    await Promise.race([probeApprovedUsersSheet(), timeout]);
    return {
      ok: true,
      label: "users-sheet",
      message: "Users Google Sheet responds with service account credentials.",
    };
  } catch (error) {
    return {
      ok: false,
      label: "users-sheet",
      message: error instanceof Error ? error.message : "Users Google Sheet check failed.",
    };
  }
}

async function probePublicSheet(sheetId: string, sheetName: string, timeoutMs: number): Promise<HealthCheck> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    return {
      ok: response.ok,
      label: `fitout-${sheetName.toLowerCase().replace(/\s+/g, "-")}`,
      message: response.ok
        ? `${sheetName} public CSV responds HTTP ${response.status}.`
        : `${sheetName} public CSV returned HTTP ${response.status}.`,
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      label: `fitout-${sheetName.toLowerCase().replace(/\s+/g, "-")}`,
      message: timedOut
        ? `${sheetName} public CSV timed out after ${timeoutMs}ms.`
        : error instanceof Error ? error.message : `${sheetName} public CSV check failed.`,
    };
  } finally {
    clearTimeout(timer);
  }
}
