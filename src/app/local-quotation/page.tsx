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
      <iframe
        src="/api/local-quotation-app/index.html"
        title="CHOD Auto Quotation Local Access"
        sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
      />
    </main>
  );
}
