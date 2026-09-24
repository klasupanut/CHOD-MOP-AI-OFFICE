import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = path.join(
  root,
  "quotation-app-dist",
  "assets",
  "index-HmUxnN6T.js",
);
const indexPath = path.join(root, "quotation-app-dist", "index.html");

let bundle = fs.readFileSync(bundlePath, "utf8");

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) {
    return source;
  }
  const matches = source.split(before).length - 1;
  if (matches !== 1) {
    throw new Error(`${label}: expected one source match, found ${matches}`);
  }
  return source.replace(before, after);
}

bundle = replaceOnce(
  bundle,
  ',x=[["SUB TOTAL",o.subTotal]',
  ',chodExternalNote=String(o.externalNote||"").trim(),chodCompactExternalNote=!!chodExternalNote&&chodExternalNote.split(/\\r?\\n/).length<=2&&chodExternalNote.length<=240,x=[["SUB TOTAL",o.subTotal]',
  "derive compact short-note state",
);

bundle = replaceOnce(
  bundle,
  'i.jsxs("div",{className:"flex min-h-[297mm] flex-col px-[13mm] py-[11mm]",children:[',
  'i.jsxs("div",{className:"flex min-h-[297mm] flex-col px-[13mm]",style:{paddingTop:chodCompactExternalNote?"7mm":"11mm",paddingBottom:chodCompactExternalNote?"7mm":"11mm"},children:[',
  "compact A4 page padding for short notes",
);

bundle = replaceOnce(
  bundle,
  'i.jsx("h1",{className:"my-5 text-center font-serif text-[30px] font-bold tracking-[0.06em] text-navy",children:"QUOTATION"})',
  'i.jsx("h1",{className:`${chodCompactExternalNote?"my-3":"my-5"} text-center font-serif text-[30px] font-bold tracking-[0.06em] text-navy`,children:"QUOTATION"})',
  "compact quotation title spacing for short notes",
);

bundle = replaceOnce(
  bundle,
  'i.jsxs("div",{className:"mb-5 space-y-1.5 text-[13px]",children:[',
  'i.jsxs("div",{className:`${chodCompactExternalNote?"mb-3":"mb-5"} space-y-1.5 text-[13px]`,children:[',
  "compact client detail spacing for short notes",
);

bundle = replaceOnce(
  bundle,
  'String(o.externalNote||"").trim()?i.jsxs("section",{"data-testid":"external-note",className:"mt-4 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-700",children:[i.jsx("div",{className:"mb-2 font-bold text-navy",children:"NOTE"}),i.jsx("div",{className:"break-words",style:{whiteSpace:"pre-wrap"},children:String(o.externalNote).trim()})]}):null',
  'chodExternalNote?i.jsxs("section",{"data-testid":"external-note","data-compact-note":chodCompactExternalNote?"true":"false",className:chodCompactExternalNote?"mt-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1 text-[10px] leading-tight text-slate-700":"mt-4 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-700",children:[i.jsx("div",{className:"font-bold text-navy",style:{marginBottom:chodCompactExternalNote?"1mm":"2mm"},children:"NOTE"}),i.jsx("div",{className:"break-words",style:{whiteSpace:"pre-wrap"},children:chodExternalNote})]}):null',
  "render compact short external note",
);

bundle = replaceOnce(
  bundle,
  '"data-testid":"signature-section",className:"mt-auto grid grid-cols-2 gap-[22mm] text-center text-[12px]",style:{paddingTop:"8mm",paddingBottom:"4mm"}',
  '"data-testid":"signature-section",className:"mt-auto grid grid-cols-2 gap-[22mm] text-center text-[12px]",style:{paddingTop:chodCompactExternalNote?"5mm":"8mm",paddingBottom:"4mm"}',
  "preserve a readable note-to-signature gap",
);

fs.writeFileSync(bundlePath, bundle);

const indexHtml = fs.readFileSync(indexPath, "utf8");
const updatedIndex = indexHtml.replace(
  /index-HmUxnN6T\.js\?v=[^"']+/,
  "index-HmUxnN6T.js?v=20260924-short-external-note-fit",
);
if (updatedIndex === indexHtml && !indexHtml.includes("20260924-short-external-note-fit")) {
  throw new Error("quotation cache key was not updated");
}
fs.writeFileSync(indexPath, updatedIndex);

console.log("Patched quotation PDF layout for short external notes.");
