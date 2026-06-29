from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "quotation-app-dist" / "assets" / "index-Bvr2xpFw.js"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise RuntimeError(f"Patch target not found: {label}")
    print(label)
    return source.replace(old, new, 1)


def main() -> None:
    source = BUNDLE.read_text("utf-8", errors="replace")

    old_fp_start = source.find("function fp")
    old_fp_end = source.find("const pp=", old_fp_start)
    if old_fp_start < 0 or old_fp_end < 0:
        raise RuntimeError("Quick % Chod control function not found")
    old_fp = source[old_fp_start:old_fp_end]
    new_fp = (
        'function fp({quotation:o,onChange:m}){const u=o.projectMarkupPercent,'
        'N=p=>m({...o,calculationMode:"project",projectMarkupPercent:p});'
        'return i.jsxs("div",{className:"mt-5 grid grid-cols-[auto_1fr] items-end gap-5 max-xl:grid-cols-1",children:['
        'i.jsxs("div",{children:[i.jsx("span",{className:"field-label",children:"Calculation Mode"}),'
        'i.jsx("div",{className:"inline-flex overflow-hidden rounded-lg border border-blue",children:'
        'i.jsx("button",{type:"button",className:"h-10 px-4 text-xs font-semibold bg-blue text-white",children:"% Chod by Project"})})]}),'
        'i.jsxs("div",{children:[i.jsx("span",{className:"field-label",children:"Quick % Chod"}),'
        'i.jsxs("div",{className:"flex flex-wrap gap-2",children:['
        'dp.map(p=>i.jsxs("button",{type:"button",onClick:()=>N(p),className:`h-10 min-w-12 rounded-lg border px-3 text-xs font-semibold ${u===p?"border-blue bg-blue/5 text-blue":"border-slate-200 bg-white text-slate-600 hover:border-blue hover:text-blue"}`,children:[p,"%"]},p)),'
        'i.jsxs("label",{className:"flex h-10 items-center overflow-hidden rounded-lg border border-slate-200 bg-white",children:['
        'i.jsx("span",{className:"px-2 text-[11px] text-slate-500",children:"Custom"}),'
        'i.jsx("input",{"aria-label":"Custom markup percent",className:"h-full w-16 border-l border-slate-200 px-2 text-right text-xs outline-none",type:"number",min:"0",step:"1",value:o.projectMarkupPercent,onChange:p=>N(Number(p.target.value))})]})]})]})]})}'
    )
    source = source[:old_fp_start] + new_fp + source[old_fp_end:]
    print("calculation mode project-only")

    old_pc = (
        'pc=(o,m,u=5,N=5,y)=>{if(o.itemType==="title")return{...o,quantity:0,contractorUnitCost:0,contractorGrossTotalCost:0,contractorDiscountAmount:0,contractorTotalCost:0,markupPercent:0,contractorPercent:0,sellingUnitPrice:0,sellingTotal:0,quotationUnitPrice:0,quotationTotal:0,projectSellingTotal:0,grossProfit:0,grossMarginPercent:0};'
        'const p=Math.max(0,Number(m??o.contractorPercent??o.markupPercent??0)||0),S=Math.max(0,Number(o.quantity)||0),j=Math.max(0,Number(o.contractorUnitCost)||0),h=we(S*j),x=we(j*(1+p/100)),L=we(S*x),U=we(Math.min(Math.max(0,Number(y??o.contractorDiscountAmount)||0),L)),T=we(L-U),D=S>0?we(T/S):0,q=we(T),G=q,ce=we(G-h),ne=G>0?ce/G*100:0;'
        'return{...o,quantity:S,contractorUnitCost:j,contractorGrossTotalCost:h,contractorDiscountAmount:U,markupPercent:p,contractorPercent:p,contractorTotalCost:T,sellingUnitPrice:x,sellingTotal:L,quotationUnitPrice:D,quotationTotal:q,projectSellingTotal:G,grossProfit:ce,grossMarginPercent:ne}}'
    )
    new_pc = (
        'pc=(o,m,u=5,N=5,y)=>{if(o.itemType==="title")return{...o,quantity:0,contractorUnitCost:0,contractorGrossTotalCost:0,contractorDiscountAmount:0,contractorTotalCost:0,markupPercent:0,contractorPercent:0,sellingUnitPrice:0,sellingTotal:0,quotationUnitPrice:0,quotationTotal:0,projectSellingTotal:0,grossProfit:0,grossMarginPercent:0};'
        'const p=Math.max(0,Number(o.contractorPercent??o.markupPercent??0)||0),C=Math.max(0,Number(m??0)||0),S=Math.max(0,Number(o.quantity)||0),j=Math.max(0,Number(o.contractorUnitCost)||0),h=we(S*j),x=we(j*(1+p/100)),L=we(S*x),U=we(Math.min(Math.max(0,Number(y??o.contractorDiscountAmount)||0),L)),T=we(L-U),D=S>0?we(T/S):0,q=we(T),G=we(q*(1+C/100)),ce=we(G-T),ne=G>0?ce/G*100:0;'
        'return{...o,quantity:S,contractorUnitCost:j,contractorGrossTotalCost:h,contractorDiscountAmount:U,markupPercent:C,contractorPercent:p,contractorTotalCost:T,sellingUnitPrice:x,sellingTotal:L,quotationUnitPrice:D,quotationTotal:q,projectSellingTotal:G,grossProfit:ce,grossMarginPercent:ne}}'
    )
    source = replace_once(source, old_pc, new_pc, "separate contractor percent and chod project markup formula")

    source = replace_once(
        source,
        'Ut=o=>{const N=o.calculationMode==="project"?o.projectMarkupPercent:void 0',
        'Ut=o=>{const N=o.projectMarkupPercent',
        "always use project-level Quick % Chod",
    )
    source = replace_once(
        source,
        'calculationMode:"item",projectMarkupPercent:10',
        'calculationMode:"project",projectMarkupPercent:10',
        "new quotations default to project calculation",
    )
    source = replace_once(
        source,
        'min:"0",step:"0.01",value:h.contractorPercent??h.markupPercent??0,onChange:L=>N(x,"contractorPercent",L.target.value)',
        'min:"0",step:"1",value:h.contractorPercent??h.markupPercent??0,onChange:L=>N(x,"contractorPercent",L.target.value)',
        "%contractor input step 1",
    )

    BUNDLE.write_text(source, "utf-8", newline="")
    print(f"patched {BUNDLE}")


if __name__ == "__main__":
    main()
