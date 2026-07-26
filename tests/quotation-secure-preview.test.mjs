import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const approvalSource = new URL("../src/lib/approvals/quotation-approval-source.ts", import.meta.url);
const approvalsWorkspace = new URL("../src/components/approvals/ApprovalsWorkspace.tsx", import.meta.url);
const previewPage = new URL("../src/app/approvals/[approvalId]/preview/page.tsx", import.meta.url);

test("workspace quotation preview never sends approved users to Google Drive", async () => {
  const [source, workspace, preview] = await Promise.all([
    readFile(approvalSource, "utf8"),
    readFile(approvalsWorkspace, "utf8"),
    readFile(previewPage, "utf8"),
  ]);

  assert.match(source, /quotationPreviewUrl:\s*`\/approvals\/APR-\$\{quotationId\}\/preview`/);
  assert.match(workspace, /href=\{selectedPreviewUrl\}/);
  assert.doesNotMatch(workspace, /href=\{selectedPdfUrl/);
  assert.doesNotMatch(preview, /redirect\(approval\.quotationPdfUrl\)/);
  assert.doesNotMatch(preview, /host === "drive\.google\.com"/);
  assert.match(preview, /await requireModule\("Approvals"\)/);
});
