from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "quotation-app-dist" / "assets" / "index-Bvr2xpFw.js"


def main() -> None:
    source = BUNDLE.read_text("utf-8", errors="replace")

    old = (
        "D=S>0?we(T/S):0,q=we(T),G=we(q*(1+C/100)),ce=we(G-T),ne=G>0?ce/G*100:0;"
        "return{...o,quantity:S,contractorUnitCost:j,contractorGrossTotalCost:h,contractorDiscountAmount:U,"
        "markupPercent:C,contractorPercent:p,contractorTotalCost:T,sellingUnitPrice:x,sellingTotal:L,"
        "quotationUnitPrice:D,quotationTotal:q,projectSellingTotal:G,grossProfit:ce,grossMarginPercent:ne}"
    )
    new = (
        "D=S>0?we(T/S):0,q=we(T),G=we(q*(1+C/100)),Q=S>0?we(G/S):0,ce=we(G-T),ne=G>0?ce/G*100:0;"
        "return{...o,quantity:S,contractorUnitCost:j,contractorGrossTotalCost:h,contractorDiscountAmount:U,"
        "markupPercent:C,contractorPercent:p,contractorTotalCost:T,sellingUnitPrice:x,sellingTotal:L,"
        "quotationUnitPrice:Q,quotationTotal:G,projectSellingTotal:G,grossProfit:ce,grossMarginPercent:ne}"
    )
    if old not in source:
        raise RuntimeError("Preview line total formula target not found")
    source = source.replace(old, new, 1)

    BUNDLE.write_text(source, "utf-8", newline="")
    print("patched quotation UNIT PRICE and TOTAL (THB.) to include Quick % Chod")


if __name__ == "__main__":
    main()
