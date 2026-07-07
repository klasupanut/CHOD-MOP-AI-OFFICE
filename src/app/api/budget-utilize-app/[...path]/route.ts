import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/api";

const assetRoot = path.join(process.cwd(), "budget-utilize-app-dist");
const DEFAULT_BUDGET_UTILIZE_SHEET_ID = "1NmVPZkEGxeUvIQYsuoyF7L9Xhjn03zH5RZvDf8UJ2Po";

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function spreadsheetId() {
  return process.env.GOOGLE_SHEET_ID_BUDGET_UTILIZE || DEFAULT_BUDGET_UTILIZE_SHEET_ID;
}

function rewriteBudgetUtilizeSource(source: string) {
  return source
    .replaceAll("/api/sheet", "/api/budget-utilize-app/api/sheet")
    .replaceAll("/api/write-config", "/api/budget-utilize-app/api/write-config")
    .replaceAll("/api/update-task", "/api/budget-utilize-app/api/update-task")
    .replaceAll("/api/add-project", "/api/budget-utilize-app/api/add-project")
    .replaceAll("/api/delete-project", "/api/budget-utilize-app/api/delete-project");
}

function injectCursorRuntime(html: string) {
  const rewritten = rewriteBudgetUtilizeSource(html);
  if (rewritten.includes("chod-cursor-runtime.js")) return rewritten;
  return rewritten.replace("</body>", '<script src="/cursors/chod-cursor-runtime.js"></script></body>');
}

function localAssetResponse(body: BodyInit, requested: string, ext: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": contentTypes[ext] ?? "application/octet-stream",
      "Cache-Control": requested.endsWith(".html") || requested.endsWith(".js")
        ? "private, no-store"
        : "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function assertProjectAccess() {
  const user = await getApiUser("Projects");
  if (!user) return null;
  return user;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const user = await assertProjectAccess();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const segments = (await context.params).path;
  const requested = segments.length ? segments.join("/") : "index.html";

  if (requested === "api/write-config") {
    return NextResponse.json({
      enabled: false,
      reason: "CHOD MOP OFFICE mounts Budget Utilize in read-only mode for safety. Write proxy is not enabled here.",
    });
  }

  if (requested === "api/sheet") {
    const url = new URL(request.url);
    const gid = url.searchParams.get("gid");
    if (!/^\d+$/.test(gid || "")) {
      return NextResponse.json({ error: "Invalid gid" }, { status: 400 });
    }

    const upstream = `https://docs.google.com/spreadsheets/d/${spreadsheetId()}/export?format=csv&gid=${gid}`;
    const upstreamResponse = await fetch(upstream, { cache: "no-store" });
    if (!upstreamResponse.ok) {
      return new NextResponse(`Google Sheets export failed: ${upstreamResponse.status}`, {
        status: upstreamResponse.status,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const csv = new TextDecoder("utf-8").decode(await upstreamResponse.arrayBuffer());
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const resolved = path.resolve(assetRoot, requested);
  const relative = path.relative(assetRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return NextResponse.json({ error: "Invalid asset path" }, { status: 400 });
  }

  try {
    const data = await readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const rewritten = ext === ".html" || ext === ".js"
      ? rewriteBudgetUtilizeSource(data.toString("utf8"))
      : data;
    const body = ext === ".html" && typeof rewritten === "string"
      ? injectCursorRuntime(rewritten)
      : rewritten;

    return localAssetResponse(body, requested, ext);
  } catch {
    return NextResponse.json(
      { error: "Budget Utilize asset is not available. Sync budget-utilize-app-dist from the Budget Utilize project." },
      { status: 404 },
    );
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const user = await assertProjectAccess();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requested = (await context.params).path.join("/");
  if (["api/update-task", "api/add-project", "api/delete-project"].includes(requested)) {
    return NextResponse.json({
      error: "Budget Utilize write mode is disabled in CHOD MOP OFFICE.",
      detail: "This embedded workspace reads the live Budget Utilize Google Sheet only. Enable a reviewed write proxy before allowing edits.",
    }, { status: 501 });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
