import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ApprovalsWorkspace } from "@/components/approvals/ApprovalsWorkspace";
import { listApprovalPermissions } from "@/lib/approvals/approval-permission-store";
import { listApprovalRows } from "@/lib/approvals/approval-store";
import { requireModule } from "@/lib/auth/session";

export default async function ApprovalsPage() {
  const user = await requireModule("Approvals");
  const [approvals, approvalPermissions] = await Promise.all([
    listApprovalRows().catch((error) => {
      console.warn("[approvals] Unable to load live approval rows.", error);
      return [];
    }),
    listApprovalPermissions().catch((error) => {
      console.warn("[approvals] Unable to load live approval permissions.", error);
      return [];
    }),
  ]);
  return (
    <main className="hq-shell module-shell">
      <Sidebar user={user} />
      <section className="module-main">
        <TopBar />
        <ApprovalsWorkspace
          currentUser={user}
          initialApprovals={approvals}
          initialApprovalPermissions={approvalPermissions}
        />
      </section>
    </main>
  );
}
