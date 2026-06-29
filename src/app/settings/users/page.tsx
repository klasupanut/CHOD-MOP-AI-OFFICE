import { redirect } from "next/navigation";
import type { ApprovalPermission } from "@/data/approval-permissions";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";
import { listApprovalPermissions } from "@/lib/approvals/approval-permission-store";
import { ensureSheetHeaders, getSuperAdminEmail, listApprovedUsers } from "@/lib/auth/google-sheets-store";
import { requireModule } from "@/lib/auth/session";
import { getSettingsDataConnectors } from "@/lib/settings/data-connectors";
import { getSettingsRuntimeStatus } from "@/lib/settings/runtime-status";

function describeUserStoreError(error: unknown) {
  const message = error instanceof Error ? error.message : "Google Sheets user store is unavailable.";
  if (message === "fetch failed" || message.toLowerCase().includes("fetch failed")) {
    return "Google Sheets user store connection failed. Check internet / Google API access, then refresh this page.";
  }
  if (/DECODER routines|unsupported|PEM|private key/i.test(message)) {
    return "Google service account private key is invalid. Re-copy GOOGLE_PRIVATE_KEY in Vercel with the full BEGIN/END PRIVATE KEY value.";
  }
  return message;
}

export default async function UsersAndPermissionsPage() {
  const user = await requireModule("Settings");
  if (!["Admin", "Super Admin"].includes(user.role)) redirect("/access-denied");

  let users = [user];
  let storageError = "";
  let approvalPermissionError = "";
  let approvalPermissions: ApprovalPermission[] = [];
  try {
    await ensureSheetHeaders();
    users = await listApprovedUsers();
  } catch (error) {
    storageError = describeUserStoreError(error);
  }
  try {
    approvalPermissions = await listApprovalPermissions();
  } catch (error) {
    approvalPermissionError = describeUserStoreError(error);
  }
  const dataConnectors = await getSettingsDataConnectors({
    userStoreError: storageError,
    approvalPermissionError,
  });
  const runtimeStatus = getSettingsRuntimeStatus(dataConnectors);

  return (
    <main className="hq-shell admin-shell">
      <Sidebar user={user} />
      <section className="admin-main">
        <header className="admin-heading"><span>SETTINGS</span><h1>Users &amp; Permissions</h1><p>Approve team access and control module-level and quotation permissions.</p></header>
        <SettingsWorkspace
          initialUsers={users}
          actorRole={user.role}
          storageError={storageError}
          initialApprovalPermissions={approvalPermissions}
          approvalPermissionError={approvalPermissionError}
          protectedSuperAdminEmail={getSuperAdminEmail()}
          dataConnectors={dataConnectors}
          generalStatus={runtimeStatus.general}
          systemStatus={runtimeStatus.system}
        />
      </section>
    </main>
  );
}
