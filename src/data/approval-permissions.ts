import type { QuotationApprovalScope } from "./quotation-approvals";

export type ApprovalPermission = {
  userId: string;
  name: string;
  role: string;
  canApproveQuotation: boolean;
  approvalScopes: QuotationApprovalScope[];
  maxApprovalAmount: number | null;
  requiresTammasitFinalApproval: boolean;
  enabled: boolean;
};

export const defaultApprovalPermissions: ApprovalPermission[] = [
  {
    userId: "tammasit",
    name: "Tammasit",
    role: "Director of Operations",
    canApproveQuotation: true,
    approvalScopes: ["all"],
    maxApprovalAmount: null,
    requiresTammasitFinalApproval: false,
    enabled: true,
  },
  {
    userId: "kla",
    name: "Kla",
    role: "Civil Engineer / Moderator",
    canApproveQuotation: true,
    approvalScopes: ["fit-out", "restoration", "renovation"],
    maxApprovalAmount: 500000,
    requiresTammasitFinalApproval: true,
    enabled: true,
  },
  {
    userId: "film",
    name: "Film",
    role: "Engineer / Data Center",
    canApproveQuotation: false,
    approvalScopes: [],
    maxApprovalAmount: 0,
    requiresTammasitFinalApproval: true,
    enabled: true,
  },
  {
    userId: "moss",
    name: "Moss",
    role: "Electrical Engineer",
    canApproveQuotation: true,
    approvalScopes: ["electrical", "solar"],
    maxApprovalAmount: 500000,
    requiresTammasitFinalApproval: true,
    enabled: true,
  },
  {
    userId: "foreman",
    name: "Foreman",
    role: "Maintenance Lead",
    canApproveQuotation: false,
    approvalScopes: [],
    maxApprovalAmount: 0,
    requiresTammasitFinalApproval: true,
    enabled: true,
  },
];
