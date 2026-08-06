import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = fs.readFileSync(
  path.join(root, "quotation-app-dist", "assets", "index-HmUxnN6T.js"),
  "utf8",
);
const backendRoute = fs.readFileSync(
  path.join(root, "src", "app", "api", "quotations", "backend", "route.ts"),
  "utf8",
);
const patchSource = fs.readFileSync(
  path.join(root, "scripts", "patch-internal-verified-signed-folder.mjs"),
  "utf8",
);

test("internal verified export uses its protected signed-folder action", () => {
  assert.match(bundle, /uploadInternalVerifiedPdf:o=>Le\("uploadInternalVerifiedPdf",o\)/);
  assert.match(
    bundle,
    /C\.internalVerified\?Ke\.uploadInternalVerifiedPdf\(F\):Ke\.uploadPdf\(F\)/,
  );
  assert.match(bundle, /pdfUrl:Z\.signedPdfUrl\|\|Z\.pdfUrl/);
});

test("customer signing retains its OTP-protected signed PDF action", () => {
  assert.match(bundle, /uploadSignedPdf:o=>Le\("uploadSignedPdf",o\)/);
  assert.match(bundle, /Wn\.uploadSignedPdf\(\{signingToken:o,email:x,verifiedSessionToken:k/);
});

test("Vercel bridge restricts internal verified uploads and stamps server identity", () => {
  assert.match(
    backendRoute,
    /uploadInternalVerifiedPdf: \["quotation\.createSigningLink"\]/,
  );
  assert.match(
    backendRoute,
    /action === "uploadInternalVerifiedPdf"[\s\S]*createdBy: user\.email/,
  );
});

test("Apps Script patch stores internal verified PDFs in Signed with internal-secret protection", () => {
  assert.match(patchSource, /SIGNED_PDFS_FOLDER_ID/);
  assert.match(patchSource, /pdf_type: 'SIGNED'/);
  assert.match(patchSource, /INTERNAL_VERIFIED_PDF/);
  assert.doesNotMatch(
    patchSource,
    /PUBLIC_SIGNING_ACTIONS[\s\S]{0,300}uploadInternalVerifiedPdf/,
  );
});
