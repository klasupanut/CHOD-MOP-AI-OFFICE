import "server-only";

import { createSign, randomUUID } from "node:crypto";
import {
  modulePermissions,
  quotationPermissions,
  roleDefaults,
  roles,
  type ModulePermission,
  type QuotationPermission,
  type Role,
} from "./permissions";
import type { ApprovedUser, AuditEvent } from "./types";
import type { AgentId } from "@/lib/types";
import { asGooglePrivateKeyError, getGoogleServiceAccountConfig, googleSheetsScope } from "@/lib/google/service-account";

const USER_HEADERS = [
  "userId",
  "name",
  "email",
  "position",
  "role",
  "active",
  "modulePermissions",
  "quotationPermissions",
  "characterId",
  "lastSignInProvider",
  "lastSeenAt",
  "createdAt",
  "updatedAt",
] as const;

const USERS_TAB = "Users";
const AUDIT_TAB = "Audit";
const NOTIFICATION_READS_TAB = "Notification_Reads";
const NOTIFICATION_READ_HEADERS = ["userEmail", "notificationId", "readAt"] as const;
let cachedToken: { value: string; expiresAt: number } | null = null;
const characterIds: AgentId[] = ["tammasit", "film", "kla", "foreman", "moss"];
const APPROVED_USER_CACHE_MS = 60_000;
const PRESENCE_WRITE_INTERVAL_MS = 45_000;
const NOTIFICATION_READ_CACHE_MS = 120_000;
let approvedUserCache: { expiresAt: number; users: ApprovedUser[] } | null = null;
let approvedUserPromise: Promise<ApprovedUser[]> | null = null;
const recentPresenceWrites = new Map<string, { at: number; online: boolean }>();
const notificationReadCache = new Map<string, { expiresAt: number; ids: string[] }>();
const notificationReadPromises = new Map<string, Promise<string[]>>();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getSuperAdminEmail() {
  return normalizeEmail(process.env.SUPER_ADMIN_EMAIL || "chod.mopteam@gmail.com");
}

