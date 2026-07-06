import { NextResponse } from "next/server";
import type { ApprovalPermission } from "@/data/approval-permissions";
import { listApprovalPermissions, saveApprovalPermissions } from "@/lib/approvals/approval-permission-store";
import { getApiUser } from "@/lib/auth/api";
import { canEditApprovalPermissions } from "@/lib/auth/permissions";

function canManage(user: Awaited<ReturnType<typeof getApiUser>>) {
  return Boolean(user && canEditApprovalPermissions(user.role, user.email));
}

function sanitizePermission(input: ApprovalPermission): ApprovalPermission {
  const allowedScopes = ["all", "fit-out", "restoration", "electrical", "solar", "renovation", "maintenance", "general"] as const;
  return {
    userId: String(input.userId || "").trim(),
    name: String(input.name || "").trim(),
    role: String(input.role || "").trim(),
    canApproveQuotation: Boolean(input.canApproveQuotation),
    approvalScopes: Array.isArray(input.approvalScopes)
      ? input.approvalScopes.filter((scope) => allowedScopes.includes(scope))
      : [],
    maxApprovalAmount: input.maxApprovalAmount === null || input.maxApprovalAmount === undefined || input.maxApprovalAmount === 0
      ? input.maxApprovalAmount === 0 ? 0 : null
      : Number(input.maxApprovalAmount) || 0,
    requiresTammasitFinalApproval: Boolean(input.requiresTammasitFinalApproval),
    enabled: Boolean(input.enabled),
  };
}

export async function GET() {
  const user = await getApiUser("Settings");
  if (!canManage(user)) return NextResponse.json({ error: "Forbidden" }, { status: user ? 403 : 401 });
  try {
    return NextResponse.json({ permissions: await listApprovalPermissions() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Approval permission store unavailable." },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request) {
  const user = await getApiUser("Settings");
  if (!canManage(user)) return NextResponse.json({ error: "Forbidden" }, { status: user ? 403 : 401 });
  try {
    const body = (await request.json()) as { permissions?: ApprovalPermission[] };
    if (!Array.isArray(body.permissions)) throw new Error("Invalid approval permissions payload.");
    const permissions = body.permissions
      .map(sanitizePermission)
      .filter((permission) => permission.userId && permission.name);
    await saveApprovalPermissions(permissions);
    return NextResponse.json({ ok: true, permissions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save approval permissions." },
      { status: 400 },
    );
  }
}
