import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const indexPath = path.join(projectRoot, "quotation-app-dist", "index.html");

const indexHtml = fs.readFileSync(indexPath, "utf8");
const assetMatch = indexHtml.match(/\/assets\/(index-[A-Za-z0-9_-]+\.js)/);
if (!assetMatch) {
  throw new Error("Active quotation JavaScript asset was not found.");
}

const assetPath = path.join(projectRoot, "quotation-app-dist", "assets", assetMatch[1]);
let bundle = fs.readFileSync(assetPath, "utf8");

const persistenceMarker = "Edit a row, then press Save to update Google Sheets.";
if (!bundle.includes(persistenceMarker)) {
  const componentPattern = /function Up\(\{templates:o,onChange:f\}\)\{.*?\}const Rr=/;
  const componentReplacement = `function Up({templates:o,onChange:f,onSave:u}){const[N,v]=V.useState(null),[x,S]=V.useState(null),k=()=>{S(null),f([...o,{templateId:jt("TPL"),category:"General fit-out work",description:"",unit:"LS",defaultContractorUnitCost:0,defaultMarkupPercent:10,isActive:!0}])},m=(h,O,z)=>{S(null),f(o.map((_,M)=>M===h?{..._,[O]:["defaultContractorUnitCost","defaultMarkupPercent"].includes(O)?Number(z):z}:_))},h=async O=>{v(O.templateId),S(null);try{await u(O),S({type:"success",text:"Saved "+(O.description.trim()||O.category)+" to Google Sheets."})}catch(z){S({type:"error",text:z instanceof Error?z.message:"Template save failed."})}finally{v(null)}};return i.jsxs("div",{className:"p-6",children:[i.jsxs("div",{className:"mb-6 flex flex-wrap items-end justify-between gap-3",children:[i.jsxs("div",{children:[i.jsx("h1",{className:"text-2xl font-bold text-navy",children:"Work Templates"}),i.jsx("p",{className:"mt-1 text-sm text-slate-500",children:"Edit a row, then press Save to update Google Sheets."}),x?i.jsx("p",{className:"mt-2 text-xs font-semibold "+(x.type==="success"?"text-emerald-600":"text-red-600"),role:"status",children:x.text}):null]}),i.jsxs("button",{type:"button",onClick:k,className:"flex h-10 items-center gap-2 rounded-lg bg-blue px-4 text-xs font-semibold text-white",children:[i.jsx(ql,{size:16})," Add Template"]})]}),i.jsx("div",{className:"panel overflow-x-auto",children:i.jsxs("table",{className:"min-w-[980px] w-full text-xs",children:[i.jsx("thead",{className:"bg-slate-50 text-left text-[10px] uppercase text-slate-500",children:i.jsx("tr",{children:["Category","Description","Unit","Contractor Unit Cost","Markup %","Active","Actions"].map(O=>i.jsx("th",{className:"px-3 py-3",children:O},O))})}),i.jsx("tbody",{children:o.map((O,z)=>i.jsxs("tr",{className:"border-t border-slate-100",children:[["category","description","unit","defaultContractorUnitCost","defaultMarkupPercent"].map(_=>i.jsx("td",{className:"p-2",children:i.jsx("input",{className:"field-input !h-9",type:typeof O[_]==="number"?"number":"text",value:String(O[_]),onChange:M=>m(z,_,M.target.value)})},_)),i.jsx("td",{className:"px-3",children:i.jsx("input",{type:"checkbox",checked:O.isActive,onChange:_=>m(z,"isActive",_.target.checked)})}),i.jsx("td",{className:"px-2",children:i.jsxs("div",{className:"flex items-center gap-2",children:[i.jsx("button",{type:"button",className:"h-9 rounded-lg bg-blue px-3 font-semibold text-white disabled:cursor-wait disabled:opacity-60",disabled:N!==null,onClick:()=>void h(O),children:N===O.templateId?"Saving...":"Save"}),i.jsx("button",{type:"button",title:"Remove local template row",className:"rounded p-2 text-red-500 hover:bg-red-50",onClick:()=>f(o.filter((_,M)=>M!==z)),children:i.jsx(Kl,{size:15})})]})})]},O.templateId))})]})})]})}const Rr=`;

  if (!componentPattern.test(bundle)) {
    throw new Error("Quotation template component signature changed; patch was not applied.");
  }
  bundle = bundle.replace(componentPattern, componentReplacement);

  const renderMarker = "templates:i.jsx(Up,{templates:v,onChange:L=>{x(L),pe.setTemplates(L)}})";
  const renderReplacement = 'templates:i.jsx(Up,{templates:v,onChange:L=>{x(L),pe.setTemplates(L)},onSave:async L=>{if(!Ut())return M("Template saved locally - Google sync unavailable"),L;M("Saving template to Google Sheets...");try{const $=await Ke.saveTemplate(L);return x(G=>{const W=G.some(H=>H.templateId===$.templateId)?G.map(H=>H.templateId===$.templateId?$:H):[...G,$];return pe.setTemplates(W),W}),M("Template saved to Google Sheets"),$}catch($){throw M($ instanceof Error&&$.message==="SESSION_EXPIRED"?"Session expired - sign in again":"Template save failed"),$}}})';
  if (!bundle.includes(renderMarker)) {
    throw new Error("Quotation template render signature changed; patch was not applied.");
  }
  bundle = bundle.replace(renderMarker, renderReplacement);
  fs.writeFileSync(assetPath, bundle, "utf8");
}

const cacheVersion = "20260717-template-save-sync";
const updatedIndex = indexHtml.replace(
  /(\/assets\/index-[A-Za-z0-9_-]+\.js)(?:\?v=[^"']*)?/,
  `$1?v=${cacheVersion}`,
);
fs.writeFileSync(indexPath, updatedIndex, "utf8");

console.log(`Template persistence patch verified: ${path.basename(assetPath)}`);
