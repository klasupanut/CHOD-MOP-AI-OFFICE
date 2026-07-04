"use client";

import { useEffect, useRef } from "react";

export function LocalQuotationFrame() {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleBackToOffice = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type !== "chod:back-to-office") return;

      window.location.href = "/";
    };

    window.addEventListener("message", handleBackToOffice);
    return () => window.removeEventListener("message", handleBackToOffice);
  }, []);

  return (
    <iframe
      ref={frameRef}
      src="/api/local-quotation-app/index.html"
      title="CHOD Auto Quotation Local Access"
      sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
    />
  );
}
