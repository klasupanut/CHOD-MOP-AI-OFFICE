import "server-only";

import { projectConnectors } from "@/data/project-connectors";
import { getQuotationAppsScriptUrl, probeQuotationAppsScript } from "@/lib/quotations/apps-script-backend";

const DEFAULT_FITOUT_SHEET_ID = "1UdyLxEI-v07rzwpKanJAGuJlyPV8bC9BN9gxBxXnB1U";

export type ConnectorHealth = "connected" | "degraded" | "not-configured" | "disabled" | "future-ready";

export type SettingsConnectorItem = {
  id: string;
  name: string;
  category: "Google Sheets" | "Apps Script" | "Auth" | "Supabase" | "Future Connector";
  status: ConnectorHealth;
  description: string;
  source: string;
  tabs: string[];
  envKeys: string[];
  openUrl?: string;
  testUrl?: string;
  message: string;
  enabled: boolean;
};

export type SettingsDataConnectorStatus = {
  checkedAt: string;
  summary: {
    connected: number;
    degraded: number;
    notConfigured: number;
    disabled: number;
    futureReady: number;
  };
  connectors: SettingsConnectorItem[];
  safetyNotes: string[];
};

function configured(value?: string) {
  return Boolean(value?.trim());
}

function maskValue(value?: string) {
  const text = value?.trim() || "";
  if (!text) return "Not configured";
  if (text.length <= 12) return `${text.slice(0, 3)}...`;
  return `${text.slice(0, 6)}...${text.slice(-6)}`;
}

function sheetUrl(sheetId?: string) {
  const id = sheetId?.trim();
  return id ? `https://docs.google.com/spreadsheets/d/${id}/edit` : undefined;
}

function statusFromError(isConfigured: boolean, error?: string): ConnectorHealth {
  if (!isConfigured) return "not-configured";
  return error ? "degraded" : "connected";
}

function summarize(connectors: SettingsConnectorItem[]) {
  return {
    connected: connectors.filter((item) => item.status === "connected").length,
    degraded: connectors.filter((item) => item.status === "degraded").length,
    notConfigured: connectors.filter((item) => item.status === "not-configured").length,
    disabled: connectors.filter((item) => item.status === "disabled").length,
    futureReady: connectors.filter((item) => item.status === "future-ready").length,
  };
}

