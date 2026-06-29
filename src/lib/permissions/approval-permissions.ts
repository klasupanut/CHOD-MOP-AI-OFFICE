import type { ApprovalPermission } from "@/data/approval-permissions";
import type { QuotationApprovalItem } from "@/data/quotation-approvals";
import { listApprovalPermissions as listGoogleSheetApprovalPermissions } from "@/lib/approvals/approval-permission-store";
import { canUserApproveQuotation } from "@/lib/approvals/approval-utils";
import type { ApprovedUser } from "@/lib/auth/types";
import type { AgentId } from "@/lib/types";

export type ApprovalPermissionSource = "google-sheet";

export async function listApprovalPermissions(): Promise<{ source: ApprovalPermissionSource; rows: ApprovalPermission[] }> {
  return { source: "google-sheet", rows: await listGoogleSheetApprovalPermissions() };
}

export async function evaluateQuotationApprovalPermission(user: ApprovedUser, agentId: AgentId, approval: QuotationApprovalItem) {
  const { rows } = await listApprovalPermissions();
  return canUserApproveQuotation(user, agentId, approval, rows);
}