function getSheetId() {
  return process.env.GOOGLE_SHEET_ID_USERS || "";
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const { email, privateKey } = getGoogleServiceAccountConfig();
  if (!email || !privateKey || !getSheetId()) {
    throw new Error("Google Sheets user store is not configured.");
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

async function sheetsFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSheetId()}${path}`, {
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
    throw new Error(`Google Sheets request failed (${response.status}): ${detail.slice(0, 180)}`);
  }
  return response;
}

function parseList<T extends string>(value: unknown, allowed: readonly T[]) {
  const parsed = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.filter((item): item is T => allowed.includes(item as T));
}

function rowToUser(row: unknown[]): ApprovedUser | null {
  const email = normalizeEmail(String(row[2] || ""));
  if (!email) return null;
  const role = roles.includes(String(row[4]) as Role) ? (String(row[4]) as Role) : "Viewer";
  const isSuperAdmin = email === getSuperAdminEmail();
  const hasPresenceColumn = row.length >= 13;
  const hasCharacterColumn = characterIds.includes(String(row[8]) as AgentId) || row.length >= 12;
  const characterId = characterIds.includes(String(row[8]) as AgentId)
    ? (String(row[8]) as AgentId)
    : isSuperAdmin ? "kla" : "";
  const lastSignInProvider = hasCharacterColumn ? String(row[9] || "") : String(row[8] || "");
  const lastSeenAt = hasPresenceColumn ? String(row[10] || "") : "";
  const createdAt = hasPresenceColumn
    ? String(row[11] || new Date().toISOString())
    : hasCharacterColumn ? String(row[10] || new Date().toISOString()) : String(row[9] || new Date().toISOString());
  const updatedAt = hasPresenceColumn
    ? String(row[12] || new Date().toISOString())
    : hasCharacterColumn ? String(row[11] || new Date().toISOString()) : String(row[10] || new Date().toISOString());
  return {
    userId: String(row[0] || randomUUID()),
    name: String(row[1] || email.split("@")[0]),
    email,
    position: String(row[3] || ""),
    role: isSuperAdmin ? "Super Admin" : role,
    active: isSuperAdmin ? true : String(row[5]).toLowerCase() === "true",
    modulePermissions: isSuperAdmin
      ? roleDefaults["Super Admin"].modules
      : parseList(row[6], modulePermissions),
    quotationPermissions: isSuperAdmin
      ? roleDefaults["Super Admin"].quotations
      : parseList(row[7], quotationPermissions),
    characterId,
    lastSignInProvider,
    lastSeenAt,
    createdAt,
    updatedAt,
  };
}

function userToRow(user: ApprovedUser) {
  return [
    user.userId,
    user.name,
    normalizeEmail(user.email),
    user.position,
    user.role,
    String(user.active),
    user.modulePermissions.join(","),
    user.quotationPermissions.join(","),
    user.characterId || "",
    user.lastSignInProvider,
    user.lastSeenAt || "",
    user.createdAt,
    user.updatedAt,
  ];
}

async function readRows() {
  const range = encodeURIComponent(`${USERS_TAB}!A2:M`);
  const response = await sheetsFetch(`/values/${range}`);
  const payload = (await response.json()) as { values?: unknown[][] };
  return payload.values || [];
}

function hydrateApprovedUsers(rows: unknown[][]) {
  const users = rows.map(rowToUser).filter((user): user is ApprovedUser => Boolean(user));
  const superAdmin = users.find((user) => user.email === getSuperAdminEmail());
  if (!superAdmin) users.unshift(createSuperAdmin());
  return users;
}

function invalidateApprovedUserCache() {
  approvedUserCache = null;
  approvedUserPromise = null;
}

export async function listApprovedUsers() {
  if (approvedUserCache && approvedUserCache.expiresAt > Date.now()) {
    return approvedUserCache.users.map((user) => ({ ...user }));
  }
  if (approvedUserPromise) return approvedUserPromise;

  approvedUserPromise = readRows()
    .then((rows) => {
      const users = hydrateApprovedUsers(rows);
      approvedUserCache = { expiresAt: Date.now() + APPROVED_USER_CACHE_MS, users };
      return users;
    })
    .catch((error) => {
      if (approvedUserCache) return approvedUserCache.users;
      throw error;
    })
    .finally(() => {
      approvedUserPromise = null;
    });

  return approvedUserPromise;
}

export async function probeApprovedUsersSheet() {
  await sheetsFetch("?fields=spreadsheetId");
  return true;
}

export async function findApprovedUser(email: string) {
  const normalized = normalizeEmail(email);
  if (normalized === getSuperAdminEmail()) {
    try {
      const found = (await listApprovedUsers()).find((user) => user.email === normalized);
      return found || createSuperAdmin();
    } catch {
      return createSuperAdmin();
    }
  }
  try {
    return (await listApprovedUsers()).find((user) => user.email === normalized) || null;
  } catch {
    return null;
  }
}

function createSuperAdmin(): ApprovedUser {
  const now = new Date().toISOString();
  return {
    userId: "super-admin",
    name: "CHOD MOP Team",
    email: getSuperAdminEmail(),
    position: "Super Admin",
    role: "Super Admin",
    active: true,
    modulePermissions: roleDefaults["Super Admin"].modules,
    quotationPermissions: roleDefaults["Super Admin"].quotations,
    characterId: "kla",
    lastSignInProvider: "",
    lastSeenAt: "",
    createdAt: now,
    updatedAt: now,
  };
}

async function appendRows(tab: string, rows: unknown[][]) {
  const range = encodeURIComponent(`${tab}!A:Z`);
  await sheetsFetch(`/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ values: rows }),
  });
}

function hasExpectedHeader(actual: unknown[], expected: readonly string[]) {
  return expected.every((value, index) => String(actual[index] || "").trim() === value);
}

async function readHeaderRow(tab: string, lastColumn: string) {
  const range = encodeURIComponent(`${tab}!A1:${lastColumn}1`);
  const response = await sheetsFetch(`/values/${range}`);
  const payload = (await response.json()) as { values?: unknown[][] };
  return payload.values?.[0] || [];
}

async function listUserStoreSheetTitles() {
  const metadataResponse = await sheetsFetch("?fields=sheets.properties.title");
  const metadata = (await metadataResponse.json()) as { sheets?: Array<{ properties?: { title?: string } }> };
  return new Set(metadata.sheets?.map((sheet) => sheet.properties?.title).filter((title): title is string => Boolean(title)));
}

