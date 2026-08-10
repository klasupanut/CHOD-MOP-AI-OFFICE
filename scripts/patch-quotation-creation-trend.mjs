import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const indexPath = path.join(root, "quotation-app-dist", "index.html");
const indexHtml = fs.readFileSync(indexPath, "utf8");
const assetMatch = indexHtml.match(/\/assets\/(index-[^?"']+\.js)/);
if (!assetMatch) throw new Error("Active quotation JavaScript asset was not found.");

const bundlePath = path.join(root, "quotation-app-dist", "assets", assetMatch[1]);
let source = fs.readFileSync(bundlePath, "utf8");

const alignmentRepairs = [
  [
    "x:trendData.length>1?18+u/(trendData.length-1)*284:160",
    'x:trendMode==="year"?18+(u+.5)*(284/trendData.length):trendData.length>1?18+u/(trendData.length-1)*284:160',
  ],
  [
    "x:18+f.index*u+(u-N)/2",
    "x:f.x-N/2",
  ],
];
let repairedExistingTrend = false;
for (const [before, after] of alignmentRepairs) {
  if (source.includes(before)) {
    source = source.replace(before, after);
    repairedExistingTrend = true;
  }
}

if (source.includes('data-testid":"quotation-creation-trend"')) {
  if (repairedExistingTrend) fs.writeFileSync(bundlePath, source, "utf8");
  console.log("Quotation creation trend is already installed.");
  process.exit(0);
}

const component = String.raw`function chodQuotationTrendDate(o){const f=String((o&&o.createdAt)||(o&&o.date)||(o&&o.updatedAt)||"").trim();if(!f)return null;const u=/^\d{4}-\d{2}-\d{2}$/.test(f)?new Date(f+"T12:00:00"):new Date(f);return Number.isNaN(u.getTime())?null:u}const chodQuotationTrendMonths=["January","February","March","April","May","June","July","August","September","October","November","December"],chodQuotationTrendShortMonths=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];function QuotationCreationTrend({quotations:o}){const trendDates=V.useMemo(()=>o.map(chodQuotationTrendDate).filter(Boolean),[o]),latestTrendDate=V.useMemo(()=>trendDates.length?new Date(Math.max(...trendDates.map(f=>f.getTime()))):new Date,[trendDates]),[trendMode,setTrendMode]=V.useState("month"),[trendYear,setTrendYear]=V.useState(()=>latestTrendDate.getFullYear()),[trendMonth,setTrendMonth]=V.useState(()=>latestTrendDate.getMonth()),[hoveredTrendIndex,setHoveredTrendIndex]=V.useState(null),trendAutoSelected=V.useRef(!1),latestTrendTimestamp=latestTrendDate.getTime();V.useEffect(()=>{trendAutoSelected.current||!trendDates.length||(setTrendYear(latestTrendDate.getFullYear()),setTrendMonth(latestTrendDate.getMonth()),trendAutoSelected.current=!0)},[latestTrendTimestamp,trendDates.length]);const trendYears=V.useMemo(()=>Array.from(new Set([...trendDates.map(f=>f.getFullYear()),trendYear,new Date().getFullYear()])).sort((f,u)=>u-f),[trendDates,trendYear]),trendData=V.useMemo(()=>{if(trendMode==="year")return chodQuotationTrendShortMonths.map((f,u)=>({label:f,tooltip:chodQuotationTrendMonths[u]+" "+trendYear,count:trendDates.filter(N=>N.getFullYear()===trendYear&&N.getMonth()===u).length}));const f=new Date(trendYear,trendMonth+1,0).getDate();return Array.from({length:f},(u,N)=>({label:String(N+1),tooltip:String(N+1)+" "+chodQuotationTrendShortMonths[trendMonth]+" "+trendYear,count:trendDates.filter(v=>v.getFullYear()===trendYear&&v.getMonth()===trendMonth&&v.getDate()===N+1).length}))},[trendDates,trendMode,trendYear,trendMonth]),trendMax=Math.max(1,...trendData.map(f=>f.count)),trendTotal=trendData.reduce((f,u)=>f+u.count,0),trendPeak=Math.max(0,...trendData.map(f=>f.count)),trendAverage=trendData.length?trendTotal/trendData.length:0,trendPoints=trendData.map((f,u)=>({ ...f,index:u,x:trendData.length>1?18+u/(trendData.length-1)*284:160,y:145-f.count/trendMax*112})),trendLinePath=trendPoints.map((f,u)=>(u?"L":"M")+f.x.toFixed(2)+","+f.y.toFixed(2)).join(" "),trendAreaPath=trendLinePath+" L302,145 L18,145 Z",hoveredTrendPoint=hoveredTrendIndex===null?null:trendPoints[hoveredTrendIndex],trendPeriod=trendMode==="month"?chodQuotationTrendMonths[trendMonth]+" "+trendYear:"Year "+trendYear,trendMetricLabel=trendMode==="month"?"PEAK / DAY":"PEAK / MONTH";return i.jsxs("section",{"data-testid":"quotation-creation-trend",className:"panel p-5",children:[i.jsxs("div",{className:"flex items-start justify-between gap-3",children:[i.jsxs("div",{className:"min-w-0",children:[i.jsx("h2",{className:"font-bold text-navy",children:"Quotation Creation Trend"}),i.jsxs("p",{className:"mt-1 text-[11px] text-slate-400",children:["Created quotation frequency · ",trendPeriod]})]}),i.jsxs("div",{className:"flex shrink-0 items-center",style:{padding:3,border:"1px solid #d9e4ee",borderRadius:999,background:"#eef3f8"},children:[i.jsx("button",{type:"button","data-testid":"quotation-trend-month",onClick:()=>{setTrendMode("month"),setHoveredTrendIndex(null)},style:{height:28,minWidth:58,padding:"0 10px",border:0,borderRadius:999,background:trendMode==="month"?"#0a7f99":"transparent",color:trendMode==="month"?"#fff":"#718096",fontSize:10,fontWeight:800,cursor:"pointer"},children:"MONTH"}),i.jsx("button",{type:"button","data-testid":"quotation-trend-year",onClick:()=>{setTrendMode("year"),setHoveredTrendIndex(null)},style:{height:28,minWidth:52,padding:"0 10px",border:0,borderRadius:999,background:trendMode==="year"?"#0a7f99":"transparent",color:trendMode==="year"?"#fff":"#718096",fontSize:10,fontWeight:800,cursor:"pointer"},children:"YEAR"})]})]}),i.jsxs("div",{className:"mt-3 flex items-center gap-2",children:[trendMode==="month"?i.jsx("select",{"aria-label":"Quotation trend month",value:trendMonth,onChange:f=>{setTrendMonth(Number(f.target.value)),setHoveredTrendIndex(null)},style:{height:32,flex:1,border:"1px solid #d9e4ee",borderRadius:8,background:"#fff",padding:"0 9px",color:"#0b1b35",fontSize:11,fontWeight:700},children:chodQuotationTrendMonths.map((f,u)=>i.jsx("option",{value:u,children:f},f))}):i.jsx("div",{style:{height:32,flex:1,display:"flex",alignItems:"center",padding:"0 10px",border:"1px solid #e5ebf2",borderRadius:8,background:"#f7f9fc",color:"#718096",fontSize:11,fontWeight:700},children:"January – December"}),i.jsx("select",{"aria-label":"Quotation trend year",value:trendYear,onChange:f=>{setTrendYear(Number(f.target.value)),setHoveredTrendIndex(null)},style:{height:32,width:86,border:"1px solid #d9e4ee",borderRadius:8,background:"#fff",padding:"0 9px",color:"#0b1b35",fontSize:11,fontWeight:700},children:trendYears.map(f=>i.jsx("option",{value:f,children:f},f))})]}),i.jsxs("svg",{"data-testid":"quotation-creation-graph",viewBox:"0 0 320 180",className:"mt-3 w-full",role:"img","aria-label":"Quotation creation frequency for "+trendPeriod,children:[i.jsxs("defs",{children:[i.jsxs("linearGradient",{id:"chodQuotationTrendArea",x1:"0",y1:"0",x2:"0",y2:"1",children:[i.jsx("stop",{offset:"0%",stopColor:"#24c8dc",stopOpacity:.42}),i.jsx("stop",{offset:"100%",stopColor:"#24c8dc",stopOpacity:.03})]}),i.jsxs("linearGradient",{id:"chodQuotationTrendBars",x1:"0",y1:"0",x2:"0",y2:"1",children:[i.jsx("stop",{offset:"0%",stopColor:"#16c4d9"}),i.jsx("stop",{offset:"100%",stopColor:"#08789e"})]})]}),Array.from({length:5},(f,u)=>i.jsx("line",{x1:18,y1:33+u*28,x2:302,y2:33+u*28,stroke:"#e8eef5",strokeWidth:1},u)),trendMode==="month"?i.jsxs("g",{children:[i.jsx("path",{d:trendAreaPath,fill:"url(#chodQuotationTrendArea)"}),i.jsx("path",{d:trendLinePath,fill:"none",stroke:"#0797b6",strokeWidth:3,strokeLinecap:"round",strokeLinejoin:"round"}),trendPoints.map(f=>i.jsxs("g",{children:[f.count>0?i.jsx("circle",{cx:f.x,cy:f.y,r:3.2,fill:"#fff",stroke:"#0797b6",strokeWidth:2}):null,i.jsx("circle",{cx:f.x,cy:f.y,r:8,fill:"transparent",tabIndex:0,role:"img","aria-label":f.tooltip+": "+f.count+" quotations",style:{cursor:"crosshair"},onMouseEnter:()=>setHoveredTrendIndex(f.index),onMouseLeave:()=>setHoveredTrendIndex(null),onFocus:()=>setHoveredTrendIndex(f.index),onBlur:()=>setHoveredTrendIndex(null)})]},f.index))]}):i.jsx("g",{children:trendPoints.map(f=>{const u=284/trendPoints.length,N=Math.max(12,u*.58),v=145-f.y;return i.jsx("rect",{x:18+f.index*u+(u-N)/2,y:f.y,width:N,height:v,rx:5,fill:"url(#chodQuotationTrendBars)",tabIndex:0,role:"img","aria-label":f.tooltip+": "+f.count+" quotations",style:{cursor:"crosshair"},onMouseEnter:()=>setHoveredTrendIndex(f.index),onMouseLeave:()=>setHoveredTrendIndex(null),onFocus:()=>setHoveredTrendIndex(f.index),onBlur:()=>setHoveredTrendIndex(null)},f.index)})}),trendPoints.map(f=>trendMode==="year"||f.index===0||(f.index+1)%5===0||f.index===trendPoints.length-1?i.jsx("text",{x:f.x,y:166,textAnchor:"middle",fill:"#8997aa",fontSize:trendMode==="year"?7.5:8.5,fontWeight:700,children:f.label},"label-"+f.index):null),hoveredTrendPoint?i.jsxs("g",{transform:"translate("+Math.max(2,Math.min(202,hoveredTrendPoint.x-58))+","+Math.max(2,hoveredTrendPoint.y-49)+")",style:{pointerEvents:"none"},children:[i.jsx("rect",{width:116,height:42,rx:8,fill:"#0b1b35",opacity:.96}),i.jsx("text",{x:9,y:16,fill:"#a9eef5",fontSize:8.5,fontWeight:700,children:hoveredTrendPoint.tooltip}),i.jsxs("text",{x:9,y:31,fill:"#fff",fontSize:10,fontWeight:800,children:[hoveredTrendPoint.count," quotation",hoveredTrendPoint.count===1?"":"s"]})]}):null]}),i.jsx("div",{className:"mt-2 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3",children:[[String(trendTotal),"CREATED"],[String(trendPeak),trendMetricLabel],[trendAverage.toFixed(1),"AVERAGE"]].map(([f,u])=>i.jsxs("div",{children:[i.jsx("div",{className:"text-base font-bold text-navy",children:f}),i.jsx("div",{className:"mt-1 text-[8px] font-bold tracking-[0.08em] text-slate-400",children:u})]},u))})]})}`;

const normalizedComponent = alignmentRepairs.reduce(
  (value, [before, after]) => value.replace(before, after),
  component,
);

const reportStart = source.indexOf("function Fp({quotations:o})");
if (reportStart < 0) throw new Error("Cost & Profit Report component was not found.");

const approvalTitle = 'i.jsx("h2",{className:"font-bold text-navy",children:"Internal Approved vs Customer Signed"})';
const valueTitle = 'i.jsx("h2",{className:"font-bold text-navy",children:"Value Comparison"})';
const approvalTitleIndex = source.indexOf(approvalTitle, reportStart);
const valueTitleIndex = source.indexOf(valueTitle, approvalTitleIndex);
const approvalSectionStart = source.lastIndexOf('i.jsxs("section",{', approvalTitleIndex);
const valueSectionStart = source.lastIndexOf('i.jsxs("section",{', valueTitleIndex);
if (approvalTitleIndex < 0 || valueTitleIndex < 0 || approvalSectionStart < 0 || valueSectionStart <= approvalSectionStart) {
  throw new Error("Existing approval comparison card boundaries were not found.");
}

source = source.slice(0, reportStart) + normalizedComponent + source.slice(reportStart);
const shiftedApprovalStart = approvalSectionStart + normalizedComponent.length;
const shiftedValueStart = valueSectionStart + normalizedComponent.length;
source = source.slice(0, shiftedApprovalStart)
  + 'i.jsx(QuotationCreationTrend,{quotations:o}),' 
  + source.slice(shiftedValueStart);

const approvalRows = ',approvalComparisonRows=[{status:"Internal Approved",value:internalApprovedTotals.selling,color:"#2563eb",className:"bg-blue"},{status:"Customer Signed / Internal Verified",value:k.selling,color:"#16a34a",className:"bg-success"},{status:"Waiting Customer Signature",value:h.selling,color:"#f59e0b",className:"bg-orange"}]';
source = source.replace(approvalRows, "");
source = source.replace(
  'const approvalComparisonMax=Math.max(1,...approvalComparisonRows.map(oe=>oe.value)),ae=',
  'const ae=',
);

fs.writeFileSync(bundlePath, source, "utf8");
fs.writeFileSync(
  indexPath,
  indexHtml.replace(/index-HmUxnN6T\.js\?v=[^"']+/, "index-HmUxnN6T.js?v=20260811-quotation-creation-trend"),
  "utf8",
);

console.log(`Patched ${path.relative(root, bundlePath)} with quotation creation Month/Year graph.`);
