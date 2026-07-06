import type { ApprovalPermission } from "@/data/approval-permissions";
import type { QuotationApprovalItem, QuotationApprovalScope } from "@/data/quotation-approvals";
import type { ApprovedUser } from "@/lib/auth/types";
import type { AgentId } from "@/lib/types";

export function hasFullApprovalAccess(user: Pick<ApprovedUser, "email" | "role">) {
  return user.role === "Super Admin" || user.email.trim().toLowerCase() === "chod.mopteam@gmail.com";
}

export function getApprovalPermission(agentId: AgentId, permissions: ApprovalPermission[]) {
  return permissions.find((permission) => permission.userId === agentId);
}

export function canApproveQuotation(
  agentId: AgentId,
  approval: QuotationApprovalItem,
  permissions: ApprovalPermission[],
) {
  const permission = getApprovalPermission(agentId, permissions);
  if (!permission?.enabled || !permission.canApproveQuotation) {
    return { allowed: false, needsFinal: false, reason: "You do not have permission to approve this quotation." };
  }

  const equivalentScopes: QuotationApprovalScope[] = approval.quotationType === "restoration"
    ? ["restoration", "renovation"]
    : [approval.quotationType];
  const scopeAllowed = permission.approvalScopes.includes("all")
    || equivalentScopes.some((scope) => permission.approvalScopes.includes(scope));
  if (!scopeAllowed) {
    return { allowed: false, needsFinal: false, reason: "You do not have permission to approve this quotation type." };
  }

  if (permission.maxApprovalAmount !== null && approval.amount > permission.maxApprovalAmount) {
    return { allowed: false, needsFinal: true, reason: "Approval amount exceeds your limit. Tammasit final approval is required." };
  }

  return { allowed: true, needsFinal: permission.requiresTammasitFinalApproval && agentId !== "tammasit", reason: "" };
}

export function canUserApproveQuotation(
  user: Pick<ApprovedUser, "email" | "role">,
  agentId: AgentId,
  approval: QuotationApprovalItem,
  permissions: ApprovalPermission[],
) {
  if (hasFullApprovalAccess(user)) {
    return { allowed: true, needsFinal: false, reason: "" };
  }
  return canApproveQuotation(agentId, approval, permissions);
}
