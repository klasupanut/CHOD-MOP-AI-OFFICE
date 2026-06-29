from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "quotation-app-dist" / "assets" / "index-Bvr2xpFw.js"


def main() -> None:
    source = BUNDLE.read_text("utf-8", errors="replace")
    old = "contractorTotalCost:h,sellingUnitPrice:x"
    new = "contractorTotalCost:T,sellingUnitPrice:x"
    if old not in source:
        raise RuntimeError("Net contractor cost formula target not found")
    source = source.replace(old, new, 1)
    BUNDLE.write_text(source, "utf-8", newline="")
    print("patched Net Contractor Cost = Sum Selling Total - Contractor Discount")


if __name__ == "__main__":
    main()
