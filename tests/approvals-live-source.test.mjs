import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Approvals reads quotation rows directly from Google Sheets before Apps Script fallback", async () => {
  const source = await read("../src/lib/approvals/quotation-approval-source.ts");
  const sheetRead = source.indexOf("await listQuotationsFromGoogleSheet()");
  const appsScriptRead = source.indexOf('callQuotationAppsScript("listQuotations"');

  assert.ok(sheetRead >= 0, "direct Google Sheet quotation read is missing");
  assert.ok(appsScriptRead > sheetRead, "Apps Script must remain fallback, not the primary approval list source");
  assert.match(source, /throw new AggregateError/);
});

test("Direct quotation list uses one read-only Sheets batch request", async () => {
  const source = await read("../src/lib/quotations/google-sheet-extra-fields.ts");

  assert.match(source, /export async function listQuotationsFromGoogleSheet/);
  assert.match(source, /values:batchGet/);
  assert.match(source, /Quotation_Items!A1:U/);
  assert.doesNotMatch(
    source.slice(source.indexOf("export async function listQuotationsFromGoogleSheet"), source.indexOf("function columnLetter")),
    /method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/,
  );
});

test("Approval details use live contractor, offered-price, and markup fields", async () => {
  const [sheetSource, approvalSource, approvalPage, workspace, preview] = await Promise.all([
    read("../src/lib/quotations/google-sheet-extra-fields.ts"),
    read("../src/lib/approvals/quotation-approval-source.ts"),
    read("../src/app/approvals/page.tsx"),
    read("../src/components/approvals/ApprovalsWorkspace.tsx"),
    read("../src/app/approvals/[approvalId]/preview/page.tsx"),
  ]);

  assert.match(sheetSource, /totalContractorCost:\s*recordOptionalNumber/);
  assert.match(sheetSource, /totalSellingAmount:\s*recordOptionalNumber/);
  assert.match(sheetSource, /averageMarkupPercent:\s*recordOptionalNumber/);
  assert.match(sheetSource, /contractorTotalCost:\s*recordOptionalNumber/);
  assert.match(sheetSource, /markupPercent:\s*recordOptionalNumber/);
  assert.match(approvalSource, /function pricingFromQuotation/);
  assert.match(approvalSource, /\.\.\.pricing/);
  assert.match(approvalPage, /quotation\.viewInternalCost/);
  assert.match(approvalPage, /quotation\.viewMarkupProfit/);
  assert.match(workspace, /Contractor Price/);
  assert.match(workspace, /CHOD Offered Price/);
  assert.match(workspace, /Net Markup/);
  assert.match(preview, /Contractor Total/);
  assert.match(preview, /CHOD Total/);
});

test("Approvals shows a visible load error instead of silently presenting an empty live list", async () => {
  const page = await read("../src/app/approvals/page.tsx");
  const workspace = await read("../src/components/approvals/ApprovalsWorkspace.tsx");

  assert.match(page, /initialLoadError=\{approvalLoadError\}/);
  assert.match(workspace, /initialLoadError \? <p className="approval-denied">/);
});

test("Approval rows scroll to details and details provide a return-to-list action", async () => {
  const workspace = await read("../src/components/approvals/ApprovalsWorkspace.tsx");
  const styles = await read("../src/app/globals.css");

  assert.match(workspace, /approvalListRef = useRef<HTMLElement \| null>\(null\)/);
  assert.match(workspace, /approvalDetailRef = useRef<HTMLElement \| null>\(null\)/);
  assert.match(
    workspace,
    /approvalDetailRef\.current\?\.scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/,
  );
  assert.match(
    workspace,
    /approvalListRef\.current\?\.scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/,
  );
  assert.match(workspace, /className="approval-detail-back"/);
  assert.match(workspace, /Back to approval list/);
  assert.match(styles, /\.approval-detail-back\s*\{/);
});

test("Deep health monitors the same direct quotation source used by Approvals", async () => {
  const health = await read("../src/app/api/health/route.ts");

  assert.match(health, /probeQuotationSheet\(10_000\)/);
  assert.match(health, /label: "quotation-sheet"/);
  assert.match(health, /await Promise\.race\(\[listQuotationsFromGoogleSheet\(\), timeout\]\)/);
});
