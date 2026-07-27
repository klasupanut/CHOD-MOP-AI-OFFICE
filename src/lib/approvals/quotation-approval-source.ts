import "server-only";

import type { QuotationApprovalItem, QuotationApprovalStatus } from "@/data/quotation-approvals";
import {
  enrichQuotationExtraFields,
  listQuotationsFromGoogleSheet,
  updateQuotationSheetInternalApproval,
} from "@/lib/quotations/google-sheet-extra-fields";
import { callQuotationAppsScript } from "@/lib/quotations/apps-script-backend";

type QuotationBackendRow = {
  quotationId?: string;
  quotationNo?: string;
  projectType?: string;
  quotationType?: string;
  date?: string;
  client?: string;
  to?: string;
  subject?: string;
  projectSite?: string;
  preparedBy?: string;
  status?: string;
  approvalStatus?: string;
  approvalAt?: string;
  approvalBy?: string;
  approvalNote?: string;
  approvalUpdatedAt?: string;
  signingStatus?: string;
  signedAt?: string;
  signedByName?: string;
  pdfUrl?: string;
  signingUrl?: string;
  grandTotal?: number;
  totalAmount?: number;
  totalAfterDiscount?: number;
  projectMarkupPercent?: number;
  totalContractorCost?: number;
  totalSellingAmount?: number;
  averageMarkupPercent?: number;
  updatedAt?: string;
  createdAt?: string;
  items?: Array<{
    description?: string;
    quantity?: number;
    unit?: string;
    contractorUnitCost?: number;
    contractorTotalCost?: number;
    markupPercent?: number;
    quotationUnitPrice?: number;
    quotationTotal?: number;
    projectSellingTotal?: number;
    sellingUnitPrice?: number;
    sellingTotal?: number;
    itemType?: string;
  }>;
};

type QuotationBackendResponse = {
  ok: boolean;
  data?: QuotationBackendRow[];
  error?: string;
};

export type ApprovalQuotationLineItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  contractorUnitCost?: number;
  contractorTotalCost?: number;
  markupPercent?: number;
};

export type QuotationApprovalWithItems = QuotationApprovalItem & {
  // Retained while legacy rows are removed from source; the live loader no
  // longer returns this branch when Apps Script is unavailable.
  source: "quotation-backend" | "quotation-fallback";
  quotationItems?: ApprovalQuotationLineItem[];
  clientSigningStatus?: string;
  clientSignedAt?: string;
  clientSignedByName?: string;
  internalApprovalStatus?: string;
  totalContractorCost?: number;
  totalSellingAmount: number;
  averageMarkupPercent?: number;
};

function normalizeApprovalStatus(value?: string): QuotationApprovalStatus | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "rejected") return "Rejected";
  if (normalized === "approved") return "Approved";
  if (normalized === "cancelled" || normalized === "canceled") return "Cancelled";
  if (normalized === "waiting final approval") return "Waiting Final Approval";
  if (normalized === "draft" || normalized === "sent" || normalized === "submitted" || normalized === "pending approval") {
    return "Waiting Approval";
  }
  return null;
}

function approvalStatusFromQuotation(row: QuotationBackendRow): QuotationApprovalStatus {
  // Cancellation is the final active-workflow state even when an older
  // approval_status cell still contains Approved for audit history.
  const baseStatus = normalizeApprovalStatus(row.status);
  if (baseStatus === "Cancelled") return "Cancelled";

  const explicitApproval = normalizeApprovalStatus(row.approvalStatus);
  if (explicitApproval) return explicitApproval;

  const signingStatus = String(row.signingStatus || "").trim().toLowerCase();

  // Customer signing is client acceptance. It must not be treated as Tammasit's approval.
  // Legacy signed rows may have status=Approved only because the old signing flow wrote it.
  if ((signingStatus === "signed" || signingStatus === "internal_verified") && String(row.status || "").trim().toLowerCase() === "approved") {
    return "Waiting Approval";
  }

  if (baseStatus) return baseStatus;
  return "Waiting Approval";
}

function quotationStatusFromApproval(status: QuotationApprovalStatus) {
  if (status === "Approved") return "Approved";
  if (status === "Rejected" || status === "Revision Required") return "Rejected";
  if (status === "Waiting Final Approval") return "Waiting Final Approval";
  if (status === "Cancelled") return "Cancelled";
  return "Draft";
}

