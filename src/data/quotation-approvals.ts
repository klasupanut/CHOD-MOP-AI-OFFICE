export type QuotationApprovalStatus =
  | "Waiting Approval"
  | "Waiting Final Approval"
  | "Approved"
  | "Rejected"
  | "Revision Required"
  | "Cancelled";

export type QuotationApprovalPriority = "Low" | "Medium" | "High" | "Critical";
export type QuotationApprovalScope = "all" | "fit-out" | "electrical" | "solar" | "renovation" | "maintenance" | "general";

export type QuotationApprovalItem = {
  approvalId: string;
  quotationId: string;
  quotationNo: string;
  quotationType: Exclude<QuotationApprovalScope, "all">;
  projectId: string;
  projectName: string;
  site: string;
  customerName: string;
  requestedBy: string;
  requestedAt: string;
  approver: string;
  amount: number;
  currency: "THB";
  status: QuotationApprovalStatus;
  priority: QuotationApprovalPriority;
  dueDate: string;
  remark: string;
  quotationPdfUrl: string;
  quotationPreviewUrl: string;
  validity: string;
  paymentTerms: string;
  lastUpdate: string;
};

export const mockQuotationApprovals: QuotationApprovalItem[] = [
  {
    approvalId: "APR-Q-001",
    quotationId: "QUO-FIT-B8",
    quotationNo: "CHOD-FO-26-003",
    quotationType: "fit-out",
    projectId: "PRJ-FITOUT-B8",
    projectName: "Fit-out B8",
    site: "CHODBIZ KM.8",
    customerName: "Crown Equipment (Thailand) Co., Ltd.",
    requestedBy: "Film",
    requestedAt: "2026-06-23 15:10",
    approver: "Tammasit",
    amount: 420000,
    currency: "THB",
    status: "Waiting Approval",
    priority: "High",
    dueDate: "2026-06-25",
    remark: "Fit-out quotation needs director approval before sending to client.",
    quotationPdfUrl: "/quotations",
    quotationPreviewUrl: "/approvals/APR-Q-001/preview",
    validity: "30 days",
    paymentTerms: "50% deposit, 50% after handover",
    lastUpdate: "2026-06-23 15:40",
  },
  {
    approvalId: "APR-Q-002",
    quotationId: "QUO-ELEC-011",
    quotationNo: "CHOD-EQ-26-011",
    quotationType: "electrical",
    projectId: "PRJ-SOLAR-03",
    projectName: "Solar Roof CHOD-03 Output Review",
    site: "CHOD 3",
    customerName: "CHOD Internal",
    requestedBy: "Moss",
    requestedAt: "2026-06-23 13:20",
    approver: "Moss",
    amount: 285000,
    currency: "THB",
    status: "Waiting Approval",
    priority: "Medium",
    dueDate: "2026-06-26",
    remark: "Electrical quotation for system upgrade scope.",
    quotationPdfUrl: "/quotations",
    quotationPreviewUrl: "/approvals/APR-Q-002/preview",
    validity: "15 days",
    paymentTerms: "Credit 30 days",
    lastUpdate: "2026-06-23 13:50",
  },
  {
    approvalId: "APR-Q-003",
    quotationId: "QUO-MAINT-007",
    quotationNo: "CHOD-MT-26-007",
    quotationType: "maintenance",
    projectId: "PRJ-PM-F7",
    projectName: "PM Loop F7 Critical Round",
    site: "CHOD 5",
    customerName: "CHOD Internal",
    requestedBy: "Foreman",
    requestedAt: "2026-06-22 16:30",
    approver: "Tammasit",
    amount: 85000,
    currency: "THB",
    status: "Revision Required",
    priority: "Critical",
    dueDate: "2026-06-24",
    remark: "Need contractor SLA detail before approval.",
    quotationPdfUrl: "/quotations",
    quotationPreviewUrl: "/approvals/APR-Q-003/preview",
    validity: "7 days",
    paymentTerms: "After work completion",
    lastUpdate: "2026-06-23 14:10",
  },
  {
    approvalId: "APR-Q-004",
    quotationId: "QUO-REN-002",
    quotationNo: "CHOD-RN-26-002",
    quotationType: "renovation",
    projectId: "PRJ-REN-MAJOR-02",
    projectName: "Major Renovation Drawing Review",
    site: "CHODBIZ SAI 4",
    customerName: "Crown Equipment (Thailand) Co., Ltd.",
    requestedBy: "Kla",
    requestedAt: "2026-06-21 11:15",
    approver: "Tammasit",
    amount: 920000,
    currency: "THB",
    status: "Approved",
    priority: "High",
    dueDate: "2026-06-23",
    remark: "Approved after engineering scope review.",
    quotationPdfUrl: "/quotations",
    quotationPreviewUrl: "/approvals/APR-Q-004/preview",
    validity: "30 days",
    paymentTerms: "40% deposit, 60% progress claim",
    lastUpdate: "2026-06-23 11:55",
  },
];
