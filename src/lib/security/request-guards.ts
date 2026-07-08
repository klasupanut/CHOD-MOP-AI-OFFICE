import "server-only";

import { NextResponse } from "next/server";

function originFrom(value?: string | null) {
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function allowedOriginsFor(request: Request) {
  const requestOrigin = originFrom(request.url);
  return new Set(
    [
      requestOrigin,
      originFrom(process.env.AUTH_URL),
      originFrom(process.env.NEXTAUTH_URL),
    ].filter(Boolean),
  );
}

export function rejectUnsafeMutationRequest(request: Request) {
  const method = request.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return null;

  const origin = request.headers.get("origin");
  if (origin && !allowedOriginsFor(request).has(origin)) {
    return NextResponse.json(
      { error: "Forbidden: cross-origin write request blocked." },
      { status: 403 },
    );
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    return NextResponse.json(
      { error: "Forbidden: cross-site write request blocked." },
      { status: 403 },
    );
  }

  return null;
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}
