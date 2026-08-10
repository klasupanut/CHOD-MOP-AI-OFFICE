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
const recognizedAggregate = 'const chodRevenueNumber=o=>{if(o===null||o===void 0||o==="")return void 0;const f=Number(o);return Number.isFinite(f)?f:void 0},chodRevenueFirst=(...o)=>{for(const f of o){const u=chodRevenueNumber(f);if(u!==void 0)return u}return 0},chodRevenueRound=o=>Math.round((o+Number.EPSILON)*100)/100,chodRestorationTitle=o=>{const f=String(o??"").normalize("NFKC").trim().toUpperCase().replace(/[^A-Z0-9]+/g," ").replace(/\\s+/g," ").trim();return f==="RESTORATION WORK"||f==="RESTORATION WORKS"},chodRecognizedQuotation=o=>{const f=Array.isArray(o.items)?o.items:[],u=new Set(f.filter(h=>String(h.itemType||"").trim().toLowerCase()==="title"&&chodRestorationTitle(h.description)).map(h=>String(h.itemId||"").trim()).filter(Boolean));let N=!1,v=!1,x=0,S=0,k=0,m=0;for(const h of f){if(String(h.itemType||"").trim().toLowerCase()==="title"){N=chodRestorationTitle(h.description),v=v||N;continue}const O=Math.max(0,chodRevenueFirst(h.projectSellingTotal,h.quotationTotal,h.sellingTotal)),z=Math.max(0,chodRevenueFirst(h.contractorTotalCost,chodRevenueFirst(h.quantity)*chodRevenueFirst(h.contractorUnitCost))),_=u.has(String(h.parentTitleId||"").trim())||N;x+=O,k+=z,_&&(S+=O,m+=z)}const h=Math.max(0,chodRevenueFirst(o.totalSellingAmount,o.totalAfterDiscount,o.totalAmount)),O=Math.max(0,chodRevenueFirst(o.totalContractorCost,k)),z=v&&x>0?Math.min(1,S/x):0,_=v&&k>0?Math.min(1,m/k):z,M=chodRevenueRound(h*z),J=chodRevenueRound(O*_),E=chodRevenueRound(Math.max(0,h-M)),Z=chodRevenueRound(Math.max(0,O-J));return{cost:Z,selling:E,profit:chodRevenueRound(E-Z),conditionalSelling:M,conditionalCost:J,hasConditionalRestoration:v}},Rr=o=>o.reduce((f,u)=>{const N=chodRecognizedQuotation(u);return{cost:f.cost+N.cost,selling:f.selling+N.selling,profit:f.profit+N.profit,conditionalSelling:f.conditionalSelling+N.conditionalSelling}},{cost:0,selling:0,profit:0,conditionalSelling:0})';
if (!source.includes("chodRecognizedQuotation=")) {
  source = replaceOnce(source, oldAggregate, recognizedAggregate, "recognized revenue aggregate");
}

const oldRecognizedSum = 'Rr=o=>o.reduce((f,u)=>{const N=chodRecognizedQuotation(u);return{cost:f.cost+N.cost,selling:f.selling+N.selling,profit:f.profit+N.profit}},{cost:0,selling:0,profit:0})';
const recognizedSumWithConditional = 'Rr=o=>o.reduce((f,u)=>{const N=chodRecognizedQuotation(u);return{cost:f.cost+N.cost,selling:f.selling+N.selling,profit:f.profit+N.profit,conditionalSelling:f.conditionalSelling+N.conditionalSelling}},{cost:0,selling:0,profit:0,conditionalSelling:0})';
if (source.includes(oldRecognizedSum)) {
  source = replaceOnce(source, oldRecognizedSum, recognizedSumWithConditional, "conditional restoration aggregate");
}

source = source.replace(
  'const parentTitleId=String(h.parentTitleId||"").trim(),_=u.has(parentTitleId)||N;',
  'const parentTitleId=String(h.parentTitleId||"").trim(),_=parentTitleId?u.has(parentTitleId):N;',
);
source = source.replace(
  '_=u.has(String(h.parentTitleId||"").trim())||N;',
  '_=String(h.parentTitleId||"").trim()?u.has(String(h.parentTitleId||"").trim()):N;',
);

