import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const indexPath = resolve(root, "quotation-app-dist", "index.html");
const indexHtml = readFileSync(indexPath, "utf8");
const activeAsset = indexHtml.match(/<script[^>]+src="\/assets\/(index-[^"?]+\.js)/)?.[1];

if (!activeAsset) {
  throw new Error("Unable to identify the active quotation JavaScript asset.");
}

const assetPath = resolve(root, "quotation-app-dist", "assets", activeAsset);
let source = readFileSync(assetPath, "utf8");

function replaceOnce(label, before, after) {
  if (source.includes(after)) return;
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing ${label} anchor in ${activeAsset}.`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Found duplicate ${label} anchors in ${activeAsset}.`);
  }
  source = source.replace(before, after);
}

replaceOnce(
  "new quotation external note default",
  'status:"Draft",pdfUrl:"",notesInternal:"",createdAt:N,updatedAt:N,items:[v,x]',
  'status:"Draft",pdfUrl:"",notesInternal:"",externalNote:"",createdAt:N,updatedAt:N,items:[v,x]',
);

replaceOnce(
  "external note editor",
  'i.jsxs("label",{className:"mt-4 block",children:[i.jsx("span",{className:"field-label",children:"Internal Notes (never shown on PDF)"}),i.jsx("textarea",{className:"field-input min-h-20 resize-y py-2",value:o.notesInternal,onChange:J=>x({...o,notesInternal:J.target.value})})]}),i.jsx(fp,{quotation:o})',
  'i.jsxs("label",{className:"mt-4 block",children:[i.jsx("span",{className:"field-label",children:"External Note (shown to client)"}),i.jsx("textarea",{"aria-label":"External Note",className:"field-input min-h-20 resize-y py-2",value:o.externalNote||"",placeholder:"Optional note displayed on the quotation and customer PDF",onChange:J=>x({...o,externalNote:J.target.value})}),i.jsx("span",{className:"mt-1 block text-[10px] text-slate-400",children:"Leave blank to hide this section from the quotation."})]}),i.jsxs("label",{className:"mt-4 block",children:[i.jsx("span",{className:"field-label",children:"Internal Notes (never shown on PDF)"}),i.jsx("textarea",{className:"field-input min-h-20 resize-y py-2",value:o.notesInternal,onChange:J=>x({...o,notesInternal:J.target.value})})]}),i.jsx(fp,{quotation:o})',
);

replaceOnce(
  "external note length guard",
  '"aria-label":"External Note",className:"field-input min-h-20 resize-y py-2",value:o.externalNote||""',
  '"aria-label":"External Note",className:"field-input min-h-20 resize-y py-2",maxLength:2e3,value:o.externalNote||""',
);

replaceOnce(
  "conditional external note preview",
  'i.jsx("td",{"data-testid":"grand-total-value",className:"border-y border-slate-700 px-2 py-2 text-right text-[13px]",children:me(o.grandTotal)})]})]})]}),i.jsxs("div",{"data-testid":"signature-section"',
  'i.jsx("td",{"data-testid":"grand-total-value",className:"border-y border-slate-700 px-2 py-2 text-right text-[13px]",children:me(o.grandTotal)})]})]})]}),String(o.externalNote||"").trim()?i.jsxs("section",{"data-testid":"external-note",className:"mt-4 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-700",children:[i.jsx("div",{className:"mb-2 font-bold text-navy",children:"NOTE"}),i.jsx("div",{className:"break-words",style:{whiteSpace:"pre-wrap"},children:String(o.externalNote).trim()})]}):null,i.jsxs("div",{"data-testid":"signature-section"',
);

writeFileSync(assetPath, source, "utf8");
console.log(`Patched ${activeAsset} with optional customer-facing External Note support.`);
