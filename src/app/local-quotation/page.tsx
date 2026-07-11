import { redirect } from "next/navigation";

export default function LocalQuotationPage() {
  // Preserve old bookmarks without retaining a no-login quotation surface.
  redirect("/quotations");
}
