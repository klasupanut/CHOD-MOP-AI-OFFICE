"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import type { ApprovedUser } from "@/lib/auth/types";

const NAVIGATION_TIMEOUT_MS = 12_000;

function isStandaloneRoute(pathname: string) {
  return pathname === "/login"
    || pathname === "/access-denied"
    || pathname === "/local-quotation"
    || (pathname.startsWith("/approvals/") && pathname !== "/approvals");
}

export function AuthenticatedAppShell({ user, children }: { user: ApprovedUser; children: ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const standalone = isStandaloneRoute(pathname);
  const office = pathname === "/";
  const settings = pathname.startsWith("/settings/");

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  useEffect(() => {
    let timeout = 0;
    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.target === "_blank" || target.hasAttribute("download")) return;

      const next = new URL(target.href, window.location.href);
      if (next.origin !== window.location.origin) return;
      if (`${next.pathname}${next.search}` === `${window.location.pathname}${window.location.search}`) return;

      setIsNavigating(true);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setIsNavigating(false), NAVIGATION_TIMEOUT_MS);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.clearTimeout(timeout);
    };
  }, []);

  if (standalone) return <>{children}</>;

  if (office) {
    return (
      <main className="hq-shell">
        <div aria-hidden="true" className={`route-transition-bar ${isNavigating ? "is-active" : ""}`} />
        <Sidebar user={user} />
        {children}
      </main>
    );
  }

  if (settings) {
    return (
      <main className="hq-shell admin-shell">
        <div aria-hidden="true" className={`route-transition-bar ${isNavigating ? "is-active" : ""}`} />
        <Sidebar user={user} />
        {children}
      </main>
    );
  }

  return (
    <main className="hq-shell module-shell">
      <div aria-hidden="true" className={`route-transition-bar ${isNavigating ? "is-active" : ""}`} />
      <Sidebar user={user} />
      <section className="module-main">
        <TopBar />
        {children}
      </section>
    </main>
  );
}
