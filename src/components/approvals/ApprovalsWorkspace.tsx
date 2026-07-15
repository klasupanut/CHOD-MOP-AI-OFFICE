"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, MessageSquare, XCircle } from "lucide-react";
import type { ApprovalPermission } from "@/data/approval-permissions";
import type { QuotationApprovalItem, QuotationApprovalStatus } from "@/data/quotation-approvals";
import { canUserApproveQuotation } from "@/lib/approvals/approval-utils";
import type { ApprovedUser } from "@/lib/auth/types";
import { publishApprovalNotificationSnapshot } from "@/lib/notifications/approval-notifications";
import type { AgentId } from "@/lib/types";

const tabs = ["All", "Waiting Approval", "Approved", "Rejected / Revision Required", "High Priority"] as const;

type ApprovalLineItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
};

type ApprovalRowWithItems = QuotationApprovalItem & {
  quotationItems?: ApprovalLineItem[];
  clientSigningStatus?: string;
  clientSignedAt?: string;
  clientSignedByName?: string;
  internalApprovalStatus?: string;
};

function money(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value);
}

function quotationTypeLabel(value: string) {
  if (value === "fit-out") return "Fit-out";
  if (value === "restoration") return "Restoration";
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function userAgentId(user: ApprovedUser): AgentId {
  return (user.characterId || (user.email.toLowerCase() === "chod.mopteam@gmail.com" ? "kla" : "film")) as AgentId;
}

function countPendingApprovals(items: QuotationApprovalItem[]) {
  return items.filter((item) => item.status === "Waiting Approval" || item.status === "Waiting Final Approval").length;
}

function validPdfUrl(url: string) {
  const normalized = url.trim();
  return Boolean(normalized) && normalized !== "/quotations";
}

export function ApprovalsWorkspace({
  currentUser,
  initialApprovals,
  initialApprovalPermissions,
}: {
  currentUser: ApprovedUser;
  initialApprovals: ApprovalRowWithItems[];
  initialApprovalPermissions: ApprovalPermission[];
}) {
  const [approvals, setApprovals] = useState<ApprovalRowWithItems[]>(initialApprovals);
  const [approvalPermissions] = useState<ApprovalPermission[]>(initialApprovalPermissions);
  const [selectedId, setSelectedId] = useState(initialApprovals[0]?.approvalId ?? "");
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [note, setNote] = useState("");
  const [apiMessage, setApiMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const agentId = userAgentId(currentUser);
  const selected = approvals.find((approval) => approval.approvalId === selectedId) ?? approvals[0];
  const permissionState = selected ? canUserApproveQuotation(currentUser, agentId, selected, approvalPermissions) : null;
  const selectedPdfUrl = selected && validPdfUrl(selected.quotationPdfUrl) ? selected.quotationPdfUrl : "";
  const selectedLineItems = selected?.quotationItems?.length
    ? selected.quotationItems
    : selected
      ? [{ description: selected.projectName, quantity: 1, unit: "LS", unitPrice: selected.amount, total: selected.amount }]
      : [];

  const filtered = useMemo(() => approvals.filter((item) => {
    if (tab === "All") return true;
    if (tab === "Rejected / Revision Required") return item.status === "Rejected" || item.status === "Revision Required";
    if (tab === "High Priority") return item.priority === "High" || item.priority === "Critical";
    return item.status === tab;
  }), [approvals, tab]);

  const summary = {
    total: approvals.length,
    waiting: approvals.filter((item) => item.status === "Waiting Approval" || item.status === "Waiting Final Approval").length,
    approved: approvals.filter((item) => item.status === "Approved").length,
    rejected: approvals.filter((item) => item.status === "Rejected" || item.status === "Revision Required").length,
    high: approvals.filter((item) => item.priority === "High" || item.priority === "Critical").length,
    value: approvals.reduce((sum, item) => sum + item.amount, 0),
  };

  useEffect(() => {
    publishApprovalNotificationSnapshot({ pendingCount: countPendingApprovals(approvals) });
  }, [approvals]);

  function selectApproval(item: QuotationApprovalItem) {
    setSelectedId(item.approvalId);
    setApiMessage("");
  }

  async function updateStatus(status: QuotationApprovalStatus, actionNote?: string) {
    if (!selected) return;
    const approvalBeforeUpdate = selected;
    setIsSaving(true);
    setApiMessage("");
    setApprovals((current) => current.map((item) => item.approvalId === approvalBeforeUpdate.approvalId ? {
      ...item,
      status,
      approver: currentUser.name,
      lastUpdate: new Date().toISOString().slice(0, 16).replace("T", " "),
    } : item));
    try {
      const response = await fetch(`/api/approvals/${approvalBeforeUpdate.approvalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: actionNote }),
      });
      const payload = (await response.json()) as {
        approval?: QuotationApprovalItem;
        error?: string;
        mode?: string;
        quotationSync?: "synced" | "skipped-local-only";
      };
      if (!response.ok || !payload.approval) throw new Error(payload.error || "Approval update failed.");

      setApprovals((current) => {
        return current.map((item) => item.approvalId === payload.approval?.approvalId ? { ...item, ...payload.approval } : item);
      });
      setSelectedId(payload.approval.approvalId);
      const syncLabel = payload.quotationSync === "synced" ? " + quotation status synced" : "";
      setApiMessage(`Saved via ${payload.mode || "approval API"}: ${payload.approval.status}${syncLabel}`);
    } catch (error) {
      setApprovals((current) => current.map((item) => item.approvalId === approvalBeforeUpdate.approvalId ? approvalBeforeUpdate : item));
      setApiMessage(error instanceof Error ? error.message : "Approval update failed.");
    } finally {
      setIsSaving(false);
    }
  }

  function approve() {
    if (!permissionState?.allowed || !selected) return;
    void updateStatus(permissionState.needsFinal ? "Waiting Final Approval" : "Approved", "Approval action tested from CHOD MOP OFFICE.");
  }

  return (
    <div className="workspace-page">
      <div className="workspace-hero">
        <div>
          <span>QUOTATION APPROVALS</span>
          <h1>Approvals</h1>
        </div>
      </div>

      <section className="workspace-summary approval-summary">
        <article><strong>{summary.total}</strong><span>Total Quotation Approvals</span></article>
        <article><strong>{summary.waiting}</strong><span>Waiting Approval</span></article>
        <article><strong>{summary.approved}</strong><span>Approved</span></article>
        <article><strong>{summary.rejected}</strong><span>Rejected / Revision</span></article>
        <article><strong>{summary.high}</strong><span>High Priority</span></article>
        <article><strong>{money(summary.value)}</strong><span>Total Quotation Value</span></article>
      </section>

      <div className="task-filter-bar">
        {tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)} type="button">{item}</button>)}
      </div>

      <div className="workspace-grid approvals-workspace-grid">
        <section className="workspace-main-card approvals-list-card">
          <div className="workspace-section-title">
            <div><span>REAL QUOTATION DATA</span><h2>Quotation approval requests</h2></div>
            <small>{filtered.length} live request{filtered.length === 1 ? "" : "s"} from Auto Quotation</small>
          </div>
          <div className="workspace-table-wrap">
            <table className="workspace-table approvals-table">
              <thead>
                <tr><th>Quotation</th><th>Project / Site</th><th>Request</th><th>Amount</th><th>Due / Priority</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isWaitingApproval = item.status === "Waiting Approval" || item.status === "Waiting Final Approval";
                  const isInternallyApproved = item.status === "Approved";
                  return (
                    <tr
                      className={`${isWaitingApproval ? "approval-row-pending" : isInternallyApproved ? "approval-row-approved" : ""} ${selected?.approvalId === item.approvalId ? "is-selected" : ""}`.trim()}
                      key={item.approvalId}
                      onClick={() => selectApproval(item)}
                    >
                      <td><strong className="approval-quotation-no">{item.quotationNo}</strong><small>{quotationTypeLabel(item.quotationType)}</small></td>
                      <td><strong className="approval-project-site">{item.projectName}</strong><small>{item.site}</small></td>
                      <td><strong>{item.requestedBy}</strong><small>{item.requestedAt}</small></td>
                      <td><strong className="approval-amount">{money(item.amount)}</strong></td>
                      <td><strong>{item.dueDate}</strong><small className={`approval-priority priority-${item.priority.toLowerCase()}`}>{item.priority}</small></td>
                      <td><span className={`approval-status ${isWaitingApproval ? "is-pending" : isInternallyApproved ? "is-approved" : "is-closed"}`}>{item.status}</span></td>
                      <td>{isInternallyApproved
                        ? <span className="inline-action approval-action-approved">Approved</span>
                        : <button className={`inline-action ${isWaitingApproval ? "review-pending" : ""}`} onClick={(event) => { event.stopPropagation(); selectApproval(item); }} type="button">Review</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="approvals-mobile-list">
              {filtered.map((item) => {
                const isWaitingApproval = item.status === "Waiting Approval" || item.status === "Waiting Final Approval";
                const isInternallyApproved = item.status === "Approved";
                return (
                  <article
                    className={`${isWaitingApproval ? "approval-mobile-pending" : isInternallyApproved ? "approval-mobile-approved" : ""} ${selected?.approvalId === item.approvalId ? "is-selected" : ""}`.trim()}
                    key={item.approvalId}
                  >
                    <button className="approval-mobile-select" onClick={() => selectApproval(item)} type="button">
                      <span className="approval-mobile-heading">
                        <span><strong>{item.quotationNo}</strong><small>{quotationTypeLabel(item.quotationType)}</small></span>
                        <strong className="approval-amount">{money(item.amount)}</strong>
                      </span>
                      <span className="approval-mobile-project"><strong>{item.projectName}</strong><small>{item.site}</small></span>
                      <span className="approval-mobile-meta">
                        <span><small>Requested by</small><strong>{item.requestedBy}</strong></span>
                        <span><small>Due date</small><strong>{item.dueDate}</strong></span>
                      </span>
                    </button>
                    <footer>
                      <span className={`approval-status ${isWaitingApproval ? "is-pending" : isInternallyApproved ? "is-approved" : "is-closed"}`}>{item.status}</span>
                      <span className={`approval-priority priority-${item.priority.toLowerCase()}`}>{item.priority}</span>
                      {isInternallyApproved
                        ? <span className="inline-action approval-action-approved">Approved</span>
                        : <button className={`inline-action ${isWaitingApproval ? "review-pending" : ""}`} onClick={() => selectApproval(item)} type="button">Review</button>}
                    </footer>
                  </article>
                );
              })}
            </div>
            {!filtered.length ? <p className="empty-workspace">No quotation approval rows found.</p> : null}
          </div>
        </section>

        <aside className="workspace-detail-panel approvals-detail-panel">
          {selected ? (
            <>
              <div className="detail-heading">
                <span>{quotationTypeLabel(selected.quotationType).toUpperCase()} QUOTATION</span>
                <h2>{selected.quotationNo}</h2>
                <p>{selected.remark}</p>
              </div>
              <div className="quotation-preview-card">
                <strong>Online Quotation PDF</strong>
                <span>{selected.customerName}</span>
                <em>{money(selected.amount)}</em>
                <small>{selectedPdfUrl ? `Ready to open: ${selected.quotationNo}` : "PDF has not been generated yet."}</small>
              </div>
              <div className="detail-stack">
                <div className="detail-kpi"><span>Project / Site</span><strong>{selected.projectName} / {selected.site}</strong></div>
                <div className="detail-kpi"><span>Requested by</span><strong>{selected.requestedBy}</strong></div>
                <div className="detail-kpi"><span>Approver</span><strong>{selected.approver}</strong></div>
                <div className="detail-kpi"><span>Validity</span><strong>{selected.validity}</strong></div>
                <div className="detail-kpi"><span>Payment terms</span><strong>{selected.paymentTerms}</strong></div>
              </div>
              <section className="approval-inhouse-table">
                <header>
                  <div>
                    <span>IN-HOUSE QUOTATION DATA</span>
                    <strong>{selectedPdfUrl ? "PDF available, table shown for approval check" : "Unsigned PDF not saved yet — review data table instead"}</strong>
                  </div>
                </header>
                <div className="approval-inhouse-scroll">
                  <table>
                    <thead>
                      <tr><th>Scope / Description</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Total</th></tr>
                    </thead>
                    <tbody>
                      {selectedLineItems.map((item, index) => (
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
                      <tr><td colSpan={4}>Grand Total</td><td>{money(selected.amount)}</td></tr>
                    </tfoot>
                  </table>
                </div>
                <div className="approval-inhouse-meta">
                  <span>Customer: <strong>{selected.customerName}</strong></span>
                  <span>Internal approval: <strong>{selected.status}</strong></span>
                  <span>Customer signing: <strong>{selected.clientSigningStatus || "Not signed"}</strong></span>
                  {selected.clientSignedByName ? <span>Signed by: <strong>{selected.clientSignedByName}</strong></span> : null}
                  <span>Validity: <strong>{selected.validity}</strong></span>
                  <span>Payment: <strong>{selected.paymentTerms}</strong></span>
                </div>
              </section>              {permissionState && !permissionState.allowed ? <p className="approval-denied">{permissionState.reason}</p> : null}
              {permissionState?.allowed && permissionState.needsFinal ? <p className="approval-warning">Review / Recommend Approval only. Tammasit must approve final.</p> : null}
              {apiMessage ? <p className={apiMessage.includes("failed") || apiMessage.includes("Not allowed") || apiMessage.includes("sync failed") ? "approval-denied" : "approval-success"}>{apiMessage}</p> : null}
              <div className="approval-actions">
                <button disabled={!permissionState?.allowed || isSaving} onClick={approve} type="button"><CheckCircle2 size={16} />{isSaving ? "Saving..." : permissionState?.needsFinal ? "Review / Recommend Approval" : "Approve"}</button>
                <button disabled={!permissionState?.allowed || isSaving} onClick={() => void updateStatus("Rejected", "Rejected from CHOD MOP OFFICE approval flow.")} type="button"><XCircle size={16} />Reject</button>
                <button onClick={() => setNote("Note added locally.")} type="button"><MessageSquare size={16} />Add Note</button>
                <Link href={selectedPdfUrl || selected.quotationPreviewUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} />Preview Quotation</Link>
              </div>
              <section className="task-note-box">
                <strong>Approval History</strong>
                <p>{selected.lastUpdate}: {selected.status} by {selected.approver}. {note}</p>
              </section>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
