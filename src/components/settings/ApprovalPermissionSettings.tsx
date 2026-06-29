"use client";

import { useState } from "react";
import type { ApprovalPermission } from "@/data/approval-permissions";
import type { QuotationApprovalScope } from "@/data/quotation-approvals";

const scopes: QuotationApprovalScope[] = ["all", "fit-out", "electrical", "solar", "renovation", "maintenance", "general"];

export function ApprovalPermissionSettings({
  initialPermissions,
  storageError,
}: {
  initialPermissions: ApprovalPermission[];
  storageError?: string;
}) {
  const [permissions, setPermissions] = useState<ApprovalPermission[]>(initialPermissions);
  const [notice, setNotice] = useState(storageError || "");
  const [saving, setSaving] = useState(false);

  function patch(userId: string, update: Partial<ApprovalPermission>) {
    setPermissions((current) => current.map((item) => item.userId === userId ? { ...item, ...update } : item));
  }

  function toggleScope(permission: ApprovalPermission, scope: QuotationApprovalScope) {
    const nextScopes = permission.approvalScopes.includes(scope)
      ? permission.approvalScopes.filter((item) => item !== scope)
      : [...permission.approvalScopes, scope];
    patch(permission.userId, { approvalScopes: nextScopes });
  }

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/approval-permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      const payload = (await response.json()) as { permissions?: ApprovalPermission[]; error?: string };
      if (!response.ok || !payload.permissions) {
        throw new Error(payload.error || "Unable to save approval permissions.");
      }
      setPermissions(payload.permissions);
      setNotice("Approval permissions saved to Google Sheet.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save approval permissions.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="settings-panel">
      <div className="workspace-section-title">
        <div><span>LIVE SETTINGS</span><h2>Approval Permission</h2></div>
        <small>Configure who can approve quotation requests. Saved to the ApprovalPermissions tab in the team Google Sheet.</small>
      </div>
      {notice ? <div className="admin-notice">{notice}</div> : null}
      <div className="approval-permission-grid">
        {permissions.map((permission) => (
          <article key={permission.userId} className="approval-permission-card">
            <header><strong>{permission.name}</strong><span>{permission.role}</span></header>
            <label><input type="checkbox" checked={permission.canApproveQuotation} onChange={(event) => patch(permission.userId, { canApproveQuotation: event.target.checked })} /> Can approve quotation</label>
            <label><input type="checkbox" checked={permission.requiresTammasitFinalApproval} onChange={(event) => patch(permission.userId, { requiresTammasitFinalApproval: event.target.checked })} /> Requires Tammasit final approval</label>
            <label><input type="checkbox" checked={permission.enabled} onChange={(event) => patch(permission.userId, { enabled: event.target.checked })} /> Enabled</label>
            <label>Max amount<input type="number" value={permission.maxApprovalAmount ?? ""} placeholder="No limit" onChange={(event) => patch(permission.userId, { maxApprovalAmount: event.target.value ? Number(event.target.value) : null })} /></label>
            <div className="scope-list">
              {scopes.map((scope) => <button className={permission.approvalScopes.includes(scope) ? "active" : ""} key={scope} onClick={() => toggleScope(permission, scope)} type="button">{scope}</button>)}
            </div>
          </article>
        ))}
      </div>
      {!permissions.length ? <p className="admin-notice">No approval permission rows found.</p> : null}
      <button className="admin-primary settings-save" disabled={saving || !permissions.length} onClick={save} type="button">
        {saving ? "Saving..." : "Save approval permissions"}
      </button>
    </section>
  );
}
