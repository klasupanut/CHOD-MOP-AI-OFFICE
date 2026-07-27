import Link from "next/link";
import { notFound } from "next/navigation";
import { findApprovalRow } from "@/lib/approvals/approval-store";
import { requireModule } from "@/lib/auth/session";

type PreviewLineItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  contractorUnitCost?: number;
  contractorTotalCost?: number;
  markupPercent?: number;
};

function money(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function percentage(value: number) {
  return `${new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`;
}

export default async function QuotationApprovalPreviewPage({ params }: { params: Promise<{ approvalId: string }> }) {
  const user = await requireModule("Approvals");
  const { approvalId } = await params;
  const approval = await findApprovalRow(approvalId);
  if (!approval) notFound();
  const canViewContractorCost = user.quotationPermissions.includes("quotation.viewInternalCost");
  const canViewMarkup = user.quotationPermissions.includes("quotation.viewMarkupProfit");

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
            <p>
              Secure workspace preview generated from the live quotation record.
              Google Drive remains private and does not require a separate access request.
            </p>
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
          <div className="approval-preview-pricing">
            <article>
              <span>Contractor Price</span>
              <strong>
                {!canViewContractorCost
                  ? "Restricted"
                  : approval.totalContractorCost === undefined
                    ? "Not recorded"
                    : money(approval.totalContractorCost)}
              </strong>
              <small>Net contractor cost</small>
            </article>
            <article>
              <span>CHOD Offered Price</span>
              <strong>{money(approval.totalSellingAmount ?? approval.amount)}</strong>
              <small>Actual selling price, excl. VAT</small>
            </article>
            <article>
              <span>Net Markup</span>
              <strong>
                {!canViewMarkup
                  ? "Restricted"
                  : approval.averageMarkupPercent === undefined
                    ? "Not recorded"
                    : percentage(approval.averageMarkupPercent)}
              </strong>
              <small>(Selling − contractor cost) ÷ contractor cost</small>
            </article>
          </div>
          <div className="approval-preview-table-wrap">
            <table className="quotation-document-table">
              <thead>
                <tr>
                  <th>Scope / Description</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Contractor Total</th>
                  <th>Markup</th>
                  <th>CHOD Unit Price</th>
                  <th>CHOD Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={`${item.description}-${index}`}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit || "-"}</td>
                    <td>
                      {!canViewContractorCost
                        ? "Restricted"
                        : item.contractorTotalCost === undefined
                          ? "—"
                          : money(item.contractorTotalCost)}
                    </td>
                    <td>
                      {!canViewMarkup
                        ? "Restricted"
                        : item.markupPercent === undefined
                          ? "—"
                          : percentage(item.markupPercent)}
                    </td>
                    <td>{money(item.unitPrice)}</td>
                    <td>{money(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={6}>Grand Total (incl. VAT)</td><td>{money(approval.amount)}</td></tr>
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
