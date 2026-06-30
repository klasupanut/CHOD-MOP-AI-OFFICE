from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "quotation-app-dist" / "assets" / "index-HmUxnN6T.js"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return source.replace(old, new, 1)


def main() -> None:
    source = JS.read_text(encoding="utf-8")

    old_sum = (
        'const Rr=o=>o.reduce((f,u)=>({cost:f.cost+u.totalContractorCost,'
        'selling:f.selling+u.totalSellingAmount,profit:f.profit+u.totalGrossProfit}),'
        '{cost:0,selling:0,profit:0});'
    )
    new_sum = (
        'const Rr=o=>o.reduce((f,u)=>({cost:f.cost+u.totalContractorCost,'
        'selling:f.selling+u.totalSellingAmount,profit:f.profit+u.totalGrossProfit}),'
        '{cost:0,selling:0,profit:0}),'
        'isCustomerSigned=o=>Boolean(o.signedPdfUrl)||String(o.signingStatus||o.clientSigningStatus||"").trim().toUpperCase()==="SIGNED",'
        'quotationWorkType=o=>{const f=String(o.projectType||o.quotationNo||o.subject||"").toUpperCase();return f.includes("RESTORATION")||f.includes("CHOD-RN")||f.includes("RN-")?"Restoration":"Fit-out"},'
        'sumByWorkType=(o,f)=>Rr(o.filter(u=>quotationWorkType(u)===f));'
    )
    if "isCustomerSigned=o=>" not in source:
        source = replace_once(source, old_sum, new_sum, "sum helpers")

    old_stats = (
        'xe=V.useMemo(()=>{const $=m.filter(G=>G.status==="Approved").reduce((G,F)=>'
        '({selling:G.selling+F.totalSellingAmount,cost:G.cost+F.totalContractorCost,profit:G.profit+F.totalGrossProfit}),'
        '{selling:0,cost:0,profit:0});return{total:m.length,draft:m.filter(G=>G.status==="Draft").length,'
        'sent:m.filter(G=>G.status==="Sent").length,approved:m.filter(G=>G.status==="Approved").length,'
        'rejected:m.filter(G=>G.status==="Rejected").length,totalSelling:$.selling,totalCost:$.cost,totalProfit:$.profit,'
        'averageMarkup:$.cost?($.selling-$.cost)/$.cost*100:0,grossMargin:$.selling?$.profit/$.selling*100:0}},[m])'
    )
    new_stats = (
        'xe=V.useMemo(()=>{const $=Rr(m.filter(isCustomerSigned));return{total:m.length,'
        'draft:m.filter(G=>G.status==="Draft").length,sent:m.filter(G=>G.status==="Sent").length,'
        'approved:m.filter(G=>G.status==="Approved").length,rejected:m.filter(G=>G.status==="Rejected").length,'
        'totalSelling:$.selling,totalCost:$.cost,totalProfit:$.profit,averageMarkup:$.cost?($.selling-$.cost)/$.cost*100:0,'
        'grossMargin:$.selling?$.profit/$.selling*100:0}},[m])'
    )
    if new_stats not in source:
        source = replace_once(source, old_stats, new_stats, "dashboard signed stats")
    source = source.replace(
        "Financial totals include Approved quotations only.",
        "Financial totals include Customer Signed quotations only.",
    )

    start = source.index("function Fp({quotations:o})")
    end = source.index("function Qp(", start)
    old_fp = source[start:end]
    new_fp = (
        'function Fp({quotations:o}){const f=o.filter(E=>E.status==="Draft"),u=Rr(f),N=o.filter(E=>E.status!=="Draft"),'
        'v=Rr(N),x=o.filter(E=>E.status==="Approved"),S=o.filter(isCustomerSigned),k=Rr(S),m=o.filter(E=>E.status==="Approved"&&!isCustomerSigned(E)),'
        'h=Rr(m),O=o.filter(E=>!isCustomerSigned(E)&&E.status!=="Draft"),z=Rr(O),_=v.selling>0?k.selling/v.selling*100:0,'
        'M=k.selling>0?k.profit/k.selling*100:0,J=[{status:"Internal Approved / Not Signed",value:h.selling,color:"#f59e0b",className:"bg-orange"},'
        '{status:"Customer Signed",value:k.selling,color:"#16a34a",className:"bg-success"}];let E=0;const Z=J.map(oe=>{const he=E,le=v.selling>0?oe.value/v.selling*100:0;return E+=le,`${oe.color} ${he}% ${E}%`}),'
        'ee=v.selling>0?`conic-gradient(${Z.join(", ")})`:"#e2e8f0",ae=Math.max(1,...J.map(oe=>oe.value)),'
        'xe=sumByWorkType(S,"Fit-out"),Me=sumByWorkType(S,"Restoration");return i.jsxs("div",{className:"p-6",children:['
        'i.jsx("h1",{className:"text-2xl font-bold text-navy",children:"Cost & Profit Report"}),'
        'i.jsx("p",{className:"mt-1 text-sm text-slate-500",children:"Actual Work Value counts customer signed quotations only. Internal approval is not counted as actual work value until the customer signs. Drafts are excluded. All values exclude VAT."}),'
        'i.jsx("div",{className:"mt-6 grid grid-cols-4 gap-4 max-xl:grid-cols-2",children:[["Total Quoted Value",`฿${me(v.selling)}`,"text-blue"],["Actual Work Value (signed)",`฿${me(k.selling)}`,"text-success"],["Not Approved Value",`฿${me(z.selling)}`,"text-orange"],["Value Win Rate",`${_.toFixed(1)}%`,"text-navy"]].map(([oe,he,le])=>i.jsxs("div",{className:"panel p-5",children:[i.jsx("div",{className:"text-xs text-slate-500",children:oe}),i.jsx("div",{className:`mt-2 text-2xl font-bold ${le}`,children:he})]},oe))}),'
        'i.jsxs("p",{className:"mt-2 text-right text-[11px] text-slate-400",children:["Draft pipeline excluded: ",f.length," quotation(s), ฿",me(u.selling),". Internal approved but not signed: ฿",me(h.selling),"."]}),'
        'i.jsxs("div",{className:"mt-6 grid grid-cols-[360px_1fr] gap-4 max-xl:grid-cols-1",children:['
        'i.jsxs("section",{className:"panel p-5",children:[i.jsx("h2",{className:"font-bold text-navy",children:"Internal Approved vs Customer Signed"}),i.jsxs("div",{className:"mt-5 flex items-center gap-6",children:[i.jsx("div",{"data-testid":"status-donut-chart",className:"relative shrink-0 rounded-full",style:{background:ee,width:144,height:144},children:i.jsxs("div",{className:"absolute inset-7 flex flex-col items-center justify-center rounded-full bg-white",children:[i.jsx("span",{className:"text-[10px] uppercase text-slate-400",children:"Signed"}),i.jsxs("strong",{className:"mt-1 text-sm text-navy",children:["฿",me(k.selling,0)]})]})}),i.jsx("div",{className:"min-w-0 flex-1 space-y-3",children:J.map(oe=>i.jsx("div",{children:i.jsxs("div",{className:"flex items-center gap-2 text-xs",children:[i.jsx("span",{className:"h-2.5 w-2.5 rounded-full",style:{backgroundColor:oe.color}}),i.jsx("span",{className:"text-slate-500",children:oe.status}),i.jsxs("strong",{className:"ml-auto text-navy",children:["฿",me(oe.value)]})]})},oe.status))})]})]}),'
        'i.jsxs("section",{className:"panel p-5",children:[i.jsx("h2",{className:"font-bold text-navy",children:"Value Comparison"}),i.jsx("div",{"data-testid":"status-bar-chart",className:"mt-6 space-y-4",children:J.map(oe=>i.jsxs("div",{className:"grid grid-cols-[150px_1fr_120px] items-center gap-3 text-xs",children:[i.jsx("span",{className:"text-slate-500",children:oe.status}),i.jsx("div",{className:"overflow-hidden rounded-md bg-slate-100",style:{height:32},children:i.jsx("div",{className:`flex min-w-0 items-center justify-end px-2 text-[10px] font-semibold text-white transition-all ${oe.className}`,style:{backgroundColor:oe.color,height:"100%",paddingLeft:oe.value>0?8:0,paddingRight:oe.value>0?8:0,width:oe.value>0?`${Math.max(2,oe.value/ae*100)}%`:"0%"}})}),i.jsxs("strong",{className:"text-right text-navy",children:["฿",me(oe.value)]})]},oe.status))})]})]}),'
        'i.jsx("h2",{className:"mt-6 font-bold text-navy",children:"Signed Work Cost & Profit by Scope"}),'
        'i.jsx("div",{className:"mt-3 grid grid-cols-2 gap-4 max-lg:grid-cols-1",children:[["Fit-out",xe],["Restoration",Me]].map(([oe,he])=>i.jsxs("div",{className:"panel p-5",children:[i.jsx("h3",{className:"font-bold text-navy",children:oe}),i.jsxs("p",{className:"mt-3 flex justify-between text-xs text-slate-500",children:[i.jsx("span",{children:"Net Contractor Cost"}),i.jsxs("strong",{className:"text-navy",children:["฿",me(he.cost)]})]}),i.jsxs("p",{className:"mt-2 flex justify-between text-xs text-slate-500",children:[i.jsx("span",{children:"Selling Excl. VAT"}),i.jsxs("strong",{className:"text-navy",children:["฿",me(he.selling)]})]}),i.jsxs("p",{className:"mt-2 flex justify-between text-xs text-slate-500",children:[i.jsx("span",{children:"Gross Profit"}),i.jsxs("strong",{className:"text-orange",children:["฿",me(he.profit)]})]})]},oe))}),'
        'i.jsx("h2",{className:"mt-6 font-bold text-navy",children:"Signed Work Cost & Profit"}),'
        'i.jsx("div",{className:"mt-3 grid grid-cols-3 gap-4 max-lg:grid-cols-1",children:[["Net Contractor Cost",`฿${me(k.cost)}`],["Gross Profit",`฿${me(k.profit)}`],["Gross Margin",`${M.toFixed(2)}%`]].map(([oe,he],le)=>i.jsxs("div",{className:"panel p-5",children:[i.jsx("div",{className:"text-xs text-slate-500",children:oe}),i.jsx("div",{className:`mt-2 text-2xl font-bold ${le===1?"text-orange":"text-navy"}`,children:he})]},oe))}),'
        'i.jsx("div",{className:"panel mt-5 overflow-x-auto",children:i.jsxs("table",{className:"min-w-[1120px] w-full text-sm",children:[i.jsx("thead",{className:"bg-slate-50 text-left text-[10px] uppercase text-slate-500",children:i.jsx("tr",{children:["Quotation","Client","Scope","Internal Approval","Customer Signing","Net Contractor Cost","Selling Excl. VAT","Gross Profit","Net Markup","Gross Margin"].map(oe=>i.jsx("th",{className:"px-4 py-3",children:oe},oe))})}),i.jsx("tbody",{children:o.map(oe=>{const he=isCustomerSigned(oe);return i.jsxs("tr",{className:`border-t border-slate-100 ${he?"":"opacity-70"}`,children:[i.jsx("td",{className:"px-4 py-3 text-blue",children:oe.quotationNo}),i.jsx("td",{className:"px-4 py-3",children:oe.client}),i.jsx("td",{className:"px-4 py-3",children:quotationWorkType(oe)}),i.jsx("td",{className:"px-4 py-3",children:oe.status}),i.jsx("td",{className:"px-4 py-3",children:he?"Signed":"Not signed"}),i.jsx("td",{className:"px-4 py-3",children:he?me(oe.totalContractorCost):"-"}),i.jsx("td",{className:"px-4 py-3",children:he?me(oe.totalSellingAmount):"-"}),i.jsx("td",{className:"px-4 py-3 font-semibold text-orange",children:he?me(oe.totalGrossProfit):"-"}),i.jsxs("td",{className:"px-4 py-3",children:[oe.averageMarkupPercent.toFixed(2),"%"]}),i.jsxs("td",{className:"px-4 py-3",children:[oe.grossMarginPercent.toFixed(2),"%"]})]},oe.quotationId)})})]})})]})}'
    )
    source = source[:start] + new_fp + source[end:]

    JS.write_text(source, encoding="utf-8")
    print(f"patched {JS}")


if __name__ == "__main__":
    main()
