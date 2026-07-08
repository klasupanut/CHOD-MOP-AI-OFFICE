import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/api";
import {
  createApprovedUser,
  ensureSheetHeaders,
  findApprovedUser,
  getSuperAdminEmail,
  listApprovedUsers,
  recordAudit,
  updateApprovedUser,
} from "@/lib/auth/google-sheets-store";
import {
  canManageRole,
  isRole,
  modulePermissions,
  quotationPermissions,
  roleDefaults,
  roleRank,
  type ModulePermission,
  type QuotationPermission,
  type Role,
} from "@/lib/auth/permissions";
import { rejectUnsafeMutationRequest } from "@/lib/security/request-guards";
import type { ApprovedUser } from "@/lib/auth/types";
import type { AgentId } from "@/lib/types";

const characterIds: AgentId[] = ["tammasit", "film", "kla", "foreman", "moss"];

function isAdmin(role: Role) {
  return role === "Admin" || role === "Super Admin";
}

function allowedList<T extends string>(input: unknown, allowed: readonly T[]) {
  if (!Array.isArray(input)) return [];
  return input.filter((item): item is T => typeof item === "string" && allowed.includes(item as T));
}

function sanitizePayload(body: Record<string, unknown>, actor: ApprovedUser) {
  const requestedRole = String(body.role || "Viewer");
  if (!isRole(requestedRole)) throw new Error("Invalid role.");
  if (requestedRole === "Super Admin" && actor.role !== "Super Admin") {
    throw new Error("Only Super Admin can assign Super Admin.");
  }
  if (actor.role !== "Super Admin" && roleRank[requestedRole] > roleRank[actor.role]) {
    throw new Error("You cannot assign a role higher than your own.");
  }

  const requestedModules = Array.isArray(body.modulePermissions)
    ? allowedList<ModulePermission>(body.modulePermissions, modulePermissions)
    : roleDefaults[requestedRole].modules;
  const requestedQuotations = Array.isArray(body.quotationPermissions)
    ? allowedList<QuotationPermission>(body.quotationPermissions, quotationPermissions)
    : roleDefaults[requestedRole].quotations;
  const modules = actor.role === "Super Admin"
    ? requestedModules
    : requestedModules.filter((permission) => actor.modulePermissions.includes(permission));
  const quotations = actor.role === "Super Admin"
    ? requestedQuotations
    : requestedQuotations.filter((permission) => actor.quotationPermissions.includes(permission));
  const characterId: AgentId | "" = characterIds.includes(String(body.characterId) as AgentId)
    ? (String(body.characterId) as AgentId)
    : "";

  return {
    name: String(body.name || "").trim(),
    email: String(body.email || "").trim().toLowerCase(),
    position: String(body.position || "").trim(),
    role: requestedRole,
    active: Boolean(body.active),
    modulePermissions: modules,
    quotationPermissions: requestedRole === "Viewer"
      ? []
      : quotations,
    characterId,
  };
}

export async function GET() {
  const actor = await getApiUser("Settings");
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    await ensureSheetHeaders();
    return NextResponse.json({ users: await listApprovedUsers() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "User store unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const unsafe = rejectUnsafeMutationRequest(request);
  if (unsafe) return unsafe;

  const actor = await getApiUser("Settings");
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.action === "initialize") {
      await ensureSheetHeaders();
      return NextResponse.json({ ok: true });
    }
    await ensureSheetHeaders();
    const payload = sanitizePayload(body, actor);
    if (!payload.name || !payload.email.includes("@")) throw new Error("Name and valid email are required.");
    if (payload.email === getSuperAdminEmail()) {
      throw new Error("The Super Admin email is reserved and already exists.");
    }
    const user = await createApprovedUser(payload);
    await recordAudit({
      event: "user.create",
      actorEmail: actor.email,
      targetEmail: user.email,
      details: `role=${user.role};active=${user.active}`,
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add user." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const unsafe = rejectUnsafeMutationRequest(request);
  if (unsafe) return unsafe;

  const actor = await getApiUser("Settings");
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    await ensureSheetHeaders();
    const body = (await request.json()) as Record<string, unknown>;
    const userId = String(body.userId || "");
    const existing = await findApprovedUser(String(body.email || ""));
    const users = existing?.userId === userId ? [existing] : await listApprovedUsers();
    const target = users.find((user) => user.userId === userId);
    if (!target) throw new Error("User not found.");
    if (actor.role !== "Super Admin" && !canManageRole(actor.role, target.role)) {
      throw new Error("You cannot edit a user with an equal or higher role.");
    }
    const payload = sanitizePayload(body, actor);
    if (target.email !== getSuperAdminEmail() && payload.email === getSuperAdminEmail()) {
      throw new Error("The Super Admin email is reserved.");
    }
    if (target.email === getSuperAdminEmail()) {
      payload.email = getSuperAdminEmail();
      payload.role = "Super Admin";
      payload.active = true;
      payload.modulePermissions = roleDefaults["Super Admin"].modules;
      payload.quotationPermissions = roleDefaults["Super Admin"].quotations;
      payload.characterId = payload.characterId || "kla";
    }
    const user = await updateApprovedUser(userId, payload);
    await recordAudit({
      event: "user.update",
      actorEmail: actor.email,
      targetEmail: user.email,
      details: `role=${user.role};active=${user.active}`,
    });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update user." }, { status: 400 });
  }
}
