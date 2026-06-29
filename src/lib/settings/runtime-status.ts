import "server-only";

import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { join } from "node:path";
import type { SettingsDataConnectorStatus } from "@/lib/settings/data-connectors";

export type SettingsGeneralStatus = {
  appName: string;
  environment: string;
  appUrl: string;
  networkUrl: string;
  authProvider: string;
  aiMode: string;
  timezone: string;
  dataMode: string;
  costMode: string;
  otpMode: string;
  cards: Array<{ label: string; value: string; tone: "connected" | "degraded" | "disabled" | "future-ready" }>;
};

export type SettingsSystemStatus = {
  checkedAt: string;
  nodeEnv: string;
  localPort: string;
  appUrl: string;
  networkUrl: string;
  healthLinks: Array<{ label: string; href: string; detail: string }>;
  runtimeCards: Array<{ label: string; value: string; detail: string; tone: "connected" | "degraded" | "disabled" | "future-ready" }>;
  authReadiness: Array<{ label: string; ok: boolean; detail: string }>;
  deploymentReadiness: Array<{ label: string; ok: boolean; detail: string }>;
  maintenance: Array<{ title: string; detail: string }>;
};

function configured(value?: string) {
  return Boolean(value?.trim());
}

function getAppUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3010";
}

function getLocalPort(appUrl: string) {
  try {
    return new URL(appUrl).port || process.env.PORT || "3010";
  } catch {
    return process.env.PORT || "3010";
  }
}

function getNetworkUrl(port: string) {
  const interfaces = networkInterfaces();
  for (const values of Object.values(interfaces)) {
    for (const item of values || []) {
      if (item.family === "IPv4" && !item.internal) {
        return `http://${item.address}:${port}`;
      }
    }
  }
  return "Unavailable on this machine";
}

function googleBackendStatus(connectors: SettingsDataConnectorStatus) {
  const googleItems = connectors.connectors.filter((item) => item.category === "Google Sheets");
  if (!googleItems.length) return "disabled";
  if (googleItems.some((item) => item.status === "degraded" || item.status === "not-configured")) return "degraded";
  return "connected";
}

function quotationBackendStatus(connectors: SettingsDataConnectorStatus) {
  const quotation = connectors.connectors.find((item) => item.id === "quotation-apps-script");
  return quotation?.status === "connected" ? "connected" : quotation?.status === "degraded" ? "degraded" : "disabled";
}

function hasVercelLink() {
  return existsSync(join(process.cwd(), ".vercel", "project.json"));
}

