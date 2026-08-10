import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = path.join(root, "quotation-app-dist", "assets", "index-HmUxnN6T.js");
const indexPath = path.join(root, "quotation-app-dist", "index.html");

const replaceOnce = (source, oldValue, newValue, label) => {
  const count = source.split(oldValue).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(oldValue, newValue);
};

let source = fs.readFileSync(bundlePath, "utf8");

const oldAggregate = 'const Rr=o=>o.reduce((f,u)=>({cost:f.cost+u.totalContractorCost,selling:f.selling+u.totalSellingAmount,profit:f.profit+u.totalGrossProfit}),{cost:0,selling:0,profit:0})';
const recognizedAggregate = 'const chodRevenueNumber=o=>{if(o===null||o===void 0||o==="")return void 0;const f=Number(o);return Number.isFinite(f)?f:void 0},chodRevenueFirst=(...o)=>{for(const f of o){const u=chodRevenueNumber(f);if(u!==void 0)return u}return 0},chodRevenueRound=o=>Math.round((o+Number.EPSILON)*100)/100,chodRestorationTitle=o=>{const f=String(o??"").normalize("NFKC").trim().toUpperCase().replace(/[^A-Z0-9]+/g," ").replace(/\\s+/g," ").trim();return f==="RESTORATION WORK"||f==="RESTORATION WORKS"},chodRecognizedQuotation=o=>{const f=Array.isArray(o.items)?o.items:[],u=new Set(f.filter(h=>String(h.itemType||"").trim().toLowerCase()==="title"&&chodRestorationTitle(h.description)).map(h=>String(h.itemId||"").trim()).filter(Boolean));let N=!1,v=!1,x=0,S=0,k=0,m=0;for(const h of f){if(String(h.itemType||"").trim().toLowerCase()==="title"){N=chodRestorationTitle(h.description),v=v||N;continue}const O=Math.max(0,chodRevenueFirst(h.projectSellingTotal,h.quotationTotal,h.sellingTotal)),z=Math.max(0,chodRevenueFirst(h.contractorTotalCost,chodRevenueFirst(h.quantity)*chodRevenueFirst(h.contractorUnitCost))),_=u.has(String(h.parentTitleId||"").trim())||N;x+=O,k+=z,_&&(S+=O,m+=z)}const h=Math.max(0,chodRevenueFirst(o.totalSellingAmount,o.totalAfterDiscount,o.totalAmount)),O=Math.max(0,chodRevenueFirst(o.totalContractorCost,k)),z=v&&x>0?Math.min(1,S/x):0,_=v&&k>0?Math.min(1,m/k):z,M=chodRevenueRound(h*z),J=chodRevenueRound(O*_),E=chodRevenueRound(Math.max(0,h-M)),Z=chodRevenueRound(Math.max(0,O-J));return{cost:Z,selling:E,profit:chodRevenueRound(E-Z),conditionalSelling:M,conditionalCost:J,hasConditionalRestoration:v}},Rr=o=>o.reduce((f,u)=>{const N=chodRecognizedQuotation(u);return{cost:f.cost+N.cost,selling:f.selling+N.selling,profit:f.profit+N.profit}},{cost:0,selling:0,profit:0})';
if (!source.includes("chodRecognizedQuotation=")) {
  source = replaceOnce(source, oldAggregate, recognizedAggregate, "recognized revenue aggregate");
}

const reportStart = source.indexOf("function Fp({quotations:o})");
const reportEnd = source.indexOf("function Qp(", reportStart);
if (reportStart < 0 || reportEnd < 0) throw new Error("Cost & Profit report section was not found");

let report = source.slice(reportStart, reportEnd);
if (!report.includes("const le=chodRecognizedQuotation(oe)")) {
  report = replaceOnce(
    report,
    "o.map(oe=>{const he=isCustomerSigned(oe)&&!isQuotationCancelled(oe);return",
    "o.map(oe=>{const he=isCustomerSigned(oe)&&!isQuotationCancelled(oe),le=chodRecognizedQuotation(oe);return",
    "report row recognized metrics",
  );
  report = replaceOnce(report, "he?me(oe.totalContractorCost):\"-\"", "he?me(le.cost):\"-\"", "report recognized cost");
  report = replaceOnce(report, "he?me(oe.totalSellingAmount):\"-\"", "he?me(le.selling):\"-\"", "report recognized selling");
  report = replaceOnce(report, "he?me(oe.totalGrossProfit):\"-\"", "he?me(le.profit):\"-\"", "report recognized profit");
  report = replaceOnce(report, "oe.averageMarkupPercent.toFixed(2)", "(le.cost>0?(le.selling-le.cost)/le.cost*100:0).toFixed(2)", "report recognized markup");
  report = replaceOnce(report, "oe.grossMarginPercent.toFixed(2)", "(le.selling>0?le.profit/le.selling*100:0).toFixed(2)", "report recognized margin");
}

report = report.replace(
  "Drafts and cancelled quotations are excluded. All values exclude VAT.",
  "Drafts and cancelled quotations are excluded. RESTORATION WORK categories are conditional and excluded from revenue, cost and profit recognition. All values exclude VAT.",
);
source = source.slice(0, reportStart) + report + source.slice(reportEnd);
source = source.replace(
  "Financial totals include Customer Signed quotations only.",
  "Financial totals include Customer Signed quotations only; conditional RESTORATION WORK categories are excluded.",
);

fs.writeFileSync(bundlePath, source, "utf8");

let indexHtml = fs.readFileSync(indexPath, "utf8");
indexHtml = indexHtml.replace(
  /index-HmUxnN6T\.js\?v=[A-Za-z0-9-]+/,
  "index-HmUxnN6T.js?v=20260810-restoration-revenue",
);
fs.writeFileSync(indexPath, indexHtml, "utf8");

console.log("Patched quotation revenue recognition and refreshed the asset cache key.");
