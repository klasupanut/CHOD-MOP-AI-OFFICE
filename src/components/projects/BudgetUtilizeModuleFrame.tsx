"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type ThemeMode = "dark" | "light";

function currentThemeMode(): ThemeMode {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function BudgetUtilizeModuleFrame() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const hideShellCursor = () => {
    document.body.classList.add("cursor-over-embedded-module");
    window.dispatchEvent(new Event("chod:hide-shell-cursor"));
  };
  const showShellCursor = () => document.body.classList.remove("cursor-over-embedded-module");

  const syncFrameTheme = useCallback((mode = currentThemeMode()) => {
    setThemeMode(mode);
    const frameWindow = frameRef.current?.contentWindow;
    if (!frameWindow) return;

    // Same-origin access is preferred, while postMessage keeps the bridge
    // working if the iframe sandbox policy changes later.
    try {
      frameRef.current?.contentDocument?.documentElement.setAttribute("data-theme", mode);
      if (frameRef.current?.contentDocument?.documentElement) {
        frameRef.current.contentDocument.documentElement.style.colorScheme = mode;
      }
    } catch {
      // The postMessage bridge below remains available for isolated frames.
    }
    frameWindow.postMessage({ type: "chod:theme", mode }, window.location.origin);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    syncFrameTheme(currentThemeMode());

    const observer = new MutationObserver(() => syncFrameTheme(currentThemeMode()));
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      observer.disconnect();
      showShellCursor();
    };
  }, [syncFrameTheme]);

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
          <a href={`/api/budget-utilize-app/index.html?theme=${themeMode}`} target="_blank" rel="noreferrer">
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
          onLoad={() => syncFrameTheme(themeMode)}
          onMouseEnter={hideShellCursor}
          onPointerEnter={hideShellCursor}
          sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}