export function getSettingsRuntimeStatus(connectors: SettingsDataConnectorStatus): {
  general: SettingsGeneralStatus;
  system: SettingsSystemStatus;
} {
  const appUrl = getAppUrl();
  const localPort = getLocalPort(appUrl);
  const networkUrl = getNetworkUrl(localPort);
  const googleStatus = googleBackendStatus(connectors);
  const quotationStatus = quotationBackendStatus(connectors);
  const supabaseEnabled = process.env.NEXT_PUBLIC_USE_SUPABASE === "true";
  const supabaseConfigured = configured(process.env.NEXT_PUBLIC_SUPABASE_URL) && configured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const smsOtpEnabled = process.env.ENABLE_SMS_OTP === "true";
  const aiMode = process.env.NEXT_PUBLIC_AI_MODE || "mock";
  const authProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "google";
  const vercelLinked = hasVercelLink();
  const googleOAuthReady = configured(process.env.AUTH_GOOGLE_ID) && configured(process.env.AUTH_GOOGLE_SECRET);

  return {
    general: {
      appName: process.env.NEXT_PUBLIC_APP_NAME || "CHOD MOP OFFICE",
      environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development",
      appUrl,
      networkUrl,
      authProvider: authProvider.toUpperCase(),
      aiMode: aiMode.toUpperCase(),
      timezone: "Asia/Bangkok / ICT",
      dataMode: "Live Google Sheets",
      costMode: "Free-first / approval required before paid usage",
      otpMode: smsOtpEnabled ? "SMS enabled" : `${process.env.CUSTOMER_SIGNING_OTP_MODE || "email"} only / SMS disabled`,
      cards: [
        { label: "Local app", value: "Online", tone: "connected" },
        { label: "Google backend", value: googleStatus === "connected" ? "Connected" : "Needs attention", tone: googleStatus },
        { label: "Supabase", value: supabaseEnabled ? supabaseConfigured ? "Connected" : "Needs env" : "Disabled", tone: supabaseEnabled ? supabaseConfigured ? "connected" : "degraded" : "disabled" },
        { label: "Auto Quotation", value: quotationStatus === "connected" ? "Connected" : "Needs attention", tone: quotationStatus },
        { label: "OTP mode", value: smsOtpEnabled ? "SMS enabled" : "Email only", tone: smsOtpEnabled ? "degraded" : "connected" },
        { label: "AI mode", value: aiMode === "openai" ? "OpenAI" : "Mock", tone: aiMode === "openai" ? "future-ready" : "connected" },
      ],
    },
    system: {
      checkedAt: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV || "unknown",
      localPort,
      appUrl,
      networkUrl,
      healthLinks: [
        { label: "Basic health", href: "/api/health", detail: "Local route handler, auth env and core app status." },
        { label: "Deep health", href: "/api/health?deep=1", detail: "Google Sheet public CSV and Apps Script backend probes." },
      ],
      runtimeCards: [
        { label: "App route handler", value: "Alive", detail: "Settings page can render when authenticated.", tone: "connected" },
        { label: "Node env", value: process.env.NODE_ENV || "unknown", detail: "Current Next.js runtime environment.", tone: "connected" },
        { label: "Local port", value: localPort, detail: "Current local development port.", tone: "connected" },
        { label: "Vercel link", value: vercelLinked ? "Linked" : "Not linked", detail: "Detected local .vercel/project.json.", tone: vercelLinked ? "connected" : "future-ready" },
      ],
      authReadiness: [
        { label: "AUTH_SECRET", ok: configured(process.env.AUTH_SECRET), detail: configured(process.env.AUTH_SECRET) ? "Configured." : "Missing; login session signing will fail." },
        { label: "AUTH_URL / NEXTAUTH_URL", ok: configured(appUrl), detail: appUrl },
        { label: "Google OAuth", ok: googleOAuthReady, detail: googleOAuthReady ? "Client ID and secret configured." : "AUTH_GOOGLE_ID or AUTH_GOOGLE_SECRET missing." },
        { label: "Google redirect URI", ok: true, detail: `${appUrl}/api/auth/callback/google` },
      ],
      deploymentReadiness: [
        { label: "Production env checklist", ok: googleOAuthReady && configured(process.env.AUTH_SECRET), detail: "Auth secret, Google OAuth and backend URLs must be copied to Vercel before official deploy." },
        { label: "Google OAuth production redirect", ok: !appUrl.includes("localhost"), detail: appUrl.includes("localhost") ? "Add production Vercel callback URL after deploy." : `${appUrl}/api/auth/callback/google` },
        { label: "Supabase optional", ok: !supabaseEnabled || supabaseConfigured, detail: supabaseEnabled ? "Supabase enabled locally." : "Supabase disabled; Google Sheets remains active." },
        { label: "Paid services", ok: !smsOtpEnabled && aiMode !== "openai", detail: "OpenAI/SMS OTP stay disabled unless explicitly approved." },
      ],
      maintenance: [
        { title: "Google fetch failed in app but direct probe OK", detail: "Restart localhost:3010 with network access, then rerun /api/health?deep=1." },
        { title: "Runtime TypeError / React Client Manifest error", detail: "Stop dev server, delete .next, then restart dev server. Avoid running build while dev server is active." },
        { title: "OAuth redirect mismatch", detail: "Match AUTH_URL with the exact Google Cloud redirect URI and current port/domain." },
        { title: "Official deploy check", detail: "After Vercel deploy, update AUTH_URL, Google OAuth redirect URI, and Vercel env vars before team login testing." },
      ],
    },
  };
}
