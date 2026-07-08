import { NextResponse } from "next/server";
import type { QuotationApprovalStatus } from "@/data/quotation-approvals";
import { listApprovalPermissions } from "@/lib/approvals/approval-permission-store";
import { canUserApproveQuotation } from "@/lib/approvals/approval-utils";
import { findApprovalRow, updateApprovalStatus } from "@/lib/approvals/approval-store";
import { syncQuotationStatusToBackend } from "@/lib/approvals/quotation-approval-source";
import { requireModule } from "@/lib/auth/session";
import { rejectUnsafeMutationRequest } from "@/lib/security/request-guards";
import type { AgentId } from "@/lib/types";

const writableStatuses: QuotationApprovalStatus[] = ["Waiting Final Approval", "Approved", "Rejected", "Revision Required"];

function userAgentId(user: { email: string; characterId?: AgentId | "" }): AgentId {
  return (user.characterId || (user.email.toLowerCase() === "chod.mopteam@gmail.com" ? "kla" : "film")) as AgentId;
}

export async function GET(_: Request, { params }: { params: Promise<{ approvalId: string }> }) {
  await requireModule("Approvals");
  const { approvalId } = await params;
  const approval = await findApprovalRow(approvalId);
  if (!approval) return NextResponse.json({ error: "Approval not found" }, { status: 404 });
  return NextResponse.json({ approval });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ approvalId: string }> }) {
  const unsafe = rejectUnsafeMutationRequest(request);
  if (unsafe) return unsafe;

  const user = await requireModule("Approvals");
  const { approvalId } = await params;
  const approval = await findApprovalRow(approvalId);
  if (!approval) return NextResponse.json({ error: "Approval not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { status?: QuotationApprovalStatus; note?: string };
  if (!body.status || !writableStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Invalid approval status" }, { status: 400 });
  }

  const approvalPermissions = await listApprovalPermissions();
  const permission = canUserApproveQuotation(user, userAgentId(user), approval, approvalPermissions);
  if (!permission.allowed) {
    return NextResponse.json({ error: permission.reason || "Not allowed to update this quotation approval" }, { status: 403 });
  }

  const finalStatus = body.status === "Approved" && permission.needsFinal ? "Waiting Final Approval" : body.status;
  const syncResult = await syncQuotationStatusToBackend(approval, finalStatus, user.name, body.note);
  if (!syncResult.ok) {
    return NextResponse.json(
      { error: syncResult.error || "Quotation status sync failed." },
      { status: 502 },
    );
  }

  const updated = await updateApprovalStatus(approvalId, finalStatus, user.name, body.note);
  return NextResponse.json({
    approval: updated,
    mode: syncResult.mode,
    quotationSync: syncResult.skipped ? "skipped-local-only" : "synced",
  });
}