export async function getSettingsDataConnectors(input: {
  userStoreError?: string;
  approvalPermissionError?: string;
} = {}): Promise<SettingsDataConnectorStatus> {
  const usersSheetId = process.env.GOOGLE_SHEET_ID_USERS || "";
  const taskProjectSheetId = process.env.GOOGLE_SHEET_ID_TASK_PROJECT || usersSheetId;
  const fitoutSheetId = process.env.GOOGLE_SHEET_ID_FITOUT_PROJECT || DEFAULT_FITOUT_SHEET_ID;
  const quotationSheetId = process.env.GOOGLE_SHEET_ID_QUOTATION || "";
  const quotationProbe = await probeQuotationAppsScript(7_000);
  const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3010";
  const supabaseEnabled = process.env.NEXT_PUBLIC_USE_SUPABASE === "true";
  const supabaseConfigured = configured(process.env.NEXT_PUBLIC_SUPABASE_URL) && configured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const connectors: SettingsConnectorItem[] = [
    {
      id: "users-permissions-sheet",
      name: "Users / Permissions Sheet",
      category: "Google Sheets",
      status: statusFromError(configured(usersSheetId), input.userStoreError),
      description: "Approved users, character assignment, module permissions and audit sheet.",
      source: `Sheet ID: ${maskValue(usersSheetId)}`,
      tabs: ["Users", "Audit"],
      envKeys: ["GOOGLE_SHEET_ID_USERS", "GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY"],
      openUrl: sheetUrl(usersSheetId),
      testUrl: "/api/health?deep=1",
      message: input.userStoreError || "Service account can read/write the configured user store.",
      enabled: true,
    },
    {
      id: "approval-permission-sheet",
      name: "Approval Permission Sheet",
      category: "Google Sheets",
      status: statusFromError(configured(usersSheetId), input.approvalPermissionError),
      description: "Internal approval authority and quotation approval scope per team member.",
      source: `Sheet ID: ${maskValue(usersSheetId)}`,
      tabs: ["ApprovalPermissions"],
      envKeys: ["GOOGLE_SHEET_ID_USERS"],
      openUrl: sheetUrl(usersSheetId),
      testUrl: "/api/health?deep=1",
      message: input.approvalPermissionError || "Approval permission table is available.",
      enabled: true,
    },
    {
      id: "tasks-projects-sheet",
      name: "Tasks / Projects Sheet",
      category: "Google Sheets",
      status: configured(taskProjectSheetId) ? "connected" : "not-configured",
      description: "Live task board, project parent records, team assignment and timelines.",
      source: `Sheet ID: ${maskValue(taskProjectSheetId)}`,
      tabs: ["Tasks", "Projects"],
      envKeys: ["GOOGLE_SHEET_ID_TASK_PROJECT"],
      openUrl: sheetUrl(taskProjectSheetId),
      testUrl: "/tasks",
      message: process.env.GOOGLE_SHEET_ID_TASK_PROJECT
        ? "Dedicated Task / Project sheet is configured."
        : configured(usersSheetId)
          ? "Using Users sheet as the current shared Task / Project database."
          : "No Google Sheet is configured for Tasks / Projects.",
      enabled: true,
    },
    {
      id: "fitout-project-sheet",
      name: "Fit-out / Restoration Sheet",
      category: "Google Sheets",
      status: configured(fitoutSheetId) ? "connected" : "not-configured",
      description: "Live Fit-out Project dashboard data from the operation dashboard source.",
      source: `Sheet ID: ${maskValue(fitoutSheetId)}`,
      tabs: ["FIT-OUT", "RESTORATION", "Annual performance summary"],
      envKeys: ["GOOGLE_SHEET_ID_FITOUT_PROJECT"],
      openUrl: sheetUrl(fitoutSheetId),
      testUrl: "/fit-out-project",
      message: "Public Google Sheet CSV is used for live Fit-out / Restoration reporting.",
      enabled: true,
    },
    {
      id: "quotation-sheet",
      name: "Quotation Data Sheet",
      category: "Google Sheets",
      status: configured(quotationSheetId) ? "connected" : "future-ready",
      description: "Optional direct quotation DB sheet ID for extra field sync and future reporting.",
      source: `Sheet ID: ${maskValue(quotationSheetId)}`,
      tabs: ["Quotations", "QuotationItems", "SigningLog"],
      envKeys: ["GOOGLE_SHEET_ID_QUOTATION"],
      openUrl: sheetUrl(quotationSheetId),
      testUrl: "/quotations",
      message: configured(quotationSheetId)
        ? "Quotation Sheet ID is configured."
        : "Quotation currently flows through Apps Script backend; direct sheet ID is reserved for future sync.",
      enabled: configured(quotationSheetId),
    },
    {
      id: "quotation-apps-script",
      name: "Auto Quotation Apps Script",
      category: "Apps Script",
      status: quotationProbe.configured
        ? quotationProbe.reachable ? "connected" : "degraded"
        : "not-configured",
      description: "PDF export, Google Drive upload, sign-link request, OTP and quotation list backend.",
      source: getQuotationAppsScriptUrl() ? "Server-only URL configured" : "Not configured",
      tabs: ["listQuotations", "exportPdf", "createSigningLink", "verifyOtp"],
      envKeys: ["QUOTATION_APPS_SCRIPT_URL"],
      testUrl: "/api/health?deep=1",
      message: quotationProbe.message,
      enabled: quotationProbe.configured,
    },
    {
      id: "google-oauth",
      name: "Google Sign-In OAuth",
      category: "Auth",
      status: configured(process.env.AUTH_GOOGLE_ID) && configured(process.env.AUTH_GOOGLE_SECRET) ? "connected" : "not-configured",
      description: "Primary sign-in provider. Access still depends on approved email list.",
      source: `Auth URL: ${authUrl}`,
      tabs: ["Google Provider", "Approved user check"],
      envKeys: ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "AUTH_URL"],
      testUrl: "/login",
      message: `Redirect URI required in Google Cloud: ${authUrl}/api/auth/callback/google`,
      enabled: true,
    },
    {
      id: "supabase",
      name: "Supabase Database",
      category: "Supabase",
      status: supabaseEnabled ? supabaseConfigured ? "connected" : "degraded" : "disabled",
      description: "Optional future production database for users, tasks, approvals, audit logs and document index.",
      source: supabaseEnabled ? "Supabase enabled" : "Disabled locally",
      tabs: ["users", "tasks", "approvals", "audit_logs", "project_metadata"],
      envKeys: ["NEXT_PUBLIC_USE_SUPABASE", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
      message: supabaseEnabled
        ? supabaseConfigured ? "Supabase env is configured." : "Supabase is enabled but URL / anon key is missing."
        : "Supabase is prepared but disabled. Google Sheets remains the active data source.",
      enabled: supabaseEnabled,
    },
    ...projectConnectors
      .filter((connector) => !["task-project-database", "quotation-generator", "fitout-project"].includes(connector.id))
      .map((connector): SettingsConnectorItem => ({
        id: connector.id,
        name: connector.name,
        category: "Future Connector",
        status: connector.enabled ? connector.status === "connected" ? "connected" : "future-ready" : "disabled",
        description: connector.description,
        source: connector.githubRepoUrl || connector.localPath || connector.apiEndpoint || "Prepared for future setup",
        tabs: connector.scope || connector.connectionReady || [connector.type],
        envKeys: [],
        openUrl: connector.githubRepoUrl || undefined,
        message: connector.enabled ? "Prepared connector is enabled." : "Prepared for future connection; not active in production flow yet.",
        enabled: connector.enabled,
      })),
  ];

  return {
    checkedAt: new Date().toISOString(),
    summary: summarize(connectors),
    connectors,
    safetyNotes: [
      "No paid Google Cloud billing is required for the current MVP connector setup.",
      "Do not enable paid quotas, SMS OTP, or paid Supabase features without user approval.",
      "Connection tests are read-only. Do not send real customer OTP from this panel.",
      "Google Sheets shown here are live data sources; avoid random write tests.",
    ],
  };
}
