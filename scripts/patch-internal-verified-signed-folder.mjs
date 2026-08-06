import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = path.join(root, "quotation-app-dist", "assets", "index-HmUxnN6T.js");
const indexPath = path.join(root, "quotation-app-dist", "index.html");
const appsScriptPath = process.env.AUTO_QUOTATION_CODE_GS ||
  "C:\\Users\\User\\Documents\\Codex\\2026-05-06\\auto quotation\\google-apps-script\\Code.gs";

const replaceOnce = (source, before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one target, found ${count}`);
  return source.replace(before, after);
};

let bundle = fs.readFileSync(bundlePath, "utf8");
bundle = replaceOnce(
  bundle,
  'uploadSignedPdf:o=>Le("uploadSignedPdf",o),submitSignatureRecord:o=>Le("submitSignatureRecord",o)',
  'uploadSignedPdf:o=>Le("uploadSignedPdf",o),uploadInternalVerifiedPdf:o=>Le("uploadInternalVerifiedPdf",o),submitSignatureRecord:o=>Le("submitSignatureRecord",o)',
  "internal verified PDF client action",
);
bundle = replaceOnce(
  bundle,
  'const E=S.output("datauristring").replace(/^data:application\\/pdf;[^,]*;base64,/,"data:application/pdf;base64,"),Z=await Ke.uploadPdf({quotationId:f.quotationId,quotationNo:f.quotationNo,filename:J,dataUrl:E,createdBy:f.preparedBy});return{filename:J,pdfUrl:Z.pdfUrl}};',
  'const E=S.output("datauristring").replace(/^data:application\\/pdf;[^,]*;base64,/,"data:application/pdf;base64,"),F={quotationId:f.quotationId,quotationNo:f.quotationNo,filename:J,dataUrl:E,createdBy:f.preparedBy},Z=await(C.internalVerified?Ke.uploadInternalVerifiedPdf(F):Ke.uploadPdf(F));return{filename:J,pdfUrl:Z.signedPdfUrl||Z.pdfUrl}};',
  "route internal verified export to signed storage",
);
fs.writeFileSync(bundlePath, bundle, "utf8");

let indexHtml = fs.readFileSync(indexPath, "utf8");
indexHtml = indexHtml.replace(
  /index-HmUxnN6T\.js\?v=[^"]+/,
  "index-HmUxnN6T.js?v=20260806-signed-drive-folder",
);
fs.writeFileSync(indexPath, indexHtml, "utf8");

if (!fs.existsSync(appsScriptPath)) {
  throw new Error(`Auto Quotation Apps Script source not found: ${appsScriptPath}`);
}

let appsScript = fs.readFileSync(appsScriptPath, "utf8");
appsScript = replaceOnce(
  appsScript,
  "      uploadPdf: () => uploadPdf_(body.payload),\n      createSigningLink: () => createSigningLink_(body.payload),",
  "      uploadPdf: () => uploadPdf_(body.payload),\n      uploadInternalVerifiedPdf: () => uploadInternalVerifiedPdf_(body.payload),\n      createSigningLink: () => createSigningLink_(body.payload),",
  "Apps Script internal verified handler",
);

const uploadPdfFunction = `function uploadPdf_(payload) {
  ensureSetup_();
  const file = saveDataUrl_(APP.props.getProperty('GENERATED_PDFS_FOLDER_ID'), payload.dataUrl, payload.filename);
  const pdfUrl = file.getUrl();
  appendObject_('Pdf_Files', { pdf_id: Utilities.getUuid(), quotation_id: payload.quotationId, quotation_no: payload.quotationNo, pdf_url: pdfUrl, created_at: new Date().toISOString(), created_by: payload.createdBy || '', pdf_type: 'ORIGINAL' });
  const current = rows_('Quotations').find((q) =>
    String(q.quotation_id) === String(payload.quotationId)
  );
  if (current) upsert_('Quotations', 'quotation_id', Object.assign(current, { pdf_url: pdfUrl, updated_at: new Date().toISOString() }));
  audit_('EXPORT_PDF', payload.quotationId, payload.filename, payload.createdBy);
  return { pdfUrl: pdfUrl };
}`;

const internalVerifiedFunction = `${uploadPdfFunction}

function uploadInternalVerifiedPdf_(payload) {
  ensureSetup_();
  ensureSigningFolders_();
  const quotationId = String((payload && payload.quotationId) || '').trim();
  const filename = String((payload && payload.filename) || '').trim();
  if (!quotationId) throw new Error('Quotation ID is required for Internal Verify PDF.');
  if (!/INTERNAL_VERIFIED\\.pdf$/i.test(filename)) {
    throw new Error('Internal Verify PDF filename is invalid.');
  }
  const quotation = rows_('Quotations').find((row) =>
    String(row.quotation_id) === quotationId
  );
  if (!quotation) throw new Error('Quotation not found.');
  const file = saveDataUrl_(
    APP.props.getProperty('SIGNED_PDFS_FOLDER_ID'),
    payload.dataUrl,
    filename
  );
  const signedPdfUrl = file.getUrl();
  appendObject_('Pdf_Files', {
    pdf_id: Utilities.getUuid(),
    quotation_id: quotation.quotation_id,
    quotation_no: quotation.quotation_no,
    pdf_url: signedPdfUrl,
    created_at: new Date().toISOString(),
    created_by: payload.createdBy || '',
    pdf_type: 'SIGNED',
  });
  audit_('INTERNAL_VERIFIED_PDF', quotation.quotation_id, filename, payload.createdBy || '');
  return { signedPdfUrl: signedPdfUrl, pdfUrl: signedPdfUrl };
}`;

appsScript = replaceOnce(
  appsScript,
  uploadPdfFunction,
  internalVerifiedFunction,
  "Apps Script signed-folder upload function",
);
fs.writeFileSync(appsScriptPath, appsScript, "utf8");

console.log("Internal verified PDFs now target the same Signed Drive folder as customer-signed PDFs.");