async function ensureNotificationReadSheet() {
  const titles = await listUserStoreSheetTitles();
  if (!titles.has(NOTIFICATION_READS_TAB)) {
    await sheetsFetch(":batchUpdate", {
      method: "POST",
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: NOTIFICATION_READS_TAB } } }] }),
    });
  }
  const header = await readHeaderRow(NOTIFICATION_READS_TAB, "C");
  if (!hasExpectedHeader(header, NOTIFICATION_READ_HEADERS)) {
    const range = encodeURIComponent(`${NOTIFICATION_READS_TAB}!A1:C1`);
    await sheetsFetch(`/values/${range}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [[...NOTIFICATION_READ_HEADERS]] }),
    });
  }
}

export async function listReadNotificationIds(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const cached = notificationReadCache.get(normalizedEmail);
  if (cached && cached.expiresAt > Date.now()) return [...cached.ids];
  const pending = notificationReadPromises.get(normalizedEmail);
  if (pending) return pending;

  const load = (async () => {
    const titles = await listUserStoreSheetTitles();
    if (!titles.has(NOTIFICATION_READS_TAB)) return [];
    const range = encodeURIComponent(`${NOTIFICATION_READS_TAB}!A2:C`);
    const response = await sheetsFetch(`/values/${range}`);
    const payload = (await response.json()) as { values?: unknown[][] };
    const ids = [...new Set((payload.values || [])
      .filter((row) => normalizeEmail(String(row[0] || "")) === normalizedEmail)
      .map((row) => String(row[1] || "").trim())
      .filter(Boolean))];
    notificationReadCache.set(normalizedEmail, { expiresAt: Date.now() + NOTIFICATION_READ_CACHE_MS, ids });
    return ids;
  })().finally(() => {
    notificationReadPromises.delete(normalizedEmail);
  });
  notificationReadPromises.set(normalizedEmail, load);
  return load;
}

export async function markNotificationsRead(email: string, notificationIds: string[]) {
  const normalizedEmail = normalizeEmail(email);
  const requestedIds = [...new Set(notificationIds.map((id) => String(id || "").trim()).filter(Boolean))];
  if (!requestedIds.length) return listReadNotificationIds(normalizedEmail);

  await ensureNotificationReadSheet();
  const existingIds = await listReadNotificationIds(normalizedEmail);
  const existing = new Set(existingIds);
  const nextIds = requestedIds.filter((id) => !existing.has(id));
  if (nextIds.length) {
    await appendRows(NOTIFICATION_READS_TAB, nextIds.map((notificationId) => [
      normalizedEmail,
      notificationId,
      new Date().toISOString(),
    ]));
  }
  const ids = [...new Set([...existingIds, ...requestedIds])];
  notificationReadCache.set(normalizedEmail, { expiresAt: Date.now() + NOTIFICATION_READ_CACHE_MS, ids });
  return ids;
}

export async function ensureSheetHeaders() {
  const metadataResponse = await sheetsFetch("?fields=sheets.properties.title");
  const metadata = (await metadataResponse.json()) as { sheets?: Array<{ properties?: { title?: string } }> };
  const existing = new Set(metadata.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean));
  const missing = [USERS_TAB, AUDIT_TAB].filter((title) => !existing.has(title));
  if (missing.length) {
    await sheetsFetch(":batchUpdate", {
      method: "POST",
      body: JSON.stringify({
        requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
      }),
    });
  }
  const [usersHeader, auditHeader] = await Promise.all([
    readHeaderRow(USERS_TAB, "M"),
    readHeaderRow(AUDIT_TAB, "F"),
  ]);
  const headerWrites: Promise<Response>[] = [];
  if (!hasExpectedHeader(usersHeader, USER_HEADERS)) {
    const usersRange = encodeURIComponent(`${USERS_TAB}!A1:M1`);
    headerWrites.push(sheetsFetch(`/values/${usersRange}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [[...USER_HEADERS]] }),
    }));
  }
  const auditHeaders = ["timestamp", "event", "actorEmail", "targetEmail", "provider", "details"];
  if (!hasExpectedHeader(auditHeader, auditHeaders)) {
    const auditRange = encodeURIComponent(`${AUDIT_TAB}!A1:F1`);
    headerWrites.push(sheetsFetch(`/values/${auditRange}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [auditHeaders] }),
    }));
  }
  if (headerWrites.length) {
    await Promise.all(headerWrites);
    invalidateApprovedUserCache();
  }
  await ensureSuperAdminRow();
}

async function ensureSuperAdminRow() {
  const rows = await readRows();
  const superAdminEmail = getSuperAdminEmail();
  const index = rows.findIndex((row) => normalizeEmail(String(row[2] || "")) === superAdminEmail);
  if (index >= 0) return;
  await appendRows(USERS_TAB, [userToRow(createSuperAdmin())]);
  invalidateApprovedUserCache();
}

export async function createApprovedUser(
  input: Pick<ApprovedUser, "name" | "email" | "position" | "role" | "active" | "modulePermissions" | "quotationPermissions" | "characterId">,
) {
  const email = normalizeEmail(input.email);
  if (email === getSuperAdminEmail()) {
    throw new Error("The Super Admin email is reserved and already exists.");
  }
  const existingRows = await readRows();
  const existing = existingRows.map(rowToUser).find((user) => user?.email === email);
  if (existing) {
    throw new Error("A user with this email already exists.");
  }
  const now = new Date().toISOString();
  const user: ApprovedUser = {
    ...input,
    userId: randomUUID(),
    email,
    lastSignInProvider: "",
    lastSeenAt: "",
    createdAt: now,
    updatedAt: now,
  };
  await appendRows(USERS_TAB, [userToRow(user)]);
  invalidateApprovedUserCache();
  return user;
}

export async function updateApprovedUser(userId: string, patch: Partial<ApprovedUser>) {
  const rows = await readRows();
  const index = rows.findIndex((row) => String(row[0]) === userId);
  if (index < 0) throw new Error("User not found.");
  const current = rowToUser(rows[index]);
  if (!current) throw new Error("User row is invalid.");
  const nextEmail = normalizeEmail(patch.email || current.email);
  if (nextEmail === getSuperAdminEmail() && current.email !== getSuperAdminEmail()) {
    throw new Error("The Super Admin email is reserved.");
  }
  const duplicate = rows
    .map(rowToUser)
    .find((candidate) => candidate?.userId !== userId && candidate?.email === nextEmail);
  if (duplicate) {
    throw new Error("A user with this email already exists.");
  }
  const updated: ApprovedUser = {
    ...current,
    ...patch,
    email: nextEmail,
    updatedAt: new Date().toISOString(),
  };
  if (updated.email === getSuperAdminEmail()) {
    updated.role = "Super Admin";
    updated.active = true;
    updated.modulePermissions = roleDefaults["Super Admin"].modules;
    updated.quotationPermissions = roleDefaults["Super Admin"].quotations;
  }
  const rowNumber = index + 2;
  const range = encodeURIComponent(`${USERS_TAB}!A${rowNumber}:M${rowNumber}`);
  await sheetsFetch(`/values/${range}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [userToRow(updated)] }),
  });
  invalidateApprovedUserCache();
  return updated;
}

