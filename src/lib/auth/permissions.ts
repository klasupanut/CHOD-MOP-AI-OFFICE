export const roles = [
  "Super Admin",
  "Admin",
  "Management",
  "Quotation Staff",
  "Operations",
  "Viewer",
] as const;

export type Role = (typeof roles)[number];

export const modulePermissions = [
  "Dashboard",
  "Tasks",
  "Projects",
  "Calendar / Schedule",
  "PM Loop",
  "Renovation",
  "Fit-out Project",
  "Solar Projects",
  "Quotations",
  "Documents",
  "Approvals",
  "Reports",
  "Settings",
] as const;

export type ModulePermission = (typeof modulePermissions)[number];

export const quotationPermissions = [
  "quotation.view",
  "quotation.create",
  "quotation.edit",
  "quotation.viewInternalCost",
  "quotation.viewMarkupProfit",
  "quotation.exportPdf",
  "quotation.createSigningLink",
  "quotation.changeStatus",
  "quotation.delete",
  "quotation.manageSignatures",
  "quotation.manageSettings",
] as const;

export type QuotationPermission = (typeof quotationPermissions)[number];

export const roleRank: Record<Role, number> = {
  "Super Admin": 60,
  Admin: 50,
  Management: 40,
  "Quotation Staff": 30,
  Operations: 20,
  Viewer: 10,
};

const allModules = [...modulePermissions];
const allQuotationPermissions = [...quotationPermissions];

export const roleDefaults: Record<
  Role,
  { modules: ModulePermission[]; quotations: QuotationPermission[] }
> = {
  "Super Admin": { modules: allModules, quotations: allQuotationPermissions },
  Admin: { modules: allModules, quotations: allQuotationPermissions },
  Management: {
    modules: allModules.filter((module) => module !== "Settings"),
    quotations: allQuotationPermissions.filter((permission) => permission !== "quotation.manageSettings"),
  },
  "Quotation Staff": {
    modules: ["Dashboard", "Projects", "Calendar / Schedule", "Fit-out Project", "Quotations", "Documents", "Approvals", "Reports"],
    quotations: quotationPermissions.filter(
      (permission) => !["quotation.delete", "quotation.manageSettings"].includes(permission),
    ),
  },
  Operations: {
    modules: ["Dashboard", "Tasks", "Projects", "Calendar / Schedule", "PM Loop", "Renovation", "Fit-out Project", "Solar Projects", "Documents", "Reports"],
    quotations: ["quotation.view"],
  },
  Viewer: {
    modules: ["Dashboard", "Projects", "Calendar / Schedule", "PM Loop", "Renovation", "Fit-out Project", "Solar Projects", "Documents", "Reports"],
    quotations: [],
  },
};

export function isRole(value: string): value is Role {
  return roles.includes(value as Role);
}

export function canManageRole(actorRole: Role, targetRole: Role) {
  if (targetRole === "Super Admin") return actorRole === "Super Admin";
  return roleRank[actorRole] >= roleRank[targetRole];
}

export function canEditApprovalPermissions(role: Role, email: string) {
  return role === "Super Admin" || role === "Admin" || email.trim().toLowerCase() === "chod.mopteam@gmail.com";
}

export function canUseModule(role: Role, module: ModulePermission) {
  return roleDefaults[role].modules.includes(module);
}

export function canUseQuotationPermission(role: Role, permission: QuotationPermission) {
  return roleDefaults[role].quotations.includes(permission);
}
