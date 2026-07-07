"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function BudgetUtilizeModuleFrame() {
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

  return (
    <div className="quotation-module budget-utilize-embedded-module">
      <div className="quotation-module-bar">
        <div>
          <span>PROJECTS & BUDGETS</span>
          <strong>Budget Utilize Workspace</strong>
        </div>
        <div className="quotation-module-actions">
          <button
            type="button"
            onClick={() => {
              frameRef.current?.contentWindow?.location.reload();
              setReloadKey((value) => value + 1);
            }}
            aria-label="Reload Budget Utilize"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
          <a href="/api/budget-utilize-app/index.html" target="_blank" rel="noreferrer">
            <ExternalLink size={17} />
            Full screen
          </a>
        </div>
      </div>
      <div
        className="quotation-module-frame budget-utilize-embedded-frame"
        onMouseEnter={hideShellCursor}
        onMouseLeave={showShellCursor}
        onPointerEnter={hideShellCursor}
        onPointerLeave={showShellCursor}
      >
        <iframe
          key={reloadKey}
          ref={frameRef}
          src="/api/budget-utilize-app/index.html"
          title="CHOD Budget Utilize Workspace"
          onMouseEnter={hideShellCursor}
          onPointerEnter={hideShellCursor}
          sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}