function quotationTypeFromRow(row: QuotationBackendRow) {
  const explicitType = String(row.projectType || row.quotationType || "").trim().toLowerCase();
  if (explicitType.includes("restoration") || explicitType.includes("restore")) return "restoration" as const;
  if (explicitType.includes("fit")) return "fit-out" as const;
  if (explicitType.includes("electrical")) return "electrical" as const;
  if (explicitType.includes("solar")) return "solar" as const;
  if (explicitType.includes("renovation")) return "renovation" as const;
  if (explicitType.includes("maintenance") || explicitType === "pm" || explicitType.includes("pm loop")) return "maintenance" as const;

  const quotationNo = String(row.quotationNo || "").trim().toLowerCase();
  if (quotationNo.includes("-rn-")) return "restoration" as const;
  if (quotationNo.includes("-fo-")) return "fit-out" as const;

  const normalized = String(row.subject || "").toLowerCase();
  if (normalized.includes("restoration") || normalized.includes("restore")) return "restoration" as const;
  if (normalized.includes("electrical")) return "electrical" as const;
  if (normalized.includes("solar")) return "solar" as const;
  if (normalized.includes("renovation")) return "renovation" as const;
  if (normalized.includes("maintenance") || normalized.includes("pm")) return "maintenance" as const;
  return "fit-out" as const;
}

