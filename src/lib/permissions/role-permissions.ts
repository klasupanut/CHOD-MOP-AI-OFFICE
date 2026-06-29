import type { AgentId } from "@/lib/types";
import type { ModulePermission, QuotationPermission, Role } from "@/lib/auth/permissions";

export const chodOperationalRoles = [
  "director",
  "engineer",
  "electrical_engineer",
  "foreman",
  "admin",
] as const;

export type ChodOperationalRole = (typeof chodOperationalRoles)[number];

export const agentRoleMap: Record<AgentId, ChodOperationalRole> = {
  tammasit: "director",
  film: "engineer",
  kla: "engineer",
  moss: "electrical_engineer",
  foreman: "foreman",
};

export const operationalRoleCapabilities: Record<
  ChodOperationalRole,
  {
    summary: string;
    modules: ModulePermission[];
    quotations: QuotationPermission[];
    canEditApprovalPermissions: boolean;
    canFinalApproveQuotation: boolean;
    canUpdateAnyTaskMemo: boolean;
  }
> = {
  director: {
    summary: "Tammasit: view all, assign team, approve all quotations, final approval authority.",
    modules: ["Dashboard", "Tasks", "Projects", "PM Loop", "Renovation", "Fit-out Project", "Solar Projects", "Quotations", "Approvals", "Reports", "Settings"],
    quotations: ["quotation.view", "quotation.create", "quotation.edit", "quotation.viewInternalCost", "quotation.viewMarkupProfit", "quotation.exportPdf", "quotation.createSigningLink", "quotation.changeStatus", "quotation.manageSignatures", "quotation.manageSettings"],
    canEditApprovalPermissions: true,
    canFinalApproveQuotation: true,
    canUpdateAnyTaskMemo: true,
  },
  engineer: {
    summary: "Film/Kla: view all work, create/edit engineering, fit-out, renovation, document, quotation data within allowed scopes.",
    modules: ["Dashboard", "Tasks", "Projects", "PM Loop", "Renovation", "Fit-out Project", "Quotations", "Approvals", "Reports"],
    quotations: ["quotation.view", "quotation.create", "quotation.edit", "quotation.exportPdf", "quotation.createSigningLink"],
    canEditApprovalPermissions: false,
    canFinalApproveQuotation: false,
    canUpdateAnyTaskMemo: true,
  },
  electrical_engineer: {
    summary: "Moss: create/edit solar/electrical data and electrical quotations; approval only if Settings allows.",
    modules: ["Dashboard", "Tasks", "Projects", "Solar Projects", "Fit-out Project", "Quotations", "Approvals", "Reports"],
    quotations: ["quotation.view", "quotation.create", "quotation.edit", "quotation.exportPdf", "quotation.createSigningLink"],
    canEditApprovalPermissions: false,
    canFinalApproveQuotation: false,
    canUpdateAnyTaskMemo: true,
  },
  foreman: {
    summary: "Foreman: site/PM task progress and alerts; no quotation approval by default.",
    modules: ["Dashboard", "Tasks", "Projects", "PM Loop", "Renovation", "Fit-out Project", "Reports"],
    quotations: ["quotation.view"],
    canEditApprovalPermissions: false,
    canFinalApproveQuotation: false,
    canUpdateAnyTaskMemo: true,
  },
  admin: {
    summary: "Admin: operational administrator with settings access, but Tammasit remains final business approver.",
    modules: ["Dashboard", "Tasks", "Projects", "PM Loop", "Renovation", "Fit-out Project", "Solar Projects", "Quotations", "Approvals", "Reports", "Settings"],
    quotations: ["quotation.view", "quotation.create", "quotation.edit", "quotation.viewInternalCost", "quotation.viewMarkupProfit", "quotation.exportPdf", "quotation.createSigningLink", "quotation.changeStatus", "quotation.manageSignatures", "quotation.manageSettings"],
    canEditApprovalPermissions: true,
    canFinalApproveQuotation: false,
    canUpdateAnyTaskMemo: true,
  },
};

export function mapLegacyRoleToOperationalRole(role: Role, agentId?: AgentId | ""): ChodOperationalRole {
  if (role === "Super Admin" || role === "Admin") return "admin";
  if (agentId && agentRoleMap[agentId]) return agentRoleMap[agentId];
  if (role === "Management") return "director";
  if (role === "Quotation Staff") return "engineer";
  if (role === "Operations") return "foreman";
  return "foreman";
}
