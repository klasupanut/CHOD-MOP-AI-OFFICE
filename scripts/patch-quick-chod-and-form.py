from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "quotation-app-dist" / "assets" / "index-Bvr2xpFw.js"


def replace_required(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise RuntimeError(f"Patch target not found: {label}")
    count = source.count(old)
    print(f"{label}: {count}")
    return source.replace(old, new)


def main() -> None:
    source = BUNDLE.read_text("utf-8", errors="replace")

    # User-facing wording: this is CHOD's markup control, not a contractor markup.
    source = replace_required(
        source,
        "Selling Price = Contractor Unit Cost + % Contractor. Contractor summary is internal only and never appears in the client PDF.",
        "Selling Price = Contractor Unit Cost + % Chod. Contractor summary is internal only and never appears in the client PDF.",
        "pricing helper text",
    )

    replacements = [
        ("Quick % Contractor", "Quick % Chod", "quick percent label"),
        ("% Contractor by Item", "% Chod by Item", "item mode label"),
        ("% Contractor by Project", "% Chod by Project", "project mode label"),
        ("% Contractor", "% Chod", "percent header labels"),
        ("Net Contractor %", "Net Chod %", "dashboard net percent labels"),
    ]
    for old, new, label in replacements:
        source = replace_required(source, old, new, label)

    # Keep contractorName available for old records/reporting, but do not show it
    # as an editable field in the quotation form.
    source = replace_required(
        source,
        '["projectSite","Project / Site","select"],["contractorName","Contractor","text"],["preparedBy","Quoter Name","text"]',
        '["projectSite","Project / Site","select"],["preparedBy","Quoter Name","text"]',
        "hide contractor field from quotation form",
    )

    # Clarify that the displayed amount already includes the CHOD markup before
    # any explicit discount is applied.
    source = replace_required(
        source,
        "Total after discount",
        "Total after discount (% Chod included)",
        "discount total label",
    )

    BUNDLE.write_text(source, "utf-8", newline="")
    print(f"patched {BUNDLE}")


if __name__ == "__main__":
    main()
