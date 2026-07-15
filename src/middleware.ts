import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The page shell streams early for fast navigation, so authentication must be
// rejected before rendering starts. This lightweight preflight checks only
// for Auth.js' session-cookie envelope. Page-level guards still decrypt and
// verify the session, approved-user record, account status, and permissions.
function hasAuthSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some(({ name }) => (
    name === "authjs.session-token"
    || name.startsWith("authjs.session-token.")
    || name === "__Secure-authjs.session-token"
    || name.startsWith("__Secure-authjs.session-token.")
  ));
}

export default function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/local-quotation") {
    return NextResponse.redirect(new URL("/quotations", request.nextUrl));
  }

  if (!hasAuthSessionCookie(request)) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard",
    "/tasks",
    "/projects",
    "/fit-out-project",
    "/calendar-schedule",
    "/quotations",
    "/approvals/:path*",
    "/reports",
    "/settings/:path*",
    "/local-quotation",
  ],
};
