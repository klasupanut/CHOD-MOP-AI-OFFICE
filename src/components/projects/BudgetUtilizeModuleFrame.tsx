"use client";

import { ExternalLink, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const BUDGET_UTILIZE_THEME = "light" as const;

export function BudgetUtilizeModuleFrame() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const hideShellCursor = () => {
    document.body.classList.add("cursor-over-embedded-module");
    window.dispatchEvent(new Event("chod:hide-shell-cursor"));
  };
  const showShellCursor = () => document.body.classList.remove("cursor-over-embedded-module");

  const syncFrameTheme = useCallback(() => {
    const frameWindow = frameRef.current?.contentWindow;
    if (!frameWindow) return;

    // Same-origin access is preferred, while postMessage keeps the bridge
    // working if the iframe sandbox policy changes later.
    try {
      frameRef.current?.contentDocument?.documentElement.setAttribute("data-theme", BUDGET_UTILIZE_THEME);
      if (frameRef.current?.contentDocument?.documentElement) {
        frameRef.current.contentDocument.documentElement.style.colorScheme = BUDGET_UTILIZE_THEME;
      }
    } catch {
      // The postMessage bridge below remains available for isolated frames.
    }
    frameWindow.postMessage({ type: "chod:theme", mode: BUDGET_UTILIZE_THEME }, window.location.origin);
  }, []);

  useEffect(() => {
    syncFrameTheme();

    return () => {
      showShellCursor();
    };
  }, [syncFrameTheme]);

  return (
    <div className="quotation-module budget-utilize-embedded-module">
      <div className="quotation-module-bar embedded-module-toolbar">
        <div className="embedded-module-identity">
          <span>PROJECTS & BUDGETS</span>
          <strong>Budget Utilize Workspace</strong>
        </div>
        <div className="quotation-module-actions">
          <button
            type="button"
            onClick={() => {
              setIsFrameLoading(true);
              setReloadKey((value) => value + 1);
            }}
            aria-label="Reload Budget Utilize"
            disabled={isFrameLoading}
          >
            {isFrameLoading ? <LoaderCircle className="embedded-module-spinner" size={17} /> : <RefreshCw size={17} />}
            <span className="embedded-action-label">{isFrameLoading ? "Loading" : "Refresh"}</span>
          </button>
          <a href="/api/budget-utilize-app/index.html?theme=light" target="_blank" rel="noreferrer">
            <ExternalLink size={17} />
            <span className="embedded-action-label">Full screen</span>
          </a>
        </div>
      </div>
      <div
        className={`quotation-module-frame budget-utilize-embedded-frame${isFrameLoading ? " is-loading" : ""}`}
        aria-busy={isFrameLoading}
        onMouseEnter={hideShellCursor}
        onMouseLeave={showShellCursor}
        onPointerEnter={hideShellCursor}
        onPointerLeave={showShellCursor}
      >
        <iframe
          key={reloadKey}
          ref={frameRef}
          src="/api/budget-utilize-app/index.html?theme=light"
          title="CHOD Budget Utilize Workspace"
          onLoad={() => {
            syncFrameTheme();
            setIsFrameLoading(false);
          }}
          onError={() => setIsFrameLoading(false)}
          onMouseEnter={hideShellCursor}
          onPointerEnter={hideShellCursor}
          sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
        />
        {isFrameLoading ? (
          <div className="embedded-module-loading" role="status">
            <LoaderCircle className="embedded-module-spinner" size={22} />
            <span>กำลังโหลด Projects & Budgets…</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