export async function recordAudit(event: AuditEvent) {
  try {
    await appendRows(AUDIT_TAB, [[
      new Date().toISOString(),
      event.event,
      normalizeEmail(event.actorEmail),
      normalizeEmail(event.targetEmail || ""),
      event.provider || "",
      event.details || "",
    ]]);
  } catch (error) {
    console.error("Audit write failed", error);
  }
}

export async function recordSuccessfulLogin(email: string, provider: string, name: string) {
  const user = await findApprovedUser(email);
  if (!user) return;
  const now = new Date().toISOString();
  try {
    const rows = await readRows();
    const stored = rows.map(rowToUser).find((candidate) => candidate?.email === user.email);
    if (stored) {
      await updateApprovedUser(stored.userId, {
        lastSignInProvider: provider,
        lastSeenAt: now,
        name: name || stored.name,
      });
    } else if (user.email === getSuperAdminEmail()) {
      await appendRows(USERS_TAB, [userToRow({
        ...createSuperAdmin(),
        name: name || user.name,
        lastSignInProvider: provider,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      })]);
      invalidateApprovedUserCache();
    }
  } catch (error) {
    console.error("Unable to persist last sign-in provider", error);
  }
  await recordAudit({ event: "login", actorEmail: email, provider, details: "Successful OAuth login" });
}

export async function setApprovedUserPresence(email: string, online = true) {
  const normalizedEmail = normalizeEmail(email);
  const recentWrite = recentPresenceWrites.get(normalizedEmail);
  if (recentWrite?.online === online && Date.now() - recentWrite.at < PRESENCE_WRITE_INTERVAL_MS) return false;

  const rows = await readRows();
  const index = rows.findIndex((row) => normalizeEmail(String(row[2] || "")) === normalizedEmail);
  if (index < 0) return false;
  const current = rowToUser(rows[index]);
  if (!current?.active) return false;

  const now = new Date().toISOString();
  const updated: ApprovedUser = {
    ...current,
    lastSeenAt: online ? now : "1970-01-01T00:00:00.000Z",
    updatedAt: now,
  };
  const rowNumber = index + 2;
  const range = encodeURIComponent(`${USERS_TAB}!A${rowNumber}:M${rowNumber}`);
  await sheetsFetch(`/values/${range}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [userToRow(updated)] }),
  });
  recentPresenceWrites.set(normalizedEmail, { at: Date.now(), online });
  invalidateApprovedUserCache();
  return true;
}
