import { readFile } from "node:fs/promises";
import { createSign } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/api";
import { asGooglePrivateKeyError, getGoogleServiceAccountConfig, googleSheetsScope } from "@/lib/google/service-account";

const assetRoot = path.join(process.cwd(), "budget-utilize-app-dist");
const DEFAULT_BUDGET_UTILIZE_SHEET_ID = "1NmVPZkEGxeUvIQYsuoyF7L9Xhjn03zH5RZvDf8UJ2Po";
const writeModeValues = new Set(["enabled", "true", "live", "1"]);
const allowedLocationSheets = new Map([
  ["1670988984", "CHOD 1"],
  ["715191170", "CHOD 2"],
  ["1288685133", "CHOD 3"],
  ["1504272791", "CHOD 5"],
  ["1651929286", "CHODBIZ KM.8"],
  ["21424830", "CHODBIZ CHAENG"],
  ["603834483", "CHODBIZ SAI4"],
]);
const statusWriteLabels = {
  done: "ดำเนินการแล้วเสร็จ",
  active: "กำลังดำเนินการ",
  stopped: "ไม่ดำเนินการ",
  blank: "",
} as const;

let cachedToken: { value: string; expiresAt: number } | null = null;

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function spreadsheetId() {
  return process.env.GOOGLE_SHEET_ID_BUDGET_UTILIZE || DEFAULT_BUDGET_UTILIZE_SHEET_ID;
}

function isWriteModeEnabled() {
  return writeModeValues.has(String(process.env.BUDGET_UTILIZE_WRITE_MODE || "").trim().toLowerCase());
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const { email, privateKey } = getGoogleServiceAccountConfig();
  if (!email || !privateKey || !spreadsheetId()) {
    throw new Error("Budget Utilize Google Sheet write store is not configured.");
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
  if (!response.ok) throw new Error(`Google service account token failed (${response.status}).`);
  const token = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 };
  return token.access_token;
}

async function sheetsFetch(pathname: string, init?: RequestInit) {
  const token = await getAccessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId()}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Budget Utilize Google Sheets request failed (${response.status}): ${detail.slice(0, 220)}`);
  }
  return response;
}

function canWriteBudgetUtilize(user: NonNullable<Awaited<ReturnType<typeof getApiUser>>>) {
  const email = user.email.trim().toLowerCase();
  const superAdminEmail = String(process.env.SUPER_ADMIN_EMAIL || "chod.mopteam@gmail.com").trim().toLowerCase();
  return user.role === "Super Admin" || user.role === "Admin" || user.characterId === "tammasit" || email === superAdminEmail;
}

function writeConfigFor(user: NonNullable<Awaited<ReturnType<typeof getApiUser>>>) {
  if (!isWriteModeEnabled()) {
    return {
      enabled: false,
      reason: "Budget Utilize write mode is locked. Set BUDGET_UTILIZE_WRITE_MODE=enabled after approval.",
    };
  }
  if (!canWriteBudgetUtilize(user)) {
    return {
      enabled: false,
      reason: "Only Super Admin, Admin, or Tammasit can write Projects & Budgets data.",
    };
  }
  return {
    enabled: true,
    reason: "Live write mode is enabled with guarded Google Sheets proxy.",
  };
}

function clean(value: unknown, maxLength = 1000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function toMoneyNumber(value: unknown) {
  const parsed = Number(clean(value).replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeStatusKey(value: unknown): keyof typeof statusWriteLabels {
  const key = clean(value).toLowerCase();
  if (key === "done" || key === "active" || key === "stopped" || key === "blank") return key;
  return "blank";
}

function stageProgress(stage: unknown) {
  const key = clean(stage).toLowerCase();
  return {
    bid: ["bid", "pr", "po", "con", "complete", "done"].includes(key),
    pr: ["pr", "po", "con", "complete", "done"].includes(key),
    po: ["po", "con", "complete", "done"].includes(key),
    con: ["con", "complete", "done"].includes(key),
  };
}

function normalizeProgress(value: unknown, fallbackStage?: unknown) {
  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    return {
      bid: Boolean(input.bid),
      pr: Boolean(input.pr),
      po: Boolean(input.po),
      con: Boolean(input.con),
    };
  }
  return stageProgress(fallbackStage);
}

function progressCell(checked: boolean) {
  return checked ? "100%" : "";
}

function escapeSheetName(name: string) {
  return `'${name.replace(/'/g, "''")}'`;
}

