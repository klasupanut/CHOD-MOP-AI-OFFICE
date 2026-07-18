"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function PlannerModuleFrame() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const hideShellCursor = () => {
    document.body.classList.add("cursor-over-embedded-module");
    window.dispatchEvent(new Event("chod:hide-shell-cursor"));
  };
  const showShellCursor = () => document.body.classList.remove("cursor-over-embedded-module");

  useEffect(() => () => showShellCursor(), []);

  return (
    <div className="quotation-module planner-embedded-module">
      <div className="quotation-module-bar embedded-module-toolbar">
        <div className="embedded-module-identity">
          <span>PLANNER</span>
          <strong>Timeline Plan Creator</strong>
        </div>
        <div className="quotation-module-actions">
          <button
            type="button"
            onClick={() => {
              frameRef.current?.contentWindow?.location.reload();
              setReloadKey((value) => value + 1);
            }}
            aria-label="Reload Planner"
          >
            <RefreshCw size={17} />
            <span className="embedded-action-label">Refresh</span>
          </button>
          <a href="/planner/workspace" target="_blank" rel="noreferrer">
            <ExternalLink size={17} />
            <span className="embedded-action-label">Full screen</span>
          </a>
        </div>
      </div>
      <div
        className="quotation-module-frame planner-embedded-frame"
        onMouseEnter={hideShellCursor}
        onMouseLeave={showShellCursor}
        onPointerEnter={hideShellCursor}
        onPointerLeave={showShellCursor}
      >
        <iframe
          key={reloadKey}
          ref={frameRef}
          src="/planner/workspace"
          title="CHOD Timeline Plan Creator"
          onMouseEnter={hideShellCursor}
          onPointerEnter={hideShellCursor}
          sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
        />
      </div>
    </div>
  );
}
