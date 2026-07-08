export function isLocalNetworkRequest(request: Request) {
  const host = request.headers.get("host")?.split(":")[0]?.trim().toLowerCase() || "";
  if (!host) return false;
  if (host === "localhost" || host === "::1" || host.startsWith("127.")) return true;
  if (host.startsWith("10.")) return true;
  if (host.startsWith("192.168.")) return true;

  const parts = host.split(".").map((part) => Number(part));
  if (parts.length === 4 && parts.every((part) => Number.isInteger(part))) {
    return parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
  }

  return false;
}

export function isLocalQuotationAccessAllowed(request: Request) {
  if (process.env.LOCAL_QUOTATION_ACCESS_ENABLED === "false") return false;
  if (!isLocalNetworkRequest(request)) return false;

  const expectedToken = process.env.LOCAL_QUOTATION_ACCESS_TOKEN?.trim();
  if (!expectedToken) return true;

  const url = new URL(request.url);
  const providedToken =
    request.headers.get("x-local-quotation-token")?.trim() ||
    url.searchParams.get("token")?.trim() ||
    "";

  return providedToken === expectedToken;
}