async function sheetTitleFromGid(gid: string) {
  if (!allowedLocationSheets.has(gid)) throw new Error("This sheet is not allowed for Budget Utilize writes.");
  const response = await sheetsFetch("?fields=sheets.properties(sheetId,title)");
  const metadata = (await response.json()) as { sheets?: Array<{ properties?: { sheetId?: number; title?: string } }> };
  const found = metadata.sheets?.find((sheet) => String(sheet.properties?.sheetId || "") === gid);
  const title = found?.properties?.title || allowedLocationSheets.get(gid);
  if (!title) throw new Error("Budget Utilize target sheet was not found.");
  return title;
}

function assertSafeRowNumber(rowNumber: unknown) {
  const parsed = Number(rowNumber);
  if (!Number.isInteger(parsed) || parsed < 4 || parsed > 5000) {
    throw new Error("Invalid row number for Budget Utilize write.");
  }
  return parsed;
}

function assertTaskIdentity(input: Record<string, unknown>, gid: string, rowNumber: number) {
  const taskId = clean(input.taskId, 120);
  if (taskId && !taskId.startsWith(`${gid}-${rowNumber}-`)) {
    throw new Error("Task identity does not match the requested sheet row.");
  }
}

async function readBudgetRow(title: string, rowNumber: number) {
  const range = encodeURIComponent(`${escapeSheetName(title)}!A${rowNumber}:N${rowNumber}`);
  const response = await sheetsFetch(`/values/${range}`);
  const payload = (await response.json()) as { values?: unknown[][] };
  const row = [...(payload.values?.[0] || [])];
  while (row.length < 14) row.push("");
  return row;
}

async function putBudgetRow(title: string, rowNumber: number, row: unknown[]) {
  const range = encodeURIComponent(`${escapeSheetName(title)}!A${rowNumber}:N${rowNumber}`);
  await sheetsFetch(`/values/${range}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    body: JSON.stringify({ values: [row.slice(0, 14)] }),
  });
}

async function appendBudgetRow(title: string, row: unknown[]) {
  const range = encodeURIComponent(`${escapeSheetName(title)}!A:N`);
  const response = await sheetsFetch(`/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ values: [row.slice(0, 14)] }),
  });
  return response.json() as Promise<{ updates?: { updatedRange?: string } }>;
}

async function deleteBudgetRow(gid: string, rowNumber: number) {
  await sheetsFetch(":batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: Number(gid),
              dimension: "ROWS",
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    }),
  });
}

async function nextIndexForSheet(title: string) {
  const range = encodeURIComponent(`${escapeSheetName(title)}!A:A`);
  const response = await sheetsFetch(`/values/${range}`);
  const payload = (await response.json()) as { values?: unknown[][] };
  const indexes = (payload.values || [])
    .map((row) => Number(clean(row[0]).replace(/,/g, "")))
    .filter((value) => Number.isFinite(value));
  return indexes.length ? Math.max(...indexes) + 1 : 1;
}

async function updateBudgetTask(payload: Record<string, unknown>) {
  const gid = clean(payload.gid, 32);
  const rowNumber = assertSafeRowNumber(payload.rowNumber);
  assertTaskIdentity(payload, gid, rowNumber);
  const title = await sheetTitleFromGid(gid);
  const row = await readBudgetRow(title, rowNumber);
  if (!clean(row[1], 500)) throw new Error("Target Budget Utilize row has no project item.");

  const updates = (payload.updates && typeof payload.updates === "object" ? payload.updates : {}) as Record<string, unknown>;
  const statusKey = normalizeStatusKey(updates.statusKey);
  const progress = normalizeProgress(updates.progress, updates.stage);

  row[2] = progressCell(progress.bid);
  row[3] = progressCell(progress.pr);
  row[4] = progressCell(progress.po);
  row[5] = progressCell(progress.con);
  row[6] = statusWriteLabels[statusKey];
  row[9] = clean(updates.budgetCode, 40);
  row[11] = clean(updates.owner, 80);
  row[12] = clean(updates.note, 1000);
  row[13] = clean(updates.poNumber, 120);

  await putBudgetRow(title, rowNumber, row);
  return { ok: true, mode: "updated", gid, rowNumber, sheet: title };
}

async function addBudgetProject(payload: Record<string, unknown>) {
  const project = (payload.project && typeof payload.project === "object" ? payload.project : {}) as Record<string, unknown>;
  const gid = clean(payload.gid, 32);
  const title = await sheetTitleFromGid(gid);
  const item = clean(project.item, 500);
  if (!item) throw new Error("Project item is required.");

  const statusKey = normalizeStatusKey(project.statusKey);
  const progress = normalizeProgress(null, project.stage);
  const index = await nextIndexForSheet(title);
  const row = [
    index,
    item,
    progressCell(progress.bid),
    progressCell(progress.pr),
    progressCell(progress.po),
    progressCell(progress.con),
    statusWriteLabels[statusKey],
    clean(project.contractor, 200),
    toMoneyNumber(project.budget),
    clean(project.budgetCode, 40),
    "",
    clean(project.owner, 80),
    clean(project.note, 1000),
    clean(project.poNumber, 120),
  ];

  const result = await appendBudgetRow(title, row);
  return { ok: true, mode: "appended", gid, sheet: title, updatedRange: result.updates?.updatedRange || "" };
}

