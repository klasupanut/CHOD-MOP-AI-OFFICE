import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const indexPath = resolve(root, "quotation-app-dist", "index.html");
let indexHtml = readFileSync(indexPath, "utf8");
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
  "revision helpers and internal PDF filename",
  '},dc=o=>o.trim().replace(/[\\\\/:?"<>|]/g,"-"),vp=o=>`${dc(o.quotationNo)}*${dc(o.client||"Client")}*${o.date}.pdf`,yp=',
  '},chodNormalizeRevision=o=>{const f=String(o||"").trim().toUpperCase(),u=f.match(/(?:REV[- ]?)?(\\d{1,3})$/),N=u?Number(u[1]):0;return Number.isInteger(N)&&N>0&&N<=999?`REV-${String(N).padStart(2,"0")}`:""},chodQuotationReference=(o,f=!0)=>{const u=String(o.quotationNo||"").trim(),N=chodNormalizeRevision(o.revision);return f&&N?`${u} ${N}`.trim():u},chodNextRevision=(o,f)=>{const u=String(f||"").trim().toUpperCase(),N=o.reduce((v,x)=>String(x.quotationNo||"").trim().toUpperCase()===u?Math.max(v,Number((chodNormalizeRevision(x.revision).match(/(\\d+)$/)||[])[1]||0)):v,0);return `REV-${String(N+1).padStart(2,"0")}`},dc=o=>o.trim().replace(/[\\\\/:?"<>|]/g,"-"),vp=o=>`${dc(chodQuotationReference(o,!0))}*${dc(o.client||"Client")}*${o.date}.pdf`,yp=',
);

replaceOnce(
  "internal verification revision filename",
  'const J=C.internalVerified?`${dc(f.quotationNo)}*${dc(f.client||"Client")}*${f.date}*INTERNAL_VERIFIED.pdf`:vp(f);',
  'const J=C.internalVerified?`${dc(chodQuotationReference(f,!0))}*${dc(f.client||"Client")}*${f.date}*INTERNAL_VERIFIED.pdf`:vp(f);',
);

replaceOnce(
  "customer signed revision filename",
  'filename:`${hc(f.quotationNo)}-${hc(f.client||"Client")}-${hc(f.date)}-SIGNED.pdf`',
  'filename:`${hc(chodQuotationReference(f,!0))}-${hc(f.client||"Client")}-${hc(f.date)}-SIGNED.pdf`',
);

replaceOnce(
  "new quotation revision defaults",
  'status:"Draft",pdfUrl:"",notesInternal:"",externalNote:"",createdAt:N,updatedAt:N,items:[v,x]',
  'status:"Draft",pdfUrl:"",notesInternal:"",externalNote:"",revision:"",showRevisionOnPdf:!1,createdAt:N,updatedAt:N,items:[v,x]',
);

replaceOnce(
  "duplicate as sequential revision",
  'Ye=V.useCallback(L=>{const $=jt("QUO"),G=Ar(),F=new Map(L.items.map(C=>[C.itemId,jt(C.itemType==="title"?"TITLE":"ITEM")])),U=It({...L,quotationId:$,quotationNo:eo(new Date(G).getFullYear(),m.map(C=>C.quotationNo),L.projectType),status:"Draft",pdfUrl:"",createdAt:G,updatedAt:G,items:L.items.map((C,b)=>({...C,itemId:F.get(C.itemId),quotationId:$,parentTitleId:C.parentTitleId?F.get(C.parentTitleId)??"":"",listNo:b+1}))});z(U),E(!0),f("new")},[m])',
  'Ye=V.useCallback(L=>{const $=jt("QUO"),G=Ar(),F=new Map(L.items.map(C=>[C.itemId,jt(C.itemType==="title"?"TITLE":"ITEM")])),U=It({...L,quotationId:$,quotationNo:L.quotationNo,revision:chodNextRevision(m,L.quotationNo),revisionSourceQuotationId:L.revisionSourceQuotationId||L.quotationId,showRevisionOnPdf:!0,status:"Draft",approvalStatus:"",internalApprovalStatus:"",approvalAt:"",approvalBy:"",approvalNote:"",approvalUpdatedAt:"",signingStatus:"",clientSigningStatus:"",signingToken:"",signingUrl:"",tokenExpiredAt:"",sentToClientAt:"",signedAt:"",signedByName:"",signedByEmail:"",signedPdfUrl:"",signingTokenStatus:"",internalVerifiedAt:"",signedPdfFilename:"",pdfUrl:"",createdAt:G,updatedAt:G,items:L.items.map((C,b)=>({...C,itemId:F.get(C.itemId),quotationId:$,parentTitleId:C.parentTitleId?F.get(C.parentTitleId)??"":"",listNo:b+1}))});z(U),E(!0),f("new")},[m])',
);

