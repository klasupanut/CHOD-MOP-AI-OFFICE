"use client";

import type { HTMLAttributes, PropsWithChildren } from "react";

export function MagneticHover({
  children,
  className = "",
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLSpanElement>>) {
  return (
    <span className={["cursor-magnetic", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </span>
  );
}
