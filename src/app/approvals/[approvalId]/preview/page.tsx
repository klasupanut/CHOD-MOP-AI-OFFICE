import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { findApprovalRow } from "@/lib/approvals/approval-store";
import { requireModule } from "@/lib/auth/session";

type PreviewLineItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
};

function money(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value);
}

function configuredAppHost() {
  const raw = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
  try {
    return raw ? new URL(raw).hostname.toLowerCase() : "";
  } catch {
    return "";
  }
}

function validPdfUrl(url: string) {
  const normalized = url.trim();
  if (!normalized || normalized === "/quotations") return false;
  if (normalized.startsWith("/") && !normalized.startsWith("//")) return true;

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    const appHost = configuredAppHost();
    return (
      host === "drive.google.com" ||
      host === "docs.google.com" ||
      host === "script.google.com" ||
      host === "script.googleusercontent.com" ||
      host === "storage.googleapis.com" ||
      host.endsWith(".googleusercontent.com") ||
      Boolean(appHost && host === appHost)
    );
  } catch {
    return false;
  }
}

export default async function QuotationApprovalPreviewPage({ params }: { params: Promise<{ approvalId: string }> }) {
  await requireModule("Approvals");
  const { approvalId } = await params;
  const approval = await findApprovalRow(approvalId);
  if (!approval) notFound();

  if (validPdfUrl(approval.quotationPdfUrl)) {
    redirect(approval.quotationPdfUrl);
  }

  const lineItems: PreviewLineItem[] =
    "quotationItems" in approval && Array.isArray(approval.quotationItems) && approval.quotationItems.length
      ? approval.quotationItems
      : [{ description: approval.projectName, quantity: 1, unit: "LS", unitPrice: approval.amount, total: approval.amount }];

  return (
    <main className="quotation-document-shell">
      <section className="quotation-document approval-full-preview">
        <header>
          <div>
            <span>CHOD MOP OFFICE</span>
            <h1>Preview Quotation</h1>
            <p>Unsigned PDF has not been saved to Google Drive yet. This full-page in-house table shows the important quotation data for approval review.</p>
          </div>
          <strong>{approval.quotationNo}</strong>
        </header>

        <div className="quotation-document-grid">
          <article><span>Customer</span><strong>{approval.customerName}</strong></article>
          <article><span>Project / Site</span><strong>{approval.projectName} / {approval.site}</strong></article>
          <article><span>Quotation Type</span><strong>{approval.quotationType}</strong></article>
          <article><span>Requested By</span><strong>{approval.requestedBy}</strong></article>
          <article><span>Approver</span><strong>{approval.approver}</strong></article>
          <article><span>Status</span><strong>{approval.status}</strong></article>
        </div>

        <section className="approval-preview-data-block">
          <header>
            <span>IN-HOUSE QUOTATION DATA</span>
            <strong>Important approval information</strong>
          </header>
          <div className="approval-preview-table-wrap">
            <table className="quotation-document-table">
              <thead>
                <tr><th>Scope / Description</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Total</th></tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={`${item.description}-${index}`}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit || "-"}</td>
                    <td>{money(item.unitPrice)}</td>
                    <td>{money(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={4}>Grand Total</td><td>{money(approval.amount)}</td></tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="quotation-document-note">
          <strong>Terms / Approval Context</strong>
          <p>Validity: {approval.validity}</p>
          <p>Payment: {approval.paymentTerms}</p>
          <p>Remark: {approval.remark}</p>
          <p>Last Update: {approval.lastUpdate}</p>
        </section>

        <footer>
          <Link href="/approvals">Back to Approvals</Link>
        </footer>
      </section>
    </main>
  );
}