replaceOnce(
  "editor internal revision reference",
  '"data-testid":"editor-quotation-no",className:"mt-0.5 text-[11px] text-slate-400",children:o.quotationNo',
  '"data-testid":"editor-quotation-no",className:"mt-0.5 text-[11px] text-slate-400",children:chodQuotationReference(o,!0)',
);

replaceOnce(
  "quotation list internal revision reference",
  'i.jsx("td",{className:"px-4 py-4 font-semibold text-blue",children:h.quotationNo})',
  'i.jsx("td",{className:"whitespace-nowrap px-4 py-4 font-semibold text-blue",children:chodQuotationReference(h,!0)})',
);

replaceOnce(
  "recent quotation internal revision reference",
  'className:"ml-2 text-xs font-normal text-blue",children:x.quotationNo',
  'className:"ml-2 text-xs font-normal text-blue",children:chodQuotationReference(x,!0)',
);

replaceOnce(
  "quotation revision search",
  'const J=`${M.quotationNo} ${M.client} ${M.subject}`.toLowerCase();',
  'const J=`${chodQuotationReference(M,!0)} ${M.client} ${M.subject}`.toLowerCase();',
);

replaceOnce(
  "optional PDF revision reference",
  '"data-testid":"quote-no-value",className:"whitespace-nowrap text-left",children:o.quotationNo',
  '"data-testid":"quote-no-value",className:"whitespace-nowrap text-left",children:chodQuotationReference(o,o.showRevisionOnPdf===!0)',
);

replaceOnce(
  "revision PDF visibility toggle",
  'i.jsx("div",{children:i.jsx(Ip,{quotation:o,signatures:N,onChange:x})})]}),i.jsxs("label",{className:"mt-4 block",children:[i.jsx("span",{className:"field-label",children:"External Note (shown to client)"})',
  'i.jsx("div",{children:i.jsx(Ip,{quotation:o,signatures:N,onChange:x})})]}),chodNormalizeRevision(o.revision)?i.jsxs("label",{"data-testid":"show-revision-on-pdf",className:"mt-4 flex items-center gap-3 rounded-lg border border-blue/20 bg-blue/5 px-3 py-2.5",children:[i.jsx("input",{type:"checkbox",checked:o.showRevisionOnPdf===!0,onChange:J=>x({...o,showRevisionOnPdf:J.target.checked}),className:"h-4 w-4 accent-blue"}),i.jsxs("span",{className:"text-xs font-semibold text-navy",children:["Show ",chodNormalizeRevision(o.revision)," on quotation PDF"]})]}):null,i.jsxs("label",{className:"mt-4 block",children:[i.jsx("span",{className:"field-label",children:"External Note (shown to client)"})',
);

writeFileSync(assetPath, source, "utf8");

indexHtml = indexHtml.replace(
  new RegExp(`(/assets/${activeAsset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?:\\?[^"]*)?`),
  `$1?v=20260730-revision-workflow`,
);
writeFileSync(indexPath, indexHtml, "utf8");

console.log(`Patched ${activeAsset} with sequential quotation revisions.`);