function amountFromQuotation(row: QuotationBackendRow) {
  return Number(row.grandTotal || row.totalAfterDiscount || row.totalAmount || 0);
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function mapItems(row: QuotationBackendRow): ApprovalQuotationLineItem[] {
  return (row.items || [])
    .filter((item) => item.itemType !== "title" && String(item.description || "").trim())
    .map((item) => {
      const quantity = Number(item.quantity || 0);
      const contractorUnitCost = optionalNumber(item.contractorUnitCost);
      const contractorTotalCost = optionalNumber(item.contractorTotalCost)
        ?? (contractorUnitCost !== undefined ? quantity * contractorUnitCost : undefined);
      const total = optionalNumber(item.quotationTotal)
        ?? optionalNumber(item.projectSellingTotal)
        ?? optionalNumber(item.sellingTotal)
        ?? 0;
      const unitPrice = optionalNumber(item.quotationUnitPrice)
        ?? (quantity > 0 ? total / quantity : optionalNumber(item.sellingUnitPrice))
        ?? 0;
      const markupPercent = optionalNumber(item.markupPercent)
        ?? (contractorTotalCost !== undefined && contractorTotalCost > 0
          ? ((total - contractorTotalCost) / contractorTotalCost) * 100
          : undefined);

      return {
        description: String(item.description || "Quotation item"),
        quantity,
        unit: String(item.unit || ""),
        unitPrice,
        total,
        contractorUnitCost,
        contractorTotalCost,
        markupPercent,
      };
    });
}

function pricingFromQuotation(row: QuotationBackendRow) {
  const itemCosts = (row.items || [])
    .filter((item) => item.itemType !== "title")
    .map((item) => optionalNumber(item.contractorTotalCost)
      ?? (optionalNumber(item.contractorUnitCost) !== undefined
        ? Number(item.quantity || 0) * Number(item.contractorUnitCost)
        : undefined))
    .filter((value): value is number => value !== undefined);
  const totalContractorCost = optionalNumber(row.totalContractorCost)
    ?? (itemCosts.length ? itemCosts.reduce((total, value) => total + value, 0) : undefined);
  const totalSellingAmount = optionalNumber(row.totalSellingAmount)
    ?? optionalNumber(row.totalAfterDiscount)
    ?? optionalNumber(row.totalAmount)
    ?? 0;
  const averageMarkupPercent = optionalNumber(row.averageMarkupPercent)
    ?? (totalContractorCost !== undefined && totalContractorCost > 0
      ? ((totalSellingAmount - totalContractorCost) / totalContractorCost) * 100
      : undefined);

  return { totalContractorCost, totalSellingAmount, averageMarkupPercent };
}

function mapQuotationToApproval(row: QuotationBackendRow): QuotationApprovalWithItems {
  const quotationId = String(row.quotationId || row.quotationNo || crypto.randomUUID());
  const quotationNo = String(row.quotationNo || quotationId);
  const subject = String(row.subject || "Quotation request");
  const amount = amountFromQuotation(row);
  const updatedAt = String(row.updatedAt || row.createdAt || new Date().toISOString());
  const pdfUrl = String(row.pdfUrl || "");
  const pricing = pricingFromQuotation(row);

  return {
    approvalId: `APR-${quotationId}`,
    quotationId,
    quotationNo,
    quotationType: quotationTypeFromRow(row),
    projectId: quotationId,
    projectName: subject,
    site: String(row.projectSite || "-"),
    customerName: String(row.client || row.to || "-"),
    requestedBy: String(row.preparedBy || "Auto Quotation"),
    requestedAt: String(row.date || updatedAt.slice(0, 10)),
    approver: "Tammasit",
    amount,
    currency: "THB",
    status: approvalStatusFromQuotation(row),
    priority: row.status?.toLowerCase() === "rejected" ? "High" : "Medium",
    dueDate: String(row.date || updatedAt.slice(0, 10)),
    remark: `Internal approval: ${row.approvalStatus || row.status || "Waiting Approval"} | Customer signing: ${row.signingStatus === "INTERNAL_VERIFIED" ? "Internal verified hard copy" : row.signingStatus || "Not sent/signed"}`,
    quotationPdfUrl: pdfUrl,
    // Workspace members must preview through CHOD's authenticated route.
    // A Google Drive URL has a separate ACL and would incorrectly ask an
    // already-approved CHOD user to request Drive access again.
    quotationPreviewUrl: `/approvals/APR-${quotationId}/preview`,
    validity: "From quotation record",
    paymentTerms: "From quotation record",
    lastUpdate: updatedAt.replace("T", " ").slice(0, 16),
    source: "quotation-backend",
    quotationItems: mapItems(row),
    clientSigningStatus: row.signingStatus || "",
    clientSignedAt: row.signedAt || "",
    clientSignedByName: row.signedByName || "",
    internalApprovalStatus: row.approvalStatus || row.status || "",
    ...pricing,
  };
}

function normalizedQuotationIdentity(row: QuotationBackendRow) {
  const quotationNo = String(row.quotationNo || "").trim().toUpperCase();
  if (quotationNo) return `quotation-no:${quotationNo}`;

  const quotationId = String(row.quotationId || "").trim();
  if (quotationId) return `quotation-id:${quotationId}`;

  return "";
}

function quotationRowUpdatedAt(row: QuotationBackendRow) {
  const value = String(row.approvalUpdatedAt || row.updatedAt || row.createdAt || "").trim();
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function quotationRowCompleteness(row: QuotationBackendRow) {
  return [
    row.approvalStatus,
    row.signingStatus,
    row.pdfUrl,
    row.signingUrl,
    row.client,
    row.subject,
    row.projectSite,
    row.items?.length,
  ].filter(Boolean).length;
}

/**
 * The quotation backend can temporarily return the same quotation more than
 * once while a sheet update is being propagated. Keep only the newest,
 * most-complete version for display. This is read-only: it never edits the
 * source sheet or changes a quotation status.
 */
function uniqueQuotationRows(rows: QuotationBackendRow[]) {
  const unique = new Map<string, QuotationBackendRow>();
  let duplicateCount = 0;

  for (const row of rows) {
    const identity = normalizedQuotationIdentity(row);
    if (!identity) {
      unique.set(`unidentified:${unique.size}`, row);
      continue;
    }

    const existing = unique.get(identity);
    if (!existing) {
      unique.set(identity, row);
      continue;
    }

    duplicateCount += 1;
    const existingUpdatedAt = quotationRowUpdatedAt(existing);
    const candidateUpdatedAt = quotationRowUpdatedAt(row);
    const shouldReplace = candidateUpdatedAt > existingUpdatedAt
      || (candidateUpdatedAt === existingUpdatedAt && quotationRowCompleteness(row) > quotationRowCompleteness(existing));

    if (shouldReplace) unique.set(identity, row);
  }

  if (duplicateCount) {
    console.warn(`[approvals] Removed ${duplicateCount} duplicate quotation row(s) from the display payload.`);
  }

  return [...unique.values()];
}

export const fallbackRealQuotationApprovals: QuotationApprovalWithItems[] = [
  mapQuotationToApproval({
    quotationId: "QUO-mqte3t7d-1hsobp",
    quotationNo: "CHOD-FO-26-003",
    date: "2026-06-25",
    client: "",
    to: "Customer",
    subject: "งานติดตั้งหม้อแปลงพร้อมตู้ MDB คลังสินค้าโชติธนวัฒน์ 5",
    projectSite: "CHOD 5",
    preparedBy: "ยุศกล บุญวิเศษ",
    status: "Draft",
    grandTotal: 1324125,
    totalAfterDiscount: 1237500,
    totalAmount: 1237500,
    createdAt: "2026-06-25T10:59:22.393Z",
    updatedAt: "2026-06-27T00:00:00.000Z",
    items: [
      { description: "งานติดตั้งหม้อแปลงไฟฟ้า ชนิดน้ำมัน ขนาด 250 kVA พร้อมสายส่งแรงสูง", quantity: 1, unit: "JOB", quotationUnitPrice: 618750, quotationTotal: 618750, itemType: "item" },
      { description: "ค่าดําเนินการเขียนแบบ-เซ็นต์รับรองแบบยื่นแบบขอไฟฟ้ากับ กฟภ.", quantity: 1, unit: "JOB", quotationUnitPrice: 68750, quotationTotal: 68750, itemType: "item" },
      { description: "MDB Panel 400A + Surge Protection พร้อมสายแรงต่ำจากหม้อแปลงถึงตู้", quantity: 1, unit: "JOB", quotationUnitPrice: 481250, quotationTotal: 481250, itemType: "item" },
      { description: "Labour For Installation HV&LV", quantity: 1, unit: "JOB", quotationUnitPrice: 68750, quotationTotal: 68750, itemType: "item" },
    ],
  }),
  mapQuotationToApproval({
    quotationId: "QUO-mqne6a7h-6hn9d4",
    quotationNo: "CHOD-FO-26-002",
    date: "2026-06-19",
    client: "Crown Equipment (Thailand) Co., Ltd.",
    to: "MR. ROD",
    subject: "Quotation for door closer installation",
    projectSite: "CHOD 2",
    preparedBy: "ศุภณัฐ นิลคุปต์",
    status: "Sent",
    grandTotal: 5885,
    createdAt: "2026-06-21T06:14:40.685Z",
    updatedAt: "2026-06-22T11:47:22.363Z",
    items: [
      { description: "Installation of YALE VC 7722 SB (non-hold)", quantity: 4, unit: "Ea.", quotationUnitPrice: 1250, quotationTotal: 5000, itemType: "item" },
    ],
  }),
  mapQuotationToApproval({
    quotationId: "QUO-mqnii20q-ku6qty",
    quotationNo: "CHOD-FO-26-001",
    date: "2026-04-17",
    client: "Crown Equipment (Thailand) Co., Ltd.",
    to: "Crown Equipment (Thailand) Co., Ltd.",
    subject: "Quotation for window tinting installation – Building F7–F8",
    projectSite: "CHOD 2",
    preparedBy: "ศุภณัฐ นิลคุปต์",
    status: "Rejected",
    grandTotal: 104165.09,
    createdAt: "2026-06-21T08:15:48.410Z",
    updatedAt: "2026-06-21T12:12:57.991Z",
  }),
].map((item) => ({ ...item, source: "quotation-fallback" }));

export async function listQuotationApprovalsFromBackend(): Promise<QuotationApprovalWithItems[]> {
  let sheetError: unknown = null;
  try {
    const sheetRows = await listQuotationsFromGoogleSheet();
    return uniqueQuotationRows(sheetRows).map(mapQuotationToApproval);
  } catch (error) {
    sheetError = error;
    console.warn("[approvals] Direct quotation Google Sheet read failed; trying Apps Script fallback.", error);
  }

  const backendUrl = process.env.QUOTATION_APPS_SCRIPT_URL?.trim();
  if (!backendUrl) {
    throw sheetError instanceof Error
      ? sheetError
      : new Error("Quotation data sources are not configured.");
  }

  try {
    const { response, result } = await callQuotationAppsScript("listQuotations", {});
    if (!response.ok || !result.ok || !Array.isArray(result.data)) {
      throw new Error(result.error || `Auto Quotation backend returned HTTP ${response.status}.`);
    }
    // The Apps Script payload is the quotation source, while the dedicated
    // approval columns in the Google Sheet are the latest internal decision.
    // Enrich before mapping so an approved/rejected decision immediately
    // survives a page refresh and cannot stay in the pending visual state.
    const enrichedRows = await enrichQuotationExtraFields(result.data);
    return uniqueQuotationRows(enrichedRows).map(mapQuotationToApproval);
  } catch (error) {
    console.warn("[approvals] Unable to load live quotation approval rows.", error);
    throw new AggregateError(
      [sheetError, error].filter(Boolean),
      "Unable to load quotation approvals from Google Sheet or Apps Script.",
    );
  }
}

export async function syncQuotationStatusToBackend(
  approval: QuotationApprovalWithItems,
  status: QuotationApprovalStatus,
  approver: string,
  note?: string,
) {
  const updatedAt = new Date().toISOString();
  const updateResult = await updateQuotationSheetInternalApproval({
    quotationId: approval.quotationId,
    quotationNo: approval.quotationNo,
    status: quotationStatusFromApproval(status),
    approver,
    note,
    updatedAt,
  });

  if (!updateResult.ok) {
    return {
      ok: false,
      mode: "quotation-sheet-internal-approval" as const,
      error: updateResult.error || `Unable to update quotation status.`,
    };
  }

  return { ok: true, mode: "quotation-sheet-internal-approval" as const, skipped: updateResult.skipped };
}