async function deleteBudgetProject(payload: Record<string, unknown>) {
  const gid = clean(payload.gid, 32);
  const rowNumber = assertSafeRowNumber(payload.rowNumber);
  assertTaskIdentity(payload, gid, rowNumber);
  const title = await sheetTitleFromGid(gid);
  const row = await readBudgetRow(title, rowNumber);
  const item = clean(row[1], 500);
  const expectedItem = clean(payload.expectedItem, 500);
  if (!item) throw new Error("Target Budget Utilize row has no project item.");
  if (expectedItem && item !== expectedItem) {
    throw new Error("Delete blocked because the current row no longer matches the selected project.");
  }
  await deleteBudgetRow(gid, rowNumber);
  return { ok: true, mode: "deleted", gid, rowNumber, sheet: title };
}

function rewriteBudgetUtilizeSource(source: string) {
  return source
    .replaceAll("/api/sheet", "/api/budget-utilize-app/api/sheet")
    .replaceAll("/api/write-config", "/api/budget-utilize-app/api/write-config")
    .replaceAll("/api/update-task", "/api/budget-utilize-app/api/update-task")
    .replaceAll("/api/add-project", "/api/budget-utilize-app/api/add-project")
    .replaceAll("/api/delete-project", "/api/budget-utilize-app/api/delete-project");
}

function injectCursorRuntime(html: string) {
  const rewritten = rewriteBudgetUtilizeSource(html);
  if (rewritten.includes("chod-cursor-runtime.js")) return rewritten;
  return rewritten.replace("</body>", '<script src="/cursors/chod-cursor-runtime.js"></script></body>');
}

function localAssetResponse(body: BodyInit, requested: string, ext: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": contentTypes[ext] ?? "application/octet-stream",
      "Cache-Control": requested.endsWith(".html") || requested.endsWith(".js")
        ? "private, no-store"
        : "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function assertProjectAccess() {
  const user = await getApiUser("Projects");
  if (!user) return null;
  return user;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const user = await assertProjectAccess();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const segments = (await context.params).path;
  const requested = segments.length ? segments.join("/") : "index.html";

  if (requested === "api/write-config") {
    return NextResponse.json(writeConfigFor(user));
  }

  if (requested === "api/sheet") {
    const url = new URL(request.url);
    const gid = url.searchParams.get("gid");
    if (!/^\d+$/.test(gid || "")) {
      return NextResponse.json({ error: "Invalid gid" }, { status: 400 });
    }

    const upstream = `https://docs.google.com/spreadsheets/d/${spreadsheetId()}/export?format=csv&gid=${gid}`;
    const upstreamResponse = await fetch(upstream, { cache: "no-store" });
    if (!upstreamResponse.ok) {
      return new NextResponse(`Google Sheets export failed: ${upstreamResponse.status}`, {
        status: upstreamResponse.status,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const csv = new TextDecoder("utf-8").decode(await upstreamResponse.arrayBuffer());
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const resolved = path.resolve(assetRoot, requested);
  const relative = path.relative(assetRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return NextResponse.json({ error: "Invalid asset path" }, { status: 400 });
  }

  try {
    const data = await readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const rewritten = ext === ".html" || ext === ".js"
      ? rewriteBudgetUtilizeSource(data.toString("utf8"))
      : data;
    const body = ext === ".html" && typeof rewritten === "string"
      ? injectCursorRuntime(rewritten)
      : rewritten;

    return localAssetResponse(body, requested, ext);
  } catch {
    return NextResponse.json(
      { error: "Budget Utilize asset is not available. Sync budget-utilize-app-dist from the Budget Utilize project." },
      { status: 404 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const user = await assertProjectAccess();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requested = (await context.params).path.join("/");
  if (["api/update-task", "api/add-project", "api/delete-project"].includes(requested)) {
    const config = writeConfigFor(user);
    if (!config.enabled) {
      return NextResponse.json({ ok: false, error: "Budget Utilize write mode is locked.", detail: config.reason }, { status: 403 });
    }

    try {
      const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
      if (requested === "api/update-task") return NextResponse.json(await updateBudgetTask(payload));
      if (requested === "api/add-project") return NextResponse.json(await addBudgetProject(payload));
      if (requested === "api/delete-project") return NextResponse.json(await deleteBudgetProject(payload));
    } catch (error) {
      return NextResponse.json({
        ok: false,
        error: error instanceof Error ? error.message : "Budget Utilize write failed.",
      }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
