import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Renovation opens the authenticated Warehouse Status Map module", async () => {
  const page = await read("../src/app/renovation/page.tsx");
  const sidebar = await read("../src/components/layout/Sidebar.tsx");
  const route = await read("../src/app/api/warehouse-status-map/[...path]/route.ts");

  assert.match(page, /requireModule\("Renovation"\)/);
  assert.match(page, /WarehouseStatusMapFrame/);
  assert.match(sidebar, /label: "Renovation", icon: Wrench, href: "\/renovation"/);
  assert.doesNotMatch(sidebar, /label: "Renovation", icon: Wrench, pendingConnector: true/);
  assert.match(route, /getApiUser\("Renovation"\)/);
  assert.match(route, /relative\.startsWith\("\.\."\)/);
  assert.match(route, /"Cache-Control": isRuntimeAsset \? "private, no-store"/);
});

test("Warehouse module retains the live read-only Google Sheet source", async () => {
  const app = await read("../warehouse-status-map-dist/app.js");
  assert.match(app, /1I5Z_MjvqTZlkb7NJJMieP0_SKcNmervyP7w_KCHRpac/);
  assert.match(app, /connectSheetUrl\(\)\.catch/);
  assert.doesNotMatch(app, /sheets\.googleapis\.com\/v4\/spreadsheets[\s\S]*method:\s*["'](?:POST|PUT|PATCH|DELETE)/i);
});

test("Warehouse production bundle excludes obsolete CAD and PDF source artifacts", async () => {
  const root = new URL("../warehouse-status-map-dist/", import.meta.url);
  const entries = await readdir(root, { recursive: true });
  assert.ok(entries.includes("index.html"));
  assert.ok(entries.includes("app.js"));
  assert.ok(entries.includes("styles.css"));
  assert.equal(entries.some((name) => /\.(?:pdf|tsv|lsp|scr)$/i.test(name)), false);
  assert.equal(entries.some((name) => /(?:plan|aligned)\.svg$/i.test(name)), false);

  let bytes = 0;
  for (const name of entries) {
    const details = await stat(new URL(name.replaceAll("\\", "/"), root));
    if (details.isFile()) bytes += details.size;
  }
  assert.ok(bytes < 20 * 1024 * 1024, `Warehouse bundle is unexpectedly large: ${bytes} bytes`);
});
