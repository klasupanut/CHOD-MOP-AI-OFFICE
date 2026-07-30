import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

async function activeQuotationBundle() {
  const html = await read("../quotation-app-dist/index.html");
  const asset = html.match(/<script[^>]+src="\/assets\/(index-[^?"/]+\.js)/)?.[1];
  assert.ok(asset, "active quotation bundle was not found");
  return read(`../quotation-app-dist/assets/${asset}`);
}

test("duplicate quotation keeps its original number and creates the next revision", async () => {
  const bundle = await activeQuotationBundle();
  const duplicateStart = bundle.indexOf("Ye=V.useCallback");
  const duplicateEnd = bundle.indexOf("ae=V.useCallback", duplicateStart);
  const duplicateFlow = bundle.slice(duplicateStart, duplicateEnd);

  assert.match(duplicateFlow, /quotationNo:L\.quotationNo/);
  assert.match(duplicateFlow, /revision:chodNextRevision\(m,L\.quotationNo\)/);
  assert.match(duplicateFlow, /showRevisionOnPdf:!0/);
  assert.doesNotMatch(duplicateFlow, /quotationNo:eo\(/);
});

test("a duplicated revision starts a clean internal approval and signing workflow", async () => {
  const bundle = await activeQuotationBundle();
  const duplicateStart = bundle.indexOf("Ye=V.useCallback");
  const duplicateEnd = bundle.indexOf("ae=V.useCallback", duplicateStart);
  const duplicateFlow = bundle.slice(duplicateStart, duplicateEnd);

  for (const clearedField of [
    'approvalStatus:""',
    'signingStatus:""',
    'signedAt:""',
    'signedPdfUrl:""',
    'internalVerifiedAt:""',
  ]) {
    assert.ok(duplicateFlow.includes(clearedField), `${clearedField} must be reset on duplicate`);
  }
  assert.match(duplicateFlow, /status:"Draft"/);
});

test("revision is always visible internally and optional on the quotation PDF", async () => {
  const bundle = await activeQuotationBundle();

  assert.match(bundle, /children:chodQuotationReference\(h,!0\)/);
  assert.match(bundle, /children:chodQuotationReference\(o,!0\)/);
  assert.match(bundle, /children:chodQuotationReference\(x,!0\)/);
  assert.match(bundle, /`\$\{chodQuotationReference\(M,!0\)\} \$\{M\.client\} \$\{M\.subject\}`/);
  assert.match(bundle, /data-testid":"show-revision-on-pdf"/);
  assert.match(bundle, /children:chodQuotationReference\(o,o\.showRevisionOnPdf===!0\)/);
  assert.match(bundle, /vp=o=>`\$\{dc\(chodQuotationReference\(o,!0\)\)\}/);
  assert.match(bundle, /INTERNAL_VERIFIED\.pdf/);
});

test("revision metadata is persisted without merging separate revisions in Approvals", async () => {
  const [sheetSource, approvalSource, backendRoute] = await Promise.all([
    read("../src/lib/quotations/google-sheet-extra-fields.ts"),
    read("../src/lib/approvals/quotation-approval-source.ts"),
    read("../src/app/api/quotations/backend/route.ts"),
  ]);

  assert.match(sheetSource, /"revision",\s*"show_revision_on_pdf",\s*"base_quotation_no"/);
  assert.match(sheetSource, /\$\{QUOTATIONS_TAB\}!AY\$\{rowNumber\}:BA/);
  assert.match(sheetSource, /quotationReference\(quotationNo, revision, showRevisionOnPdf\)/);
  assert.match(sheetSource, /function findQuotationRowIndex/);
  assert.match(sheetSource, /must never fall through and match another revision/);
  assert.match(approvalSource, /quotation-no:\$\{quotationNo\}:revision:\$\{revision\}/);
  assert.match(backendRoute, /await captureQuotationNumberSnapshot\(\)/);
  assert.match(backendRoute, /await restoreQuotationNumberSnapshot\(quotationNumberSnapshot, body\.payload\)/);
  assert.match(backendRoute, /action === "saveQuotation" \|\| action === "deleteQuotation"/);
  assert.match(backendRoute, /action === "deleteQuotation" && result\.ok\s*\?\s*await listQuotationsFromGoogleSheet\(\)/);
});