const reportStart = source.indexOf("function Fp({quotations:o})");
const reportEnd = source.indexOf("function Qp(", reportStart);
if (reportStart < 0 || reportEnd < 0) throw new Error("Cost & Profit report section was not found");

let report = source.slice(reportStart, reportEnd);
if (!report.includes("le=chodRecognizedQuotation(oe)")) {
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

if (!report.includes("chodValueComparisonRows=")) {
  report = replaceOnce(
    report,
    'J=[{status:"Internal Approved / Not Signed",value:h.selling,color:"#f59e0b",className:"bg-orange"},{status:"Customer Signed",value:k.selling,color:"#16a34a",className:"bg-success"}];let E=0;',
    'J=[{status:"Internal Approved / Not Signed",value:h.selling,color:"#f59e0b",className:"bg-orange"},{status:"Customer Signed",value:k.selling,color:"#16a34a",className:"bg-success"}],chodRestorationWorkValue=Rr(qActive).conditionalSelling,chodValueComparisonRows=[...J,{status:"RESTORATION WORK (Excluded)",value:chodRestorationWorkValue,color:"#dc2626",className:"bg-red-600"}];let E=0;',
    "restoration work comparison row",
  );
  report = replaceOnce(
    report,
    "ae=Math.max(1,...J.map(oe=>oe.value))",
    "ae=Math.max(1,...chodValueComparisonRows.map(oe=>oe.value))",
    "comparison chart maximum",
  );
  report = replaceOnce(
    report,
    'i.jsx("div",{"data-testid":"status-bar-chart",className:"mt-6 space-y-4",children:J.map(oe=>',
    'i.jsx("div",{"data-testid":"status-bar-chart",className:"mt-6 space-y-4",children:chodValueComparisonRows.map(oe=>',
    "comparison chart data rows",
  );
}


const oldComparison = 'x=qActive.filter(E=>E.status==="Approved"),S=qActive.filter(isCustomerSigned),k=Rr(S),m=qActive.filter(E=>E.status==="Approved"&&!isCustomerSigned(E)),h=Rr(m),O=qActive.filter(E=>!isCustomerSigned(E)&&E.status!=="Draft"),z=Rr(O),_=v.selling>0?k.selling/v.selling*100:0,M=k.selling>0?k.profit/k.selling*100:0,J=[{status:"Internal Approved / Not Signed",value:h.selling,color:"#f59e0b",className:"bg-orange"},{status:"Customer Signed",value:k.selling,color:"#16a34a",className:"bg-success"}],chodRestorationWorkValue=Rr(qActive).conditionalSelling,chodValueComparisonRows=[...J,{status:"RESTORATION WORK (Excluded)",value:chodRestorationWorkValue,color:"#dc2626",className:"bg-red-600"}]';
const newComparison = 'isInternalApproved=E=>[E.status,E.approvalStatus,E.internalApprovalStatus].some(oe=>["APPROVED","INTERNAL_APPROVED","INTERNALLY_APPROVED"].includes(String(oe||"").trim().toUpperCase().replace(/[\\s-]+/g,"_"))),x=N.filter(isInternalApproved),S=N.filter(isCustomerSigned),k=Rr(S),m=N.filter(E=>isInternalApproved(E)&&!isCustomerSigned(E)),h=Rr(m),customerApprovedQuotations=N.filter(E=>isInternalApproved(E)||isCustomerSigned(E)),customerApprovedTotals=Rr(customerApprovedQuotations),O=N.filter(E=>!isInternalApproved(E)&&!isCustomerSigned(E)),z=Rr(O),_=v.selling>0?k.selling/v.selling*100:0,M=k.selling>0?k.profit/k.selling*100:0,J=[{status:"Internal Approved / Not Signed",value:h.selling,color:"#f59e0b",className:"bg-orange"},{status:"Customer Signed",value:k.selling,color:"#16a34a",className:"bg-success"}],chodRestorationWorkValue=Rr(N).conditionalSelling,chodValueComparisonRows=[{status:"Total Quoted Value",value:v.selling,color:"#2563eb",className:"bg-blue"},{status:"Customer Approved",value:customerApprovedTotals.selling,color:"#16a34a",className:"bg-success"},{status:"RESTORATION WORK",value:chodRestorationWorkValue,color:"#dc2626",className:"bg-red-600"}]';
if (report.includes(oldComparison)) {
  report = replaceOnce(report, oldComparison, newComparison, "value comparison metrics");
}

const currentComparison = 'isInternalApproved=E=>[E.status,E.approvalStatus,E.internalApprovalStatus].some(oe=>["APPROVED","INTERNAL_APPROVED","INTERNALLY_APPROVED"].includes(String(oe||"").trim().toUpperCase().replace(/[\\s-]+/g,"_"))),x=N.filter(isInternalApproved),S=N.filter(isCustomerSigned),k=Rr(S),m=N.filter(E=>isInternalApproved(E)&&!isCustomerSigned(E)),h=Rr(m),customerApprovedQuotations=N.filter(E=>isInternalApproved(E)||isCustomerSigned(E)),customerApprovedTotals=Rr(customerApprovedQuotations),O=N.filter(E=>!isInternalApproved(E)&&!isCustomerSigned(E)),z=Rr(O),_=v.selling>0?k.selling/v.selling*100:0,M=k.selling>0?k.profit/k.selling*100:0,J=[{status:"Internal Approved / Not Signed",value:h.selling,color:"#f59e0b",className:"bg-orange"},{status:"Customer Signed",value:k.selling,color:"#16a34a",className:"bg-success"}],chodRestorationWorkValue=Rr(N).conditionalSelling,chodValueComparisonRows=[{status:"Total Quoted Value",value:v.selling,color:"#2563eb",className:"bg-blue"},{status:"Customer Approved",value:customerApprovedTotals.selling,color:"#16a34a",className:"bg-success"},{status:"RESTORATION WORK",value:chodRestorationWorkValue,color:"#dc2626",className:"bg-red-600"}]';
const correctedComparison = 'isInternalApproved=E=>[E.status,E.approvalStatus,E.internalApprovalStatus].some(oe=>["APPROVED","INTERNAL_APPROVED","INTERNALLY_APPROVED"].includes(String(oe||"").trim().toUpperCase().replace(/[\\s-]+/g,"_"))),x=N.filter(isInternalApproved),internalApprovedTotals=Rr(x),S=N.filter(isCustomerSigned),k=Rr(S),m=N.filter(E=>isInternalApproved(E)&&!isCustomerSigned(E)),h=Rr(m),O=N.filter(E=>!isInternalApproved(E)&&!isCustomerSigned(E)),z=Rr(O),_=v.selling>0?k.selling/v.selling*100:0,M=k.selling>0?k.profit/k.selling*100:0,approvalComparisonRows=[{status:"Internal Approved",value:internalApprovedTotals.selling,color:"#2563eb",className:"bg-blue"},{status:"Customer Signed / Internal Verified",value:k.selling,color:"#16a34a",className:"bg-success"},{status:"Waiting Customer Signature",value:h.selling,color:"#f59e0b",className:"bg-orange"}],chodRestorationWorkValue=Rr(N).conditionalSelling,chodValueComparisonRows=[{status:"Total Quoted Value",value:v.selling,color:"#2563eb",className:"bg-blue"},{status:"Customer Approved",value:k.selling,color:"#16a34a",className:"bg-success"},{status:"RESTORATION WORK",value:chodRestorationWorkValue,color:"#dc2626",className:"bg-red-600"}]';
if (report.includes(currentComparison)) {
  report = replaceOnce(report, currentComparison, correctedComparison, "signed customer approved metrics");
}

const oldApprovalChartSetup = 'let E=0;const Z=J.map(oe=>{const he=E,le=v.selling>0?oe.value/v.selling*100:0;return E+=le,`${oe.color} ${he}% ${E}%`}),ee=v.selling>0?`conic-gradient(${Z.join(", ")})`:"#e2e8f0",ae=Math.max(1,...chodValueComparisonRows.map(oe=>oe.value))';
const newApprovalChartSetup = 'const approvalComparisonMax=Math.max(1,...approvalComparisonRows.map(oe=>oe.value)),ae=Math.max(1,...chodValueComparisonRows.map(oe=>oe.value))';
if (report.includes(oldApprovalChartSetup)) {
  report = replaceOnce(report, oldApprovalChartSetup, newApprovalChartSetup, "approval bar chart setup");
}

const oldApprovalDonut = 'i.jsxs("section",{className:"panel p-5",children:[i.jsx("h2",{className:"font-bold text-navy",children:"Internal Approved vs Customer Signed"}),i.jsxs("div",{className:"mt-5 flex items-center gap-6",children:[i.jsx("div",{"data-testid":"status-donut-chart",className:"relative shrink-0 rounded-full",style:{background:ee,width:144,height:144},children:i.jsxs("div",{className:"absolute inset-7 flex flex-col items-center justify-center rounded-full bg-white",children:[i.jsx("span",{className:"text-[10px] uppercase text-slate-400",children:"Signed"}),i.jsxs("strong",{className:"mt-1 text-sm text-navy",children:["เธฟ",me(k.selling,0)]})]})}),i.jsx("div",{className:"min-w-0 flex-1 space-y-3",children:J.map(oe=>i.jsx("div",{children:i.jsxs("div",{className:"flex items-center gap-2 text-xs",children:[i.jsx("span",{className:"h-2.5 w-2.5 rounded-full",style:{backgroundColor:oe.color}}),i.jsx("span",{className:"text-slate-500",children:oe.status}),i.jsxs("strong",{className:"ml-auto text-navy",children:["เธฟ",me(oe.value)]})]})},oe.status))})]})]})';
const newApprovalBars = 'i.jsxs("section",{className:"panel p-5",children:[i.jsx("h2",{className:"font-bold text-navy",children:"Internal Approved vs Customer Signed"}),i.jsx("p",{className:"mt-1 text-[11px] text-slate-400",children:"Signed includes customer e-signature and internal verification of an existing hard copy."}),i.jsx("div",{"data-testid":"approval-status-bar-chart",className:"mt-5 space-y-4",children:approvalComparisonRows.map(oe=>i.jsxs("div",{children:[i.jsxs("div",{className:"flex items-center gap-3 text-xs",children:[i.jsx("span",{className:"min-w-0 flex-1 text-slate-500",children:oe.status}),i.jsxs("strong",{className:"shrink-0 text-navy",children:["เธฟ",me(oe.value)]})]}),i.jsx("div",{className:"mt-2 overflow-hidden rounded-full bg-slate-100",style:{height:12},children:i.jsx("div",{className:`h-full rounded-full transition-all ${oe.className}`,style:{backgroundColor:oe.color,width:oe.value>0?`${Math.max(2,oe.value/approvalComparisonMax*100)}%`:"0%"}})})]},oe.status))})]})';
if (report.includes(oldApprovalDonut)) {
  report = replaceOnce(report, oldApprovalDonut, newApprovalBars, "approval donut to bar chart");
}
if (report.includes('data-testid":"status-donut-chart"')) {
  const approvalTitle = 'i.jsx("h2",{className:"font-bold text-navy",children:"Internal Approved vs Customer Signed"})';
  const valueTitle = 'i.jsx("h2",{className:"font-bold text-navy",children:"Value Comparison"})';
  const approvalTitleIndex = report.indexOf(approvalTitle);
  const valueTitleIndex = report.indexOf(valueTitle, approvalTitleIndex);
  const approvalSectionStart = report.lastIndexOf('i.jsxs("section",{', approvalTitleIndex);
  const valueSectionStart = report.lastIndexOf('i.jsxs("section",{', valueTitleIndex);
  if (approvalSectionStart < 0 || valueSectionStart <= approvalSectionStart) {
    throw new Error("approval donut section boundaries were not found");
  }
  report = `${report.slice(0, approvalSectionStart)}${newApprovalBars},${report.slice(valueSectionStart)}`;
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
  "index-HmUxnN6T.js?v=20260810-approval-bars-fix",
);
fs.writeFileSync(indexPath, indexHtml, "utf8");

console.log("Patched quotation revenue recognition and refreshed the asset cache key.");
