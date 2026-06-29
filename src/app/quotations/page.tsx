import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { QuotationModuleFrame } from "@/components/quotations/QuotationModuleFrame";
import { requireQuotationPermission } from "@/lib/auth/session";

export default async function QuotationsPage() {
  const user = await requireQuotationPermission("quotation.view");
  return (
    <main className="hq-shell module-shell">
      <Sidebar user={user} />
      <section className="module-main">
        <TopBar />
        <QuotationModuleFrame />
      </section>
    </main>
  );
}
