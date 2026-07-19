import "server-only";

import { createHash, createHmac } from "node:crypto";
import { getApiUser } from "@/lib/auth/api";
import { CHOD_ORGANIZATION } from "./tenancy";

const MAX_BRIDGE_BODY_BYTES = 8_000_000;
const REQUEST_TIMEOUT_MS = 20_000;
const PLANNER_MODULES = new Set([
  "Projects",
  "Calendar / Schedule",
  "Tasks",
  "Fit-out Project",
]);

type TimelineResource =
  | "context"
  | "projects"
  | "plan"
  | "usage"
  | "company-profile"
  | "company-logo";

export async function proxyTimelineRequest(
  request: Request,
  resource: TimelineResource,
): Promise<Response> {
  const user = await getApiUser();
  if (!user) return Response.json({ error: "Authentication is required." }, { status: 401 });
  if (!user.modulePermissions.some((permission) => PLANNER_MODULES.has(permission))) {
    return Response.json({ error: "Planner access is not permitted." }, { status: 403 });
  }

  const config = timelineBridgeConfig();
  if (!config) {
    return Response.json(
      { error: "Planner cloud connection is not configured." },
      { status: 503 },
    );
  }

  const method = request.method.toUpperCase();
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > MAX_BRIDGE_BODY_BYTES) {
    return Response.json({ error: "Planner request is too large." }, { status: 413 });
  }

  const body = method === "GET" || method === "HEAD"
    ? new ArrayBuffer(0)
    : await request.arrayBuffer();
  if (body.byteLength > MAX_BRIDGE_BODY_BYTES) {
    return Response.json({ error: "Planner request is too large." }, { status: 413 });
  }

  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(`/api/tenant/${resource}${incomingUrl.search}`, config.baseUrl);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const email = user.email.trim().toLowerCase();
  const bodyHash = createHash("sha256").update(Buffer.from(body)).digest("base64url");
  const canonical = [
    "v1",
    timestamp,
    email,
    CHOD_ORGANIZATION.id,
    method,
    `${upstreamUrl.pathname}${upstreamUrl.search}`,
    bodyHash,
  ].join("\n");
  const signature = createHmac("sha256", config.identitySecret)
    .update(canonical)
    .digest("base64url");

  const headers = new Headers({
    accept: request.headers.get("accept") || "application/json",
    "cf-access-client-id": config.accessClientId,
    "cf-access-client-secret": config.accessClientSecret,
    "x-chod-user-email": email,
    "x-chod-organization-id": CHOD_ORGANIZATION.id,
    "x-chod-identity-timestamp": timestamp,
    "x-chod-identity-signature": signature,
    "x-chod-content-sha256": bodyHash,
    "x-organization-id": CHOD_ORGANIZATION.id,
  });
  copyHeader(request.headers, headers, "content-type");
  copyHeader(request.headers, headers, "x-file-name");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers,
      body: body.byteLength ? body : undefined,
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      return Response.json(
        { error: "Timeline service authentication was rejected." },
        { status: 502 },
      );
    }

    return bridgeResponse(upstream);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return Response.json(
      { error: timedOut ? "Timeline service timed out." : "Timeline service is unavailable." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

function timelineBridgeConfig() {
  const baseUrl = process.env.TIMELINE_API_BASE_URL?.trim();
  const accessClientId = process.env.TIMELINE_CF_ACCESS_CLIENT_ID?.trim();
  const accessClientSecret = process.env.TIMELINE_CF_ACCESS_CLIENT_SECRET?.trim();
  const identitySecret = process.env.TIMELINE_INTERNAL_IDENTITY_SECRET?.trim();
  if (!baseUrl || !accessClientId || !accessClientSecret || !identitySecret || identitySecret.length < 32) return null;
  if (!baseUrl.startsWith("https://")) return null;
  return { baseUrl, accessClientId, accessClientSecret, identitySecret };
}

function copyHeader(source: Headers, target: Headers, name: string) {
  const value = source.get(name);
  if (value) target.set(name, value);
}

async function bridgeResponse(upstream: Response) {
  if (upstream.status === 204 || upstream.status === 304) {
    return new Response(null, { status: upstream.status, headers: responseHeaders(upstream.headers) });
  }

  const contentType = upstream.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const text = await upstream.text();
    let body = text;
    try {
      body = JSON.stringify(rewriteTimelineUrls(JSON.parse(text)));
    } catch {
      // Preserve an upstream JSON error body if it cannot be parsed safely.
    }
    const headers = responseHeaders(upstream.headers);
    headers.set("content-type", "application/json; charset=utf-8");
    return new Response(body, { status: upstream.status, headers });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders(upstream.headers),
  });
}

function responseHeaders(source: Headers) {
  const headers = new Headers({ "cache-control": "private, no-store" });
  for (const name of ["content-type", "content-length", "content-disposition", "etag", "last-modified"]) {
    const value = source.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

function rewriteTimelineUrls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(rewriteTimelineUrls);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (key === "logoDataUrl" && typeof item === "string" && item.startsWith("/api/tenant/company-logo")) {
      return [key, item.replace("/api/tenant/company-logo", "/api/planner/company-logo")];
    }
    return [key, rewriteTimelineUrls(item)];
  }));
}
