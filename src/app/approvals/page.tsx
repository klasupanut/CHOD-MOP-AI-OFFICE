import { ApprovalsWorkspace } from "@/components/approvals/ApprovalsWorkspace";
import { listApprovalPermissions } from "@/lib/approvals/approval-permission-store";
import { listApprovalRows } from "@/lib/approvals/approval-store";
import { requireModule } from "@/lib/auth/session";

export default async function ApprovalsPage() {
  const user = await requireModule("Approvals");
  let approvalLoadError = "";
  const [approvals, approvalPermissions] = await Promise.all([
    listApprovalRows().catch((error) => {
      console.warn("[approvals] Unable to load live approval rows.", error);
      approvalLoadError = "Live quotation data is temporarily unavailable. Retry shortly; no quotation data was changed.";
      return [];
    }),
    listApprovalPermissions().catch((error) => {
      console.warn("[approvals] Unable to load live approval permissions.", error);
      return [];
    }),
  ]);
  return (
    <ApprovalsWorkspace
      currentUser={user}
      initialApprovals={approvals}
      initialApprovalPermissions={approvalPermissions}
      initialLoadError={approvalLoadError}
    />
  );
}
