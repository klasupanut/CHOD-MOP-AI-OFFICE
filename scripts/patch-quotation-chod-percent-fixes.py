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

    # In item/template tables, the column represents the contractor percentage.
    # Keep the quick project control wording as "Quick % Chod".
    source = replace_once(
        source,
        'children:"% Chod"}),i.jsx("th",{className:"w-28 px-2 py-3 text-right",children:"Contractor Total"})',
        'children:"%contractor"}),i.jsx("th",{className:"w-28 px-2 py-3 text-right",children:"Contractor Total"})',
        "main item table %contractor header",
    )
    source = replace_once(
        source,
        '["Category","Description","Unit","Contractor Unit Cost","% Chod","Active",""].map',
        '["Category","Description","Unit","Contractor Unit Cost","%contractor","Active",""].map',
        "template table %contractor header",
    )

    # Project mode passes m=projectMarkupPercent into pc(). It must override the
    # per-line contractorPercent, otherwise Quick % Chod does not affect totals.
    source = replace_once(
        source,
        "const p=Math.max(0,Number(o.contractorPercent??o.markupPercent??0)||0),S=Math.max(0,Number(o.quantity)||0)",
        "const p=Math.max(0,Number(m??o.contractorPercent??o.markupPercent??0)||0),S=Math.max(0,Number(o.quantity)||0)",
        "project quick percent formula",
    )

    source = replace_once(
        source,
        '["TOTAL AMOUNT AFTER DISCOUNT",o.totalAfterDiscount]',
        '["TOTAL AFTER DISCOUNT",o.totalAfterDiscount]',
        "client preview total label",
    )

    BUNDLE.write_text(source, "utf-8", newline="")
    print(f"patched {BUNDLE}")


if __name__ == "__main__":
    main()
