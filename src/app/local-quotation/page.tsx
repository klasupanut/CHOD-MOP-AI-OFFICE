import { LocalQuotationFrame } from "@/components/quotations/LocalQuotationFrame";

export const metadata = {
  title: "CHOD Auto Quotation",
};

export default function LocalQuotationPage() {
  return (
    <main className="local-quotation-shell">
      <header className="local-quotation-bar">
        <div>
          <span>LOCAL WIFI ACCESS</span>
          <strong>CHOD Auto Quotation</strong>
        </div>
        <small>No Google login required. Use only on the current trusted office Wi‑Fi.</small>
      </header>
      <LocalQuotationFrame />
    </main>
  );
}
