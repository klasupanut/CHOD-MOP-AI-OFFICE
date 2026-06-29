import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/api";

const assetRoot = path.join(process.cwd(), "quotation-app-dist");

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

function rewriteQuotationAssetPaths(source: string) {
  return source
    .replaceAll('src="/assets/', 'src="/api/quotation-app/assets/')
    .replaceAll('href="/assets/', 'href="/api/quotation-app/assets/')
    .replaceAll('href="/brand/', 'href="/api/quotation-app/brand/')
    .replaceAll('src="/brand/', 'src="/api/quotation-app/brand/');
}

function injectCursorRuntime(html: string) {
  const rewritten = rewriteQuotationAssetPaths(html);
  if (rewritten.includes("chod-cursor-runtime.js")) return rewritten;
  return rewritten.replace("</body>", '<script src="/cursors/chod-cursor-runtime.js"></script></body>');
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const user = await getApiUser("Quotations");
  if (!user || !user.quotationPermissions.includes("quotation.view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const segments = (await context.params).path;
  const requested = segments.length ? segments.join("/") : "index.html";
  const resolved = path.resolve(assetRoot, requested);
  const relative = path.relative(assetRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return NextResponse.json({ error: "Invalid asset path" }, { status: 400 });
  }

  try {
    const data = await readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const body = ext === ".html" ? injectCursorRuntime(data.toString("utf8")) : data;
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentTypes[ext] ?? "application/octet-stream",
        "Cache-Control": requested.endsWith(".html") || requested.endsWith(".js")
          ? "private, no-store"
          : "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Auto Quotation asset is not available. Run the quotation build sync." },
      { status: 404 },
    );
  }
}
