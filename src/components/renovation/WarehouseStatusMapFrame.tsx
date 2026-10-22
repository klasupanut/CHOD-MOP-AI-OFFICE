"use client";

import { ExternalLink, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const WAREHOUSE_MAP_URL = "/api/warehouse-status-map/index.html";

export function WarehouseStatusMapFrame() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFrameLoading, setIsFrameLoading] = useState(true);

  const hideShellCursor = () => {
    document.body.classList.add("cursor-over-embedded-module");
    window.dispatchEvent(new Event("chod:hide-shell-cursor"));
  };
  const showShellCursor = () => document.body.classList.remove("cursor-over-embedded-module");

  useEffect(() => () => showShellCursor(), []);

  return (
    <div className="quotation-module warehouse-status-embedded-module">
      <div className="quotation-module-bar embedded-module-toolbar">
        <div className="embedded-module-identity">
          <span>RENOVATION</span>
          <strong>Warehouse Status Map</strong>
        </div>
        <div className="quotation-module-actions">
          <button
            type="button"
            onClick={() => {
              setIsFrameLoading(true);
              setReloadKey((value) => value + 1);
            }}
            aria-label="Reload Warehouse Status Map"
            disabled={isFrameLoading}
          >
            {isFrameLoading ? <LoaderCircle className="embedded-module-spinner" size={17} /> : <RefreshCw size={17} />}
            <span className="embedded-action-label">{isFrameLoading ? "Loading" : "Refresh"}</span>
          </button>
          <a href={WAREHOUSE_MAP_URL} target="_blank" rel="noreferrer">
            <ExternalLink size={17} />
            <span className="embedded-action-label">Full screen</span>
          </a>
        </div>
      </div>
      <div
        className={`quotation-module-frame warehouse-status-embedded-frame${isFrameLoading ? " is-loading" : ""}`}
        aria-busy={isFrameLoading}
        onMouseEnter={hideShellCursor}
        onMouseLeave={showShellCursor}
        onPointerEnter={hideShellCursor}
        onPointerLeave={showShellCursor}
      >
        <iframe
          key={reloadKey}
          ref={frameRef}
          src={WAREHOUSE_MAP_URL}
          title="CHOD Warehouse Status Map"
          onLoad={() => setIsFrameLoading(false)}
          onError={() => setIsFrameLoading(false)}
          onMouseEnter={hideShellCursor}
          onPointerEnter={hideShellCursor}
          sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
        />
        {isFrameLoading ? (
          <div className="embedded-module-loading" role="status">
            <LoaderCircle className="embedded-module-spinner" size={22} />
            <span>กำลังโหลด Warehouse Status Map…</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
