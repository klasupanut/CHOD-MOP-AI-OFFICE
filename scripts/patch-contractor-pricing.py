from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "quotation-app-dist" / "assets" / "index-Bvr2xpFw.js"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise RuntimeError(f"Patch target not found: {label}")
    return source.replace(old, new, 1)


def replace_all(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count == 0:
        raise RuntimeError(f"Patch target not found: {label}")
    print(f"{label}: {count}")
    return source.replace(old, new)


def main() -> None:
    source = BUNDLE.read_text("utf-8", errors="replace")

    # Make Contractor a first-class quotation header field.
    source = replace_once(
        source,
        '["projectSite","Project / Site","select"],["preparedBy","Quoter Name","text"]',
        '["projectSite","Project / Site","select"],["contractorName","Contractor","text"],["preparedBy","Quoter Name","text"]',
        "add contractor header field",
    )
    source = replace_once(
        source,
        'projectSite:"",preparedBy:"",signatureUrl:""',
        'projectSite:"",contractorName:"",preparedBy:"",signatureUrl:""',
        "default contractorName",
    )

    # Numeric editor fields.
    source = replace_once(
        source,
        'Ep=["quantity","contractorUnitCost","markupPercent"];',
        'Ep=["quantity","contractorUnitCost","markupPercent","contractorPercent"];',
        "numeric contractorPercent",
    )

    # New items/titles should carry contractorPercent for persistence.
    source = replace_all(
        source,
        "markupPercent:0,sellingUnitPrice:0",
        "markupPercent:0,contractorPercent:0,sellingUnitPrice:0",
        "title contractorPercent defaults",
    )
    source = replace_all(
        source,
        "markupPercent:o.projectMarkupPercent,sellingUnitPrice:0",
        "markupPercent:o.projectMarkupPercent,contractorPercent:o.projectMarkupPercent,sellingUnitPrice:0",
        "manual item contractorPercent default",
    )
    source = replace_once(
        source,
        'markupPercent:(h==null?void 0:h.defaultMarkupPercent)??o.projectMarkupPercent,sellingUnitPrice:0',
        'markupPercent:(h==null?void 0:h.defaultMarkupPercent)??o.projectMarkupPercent,contractorPercent:(h==null?void 0:h.defaultMarkupPercent)??o.projectMarkupPercent,sellingUnitPrice:0',
        "template item contractorPercent default",
    )
    source = replace_once(
        source,
        "m({...o,items:o.items.map(S=>({...S,markupPercent:p}))})",
        "m({...o,items:o.items.map(S=>({...S,markupPercent:p,contractorPercent:p}))})",
        "quick percent updates contractorPercent",
    )

    # Work item table labels: Unit Cost, % Contractor, Contractor Total, Selling Price.
    source = replace_once(
        source,
        'children:"Contractor Unit Cost"}),i.jsx("th",{className:"w-28 px-2 py-3 text-right",children:"Total"}),i.jsx("th",{className:"w-20 px-2 py-3 text-right",children:"Markup %"}),i.jsx("th",{className:"w-28 px-2 py-3 text-right",children:"Selling Price"})',
        'children:"Contractor Unit Cost"}),i.jsx("th",{className:"w-20 px-2 py-3 text-right",children:"% Contractor"}),i.jsx("th",{className:"w-28 px-2 py-3 text-right",children:"Contractor Total"}),i.jsx("th",{className:"w-28 px-2 py-3 text-right",children:"Selling Price"})',
        "work table contractor percent headers",
    )
    source = replace_once(
        source,
        'i.jsx("td",{"data-testid":`contractor-gross-total-${x}`,className:"px-2 py-4 text-right font-bold text-navy",children:me(h.contractorGrossTotalCost)}),i.jsx("td",{className:"p-1.5",children:i.jsx("input",{className:"field-input !h-10 !px-2 text-right disabled:bg-slate-100",type:"number",min:"0",disabled:o.calculationMode==="project",value:o.calculationMode==="project"?o.projectMarkupPercent:h.markupPercent,onChange:L=>N(x,"markupPercent",L.target.value)})}),i.jsx("td",{"data-testid":`selling-price-${x}`',
        'i.jsx("td",{className:"p-1.5",children:i.jsx("input",{"aria-label":`Contractor Percent ${x+1}`,className:"field-input !h-10 !px-2 text-right",type:"number",min:"0",step:"0.01",value:h.contractorPercent??h.markupPercent??0,onChange:L=>N(x,"contractorPercent",L.target.value)})}),i.jsx("td",{"data-testid":`contractor-gross-total-${x}`,className:"px-2 py-4 text-right font-bold text-navy",children:me(h.contractorGrossTotalCost)}),i.jsx("td",{"data-testid":`selling-price-${x}`',
        "work table contractor percent input",
    )

    # Template Settings label.
    source = source.replace('"Markup %"', '"% Contractor"')
    source = source.replace("Quick Markup", "Quick % Contractor")
    source = source.replace("Markup by Item", "% Contractor by Item")
    source = source.replace("Markup by Project", "% Contractor by Project")
    source = source.replace("Net Markup", "Net Contractor %")

    # Core pricing formula:
    # selling unit = contractor unit cost * (1 + contractorPercent / 100)
    # cost remains contractor base cost, profit is selling after line discount less contractor base cost.
    old_pc = 'pc=(o,m,u=5,N=5,y)=>{if(o.itemType==="title")return{...o,quantity:0,contractorUnitCost:0,contractorGrossTotalCost:0,contractorDiscountAmount:0,contractorTotalCost:0,markupPercent:0,contractorPercent:0,sellingUnitPrice:0,sellingTotal:0,quotationUnitPrice:0,quotationTotal:0,projectSellingTotal:0,grossProfit:0,grossMarginPercent:0};const p=Or(m??o.markupPercent),S=Math.max(0,Number(o.quantity)||0),j=Math.max(0,Number(o.contractorUnitCost)||0),h=we(S*j),x=we(j*(1+Or(u)/100+Or(N)/100)),L=we(S*x),U=we(Math.min(Math.max(0,Number(y??o.contractorDiscountAmount)||0),L)),T=we(L-U),D=S>0?we(T/S):0,q=we(T),I=we(T*(p/100)),G=we(T+I),ce=we(G-T),ne=G>0?ce/G*100:0;return{...o,quantity:S,contractorUnitCost:j,contractorGrossTotalCost:h,contractorDiscountAmount:U,markupPercent:p,contractorTotalCost:T,sellingUnitPrice:x,sellingTotal:L,quotationUnitPrice:D,quotationTotal:q,projectSellingTotal:G,grossProfit:ce,grossMarginPercent:ne}}'
    new_pc = 'pc=(o,m,u=5,N=5,y)=>{if(o.itemType==="title")return{...o,quantity:0,contractorUnitCost:0,contractorGrossTotalCost:0,contractorDiscountAmount:0,contractorTotalCost:0,markupPercent:0,contractorPercent:0,sellingUnitPrice:0,sellingTotal:0,quotationUnitPrice:0,quotationTotal:0,projectSellingTotal:0,grossProfit:0,grossMarginPercent:0};const p=Math.max(0,Number(o.contractorPercent??o.markupPercent??0)||0),S=Math.max(0,Number(o.quantity)||0),j=Math.max(0,Number(o.contractorUnitCost)||0),h=we(S*j),x=we(j*(1+p/100)),L=we(S*x),U=we(Math.min(Math.max(0,Number(y??o.contractorDiscountAmount)||0),L)),T=we(L-U),D=S>0?we(T/S):0,q=we(T),G=q,ce=we(G-h),ne=G>0?ce/G*100:0;return{...o,quantity:S,contractorUnitCost:j,contractorGrossTotalCost:h,contractorDiscountAmount:U,markupPercent:p,contractorPercent:p,contractorTotalCost:h,sellingUnitPrice:x,sellingTotal:L,quotationUnitPrice:D,quotationTotal:q,projectSellingTotal:G,grossProfit:ce,grossMarginPercent:ne}}'
    source = replace_once(source, old_pc, new_pc, "pricing formula")

    source = replace_once(
        source,
        "ce=we(G.quotation),ne=we(G.rawCost*(5/100)),xe=we(G.rawCost*(5/100)),le=we(G.selling)",
        "ce=we(G.quotation),ne=0,xe=0,le=we(G.selling)",
        "remove fixed overhead/profit from totals",
    )
    source = source.replace(
        "Selling Price includes contractor unit cost plus overhead and profit. Net Contractor Cost is Selling Total less contractor discount. Project Selling adds markup, excludes VAT, and internal calculations never appear in the client PDF.",
        "Selling Price = Contractor Unit Cost + % Contractor. Contractor summary is internal only and never appears in the client PDF.",
    )

    # Contractor summary in Cost & Profit report.
    source = replace_once(
        source,
        'function Lp({quotations:o}){const m=o.filter(I=>I.status==="Draft")',
        'function Lp({quotations:o}){const ContractorRows=Object.values(o.reduce((r,a)=>{const n=(a.contractorName||"Unassigned Contractor").trim()||"Unassigned Contractor";const row=r[n]||(r[n]={name:n,jobs:0,total:0});row.jobs+=1;row.total+=Number(a.totalContractorCost)||0;return r},{})).sort((a,b)=>b.total-a.total);const m=o.filter(I=>I.status==="Draft")',
        "contractor report data",
    )
    source = replace_once(
        source,
        'i.jsxs("div",{className:"mt-6 grid grid-cols-[360px_1fr] gap-4 max-xl:grid-cols-1",children:[',
        'i.jsxs("section",{className:"panel mt-6 p-5",children:[i.jsx("h2",{className:"font-bold text-navy",children:"Contractor Quote Summary"}),i.jsx("div",{className:"mt-3 overflow-x-auto",children:i.jsxs("table",{className:"min-w-[520px] w-full text-sm",children:[i.jsx("thead",{className:"bg-slate-50 text-left text-[10px] uppercase text-slate-500",children:i.jsx("tr",{children:["Contractor","Quoted Jobs","Contractor Total"].map(I=>i.jsx("th",{className:"px-3 py-3",children:I},I))})}),i.jsx("tbody",{children:ContractorRows.length?ContractorRows.map(I=>i.jsxs("tr",{className:"border-t border-slate-100",children:[i.jsx("td",{className:"px-3 py-3 font-semibold text-navy",children:I.name}),i.jsx("td",{className:"px-3 py-3",children:I.jobs}),i.jsxs("td",{className:"px-3 py-3 text-right font-bold",children:["฿",me(I.total)]})]},I.name)):i.jsx("tr",{children:i.jsx("td",{colSpan:3,className:"px-3 py-6 text-center text-slate-400",children:"No contractor data yet."})})})]})})]}),i.jsxs("div",{className:"mt-6 grid grid-cols-[360px_1fr] gap-4 max-xl:grid-cols-1",children:[',
        "contractor report section",
    )

    BUNDLE.write_text(source, "utf-8", newline="")
    print(f"patched {BUNDLE}")


if __name__ == "__main__":
    main()
