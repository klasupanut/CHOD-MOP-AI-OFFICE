from __future__ import annotations

import re
from pathlib import Path


MARKER_PATTERN = r"(?:เธ|เน€|โ)"


def clean_bundle(path: Path) -> None:
    source = path.read_text("utf-8", errors="replace")

    # Work item template dropdown separator.
    source = re.sub(
        rf'h\.category,"[^"]*{MARKER_PATTERN}[^"]*",h\.description',
        'h.category," — ",h.description',
        source,
    )

    # Quotation list prepared-by fallback.
    source = re.sub(
        rf'x\.preparedBy\|\|"[^"]*{MARKER_PATTERN}[^"]*"',
        'x.preparedBy||"—"',
        source,
    )

    # Signature form helper text and placeholders.
    source = re.sub(
        rf'children:"[^"]*{MARKER_PATTERN}[^"]*"\}}\),i\.jsx\("div",\{{className:"mt-4 grid',
        'children:"Upload a transparent PNG signature for the selected quoter."}),i.jsx("div",{className:"mt-4 grid',
        source,
    )
    source = re.sub(
        rf'placeholder:"[^"]*{MARKER_PATTERN}[^"]*",onChange:ne=>N\(ne\.target\.value\)',
        'placeholder:"Enter quoter name",onChange:ne=>N(ne.target.value)',
        source,
    )
    source = re.sub(
        rf'placeholder:"[^"]*{MARKER_PATTERN}[^"]*",onChange:ne=>p\(ne\.target\.value\)',
        'placeholder:"Enter position",onChange:ne=>p(ne.target.value)',
        source,
    )

    # Generic status/error cleanups.
    source = re.sub(
        rf'I\("[^"]*{MARKER_PATTERN}[^"]*"\)',
        'I("Please complete all signature fields before saving.")',
        source,
    )
    source = re.sub(
        rf'I\(`[^`]*{MARKER_PATTERN}[^`]*\$\{{le\.name\}}[^`]*`\)',
        'I(`Signature saved for ${le.name}.`)',
        source,
    )

    # Final safety net: remove any remaining mojibake from quoted strings.
    source = re.sub(rf'"[^"]*{MARKER_PATTERN}[^"]*"', '"—"', source)
    source = re.sub(rf"`[^`]*{MARKER_PATTERN}[^`]*`", "`—`", source)

    path.write_text(source, "utf-8", newline="")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    bundle = root / "quotation-app-dist" / "assets" / "index-Bvr2xpFw.js"
    clean_bundle(bundle)
    text = bundle.read_text("utf-8", errors="replace")
    print(f"cleaned {bundle}")
    print({marker: text.count(marker) for marker in ("เธ", "เน€", "โ", "เธฟ")})


if __name__ == "__main__":
    main()
