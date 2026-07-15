import type { QuotationApprovalItem, QuotationApprovalStatus } from "@/data/quotation-approvals";
import { listQuotationApprovalsFromBackend, type QuotationApprovalWithItems } from "@/lib/approvals/quotation-approval-source";

const globalStore = globalThis as typeof globalThis & {
  chodApprovalRows?: QuotationApprovalWithItems[];
  chodApprovalStoreVersion?: string;
  chodApprovalRowsLoadedAt?: number;
  chodApprovalRowsPromise?: Promise<QuotationApprovalWithItems[]>;
};

const APPROVAL_STORE_VERSION = "2026-06-27-internal-approval-vs-client-signing";
const APPROVAL_STORE_TTL_MS = 30_000;

async function rows() {
  const stale = !globalStore.chodApprovalRowsLoadedAt || Date.now() - globalStore.chodApprovalRowsLoadedAt > APPROVAL_STORE_TTL_MS;
  if (globalStore.chodApprovalRows && globalStore.chodApprovalStoreVersion === APPROVAL_STORE_VERSION && !stale) {
    return globalStore.chodApprovalRows;
  }
  if (globalStore.chodApprovalRowsPromise) return globalStore.chodApprovalRowsPromise;

  globalStore.chodApprovalRowsPromise = listQuotationApprovalsFromBackend()
    .then((approvalRows) => {
      globalStore.chodApprovalRows = approvalRows;
      globalStore.chodApprovalStoreVersion = APPROVAL_STORE_VERSION;
      globalStore.chodApprovalRowsLoadedAt = Date.now();
      return approvalRows;
    })
    .catch((error) => {
      if (globalStore.chodApprovalRows && globalStore.chodApprovalStoreVersion === APPROVAL_STORE_VERSION) {
        globalStore.chodApprovalRowsLoadedAt = Date.now();
        return globalStore.chodApprovalRows;
      }
      console.warn("[approvals] Quotation approval backend unavailable; showing empty live approval list.", error);
      globalStore.chodApprovalRows = [];
      globalStore.chodApprovalStoreVersion = APPROVAL_STORE_VERSION;
      globalStore.chodApprovalRowsLoadedAt = Date.now();
      return globalStore.chodApprovalRows;
    })
    .finally(() => {
      globalStore.chodApprovalRowsPromise = undefined;
    });

  return globalStore.chodApprovalRowsPromise;
}

export async function listApprovalRows() {
  return (await rows()).map((item) => ({ ...item }));
}

export function invalidateApprovalRows() {
  globalStore.chodApprovalRowsLoadedAt = 0;
}

export async function findApprovalRow(approvalId: string) {
  return (await rows()).find((item) => item.approvalId === approvalId) || null;
}

export async function updateApprovalStatus(approvalId: string, status: QuotationApprovalStatus, approver: string, note?: string) {
  const approvalRows = await rows();
  const index = approvalRows.findIndex((item) => item.approvalId === approvalId);
  if (index < 0) return null;

  const lastUpdate = new Date().toISOString().slice(0, 16).replace("T", " ");
  approvalRows[index] = {
    ...approvalRows[index],
    status,
    approver,
    lastUpdate,
    remark: note ? `${approvalRows[index].remark} | ${note}` : approvalRows[index].remark,
  };
  globalStore.chodApprovalRowsLoadedAt = Date.now();
  return { ...approvalRows[index] };
}
