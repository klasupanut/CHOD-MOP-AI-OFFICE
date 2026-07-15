import { QuotationModuleFrame } from "@/components/quotations/QuotationModuleFrame";
import { requireQuotationPermission } from "@/lib/auth/session";

export default async function QuotationsPage() {
  const user = await requireQuotationPermission("quotation.view");
  void user;
  return <QuotationModuleFrame />;
}
