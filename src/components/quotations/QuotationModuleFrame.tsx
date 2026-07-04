"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function QuotationModuleFrame() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const hideShellCursor = () => {
    document.body.classList.add("cursor-over-embedded-module");
    window.dispatchEvent(new Event("chod:hide-shell-cursor"));
  };
  const showShellCursor = () => document.body.classList.remove("cursor-over-embedded-module");

  useEffect(() => {
    return () => showShellCursor();
  }, []);

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
    <div className="quotation-module">
      <div className="quotation-module-bar">
        <div>
          <span>AUTO QUOTATION</span>
          <strong>Fit-out Quotation Generator</strong>
        </div>
        <div className="quotation-module-actions">
          <button
            type="button"
            onClick={() => {
              frameRef.current?.contentWindow?.location.reload();
              setReloadKey((value) => value + 1);
            }}
            aria-label="Reload Auto Quotation"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
          <a href="/api/quotation-app/index.html" target="_blank" rel="noreferrer">
            <ExternalLink size={17} />
            Full screen
          </a>
        </div>
      </div>
      <div
        className="quotation-module-frame"
        onMouseEnter={hideShellCursor}
        onMouseLeave={showShellCursor}
        onPointerEnter={hideShellCursor}
        onPointerLeave={showShellCursor}
      >
        <iframe
          key={reloadKey}
          ref={frameRef}
          src="/api/quotation-app/index.html"
          title="CHOD Auto Quotation"
          onMouseEnter={hideShellCursor}
          onPointerEnter={hideShellCursor}
          sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
        />
      </div>
    </div>
  );
}
