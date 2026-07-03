from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = ROOT / "quotation-app-dist" / "assets"
BUNDLES = sorted(ASSETS_DIR.glob("index-*.js"))

# Typical signatures produced when UTF-8 Thai / typographic text is decoded
# through the Windows Thai code page (CP874 / Windows-874) and then written
# back into the JavaScript bundle.
#
# Keep these as Unicode escapes so this repair script itself does not become
# dependent on an editor's active code page.
MARKERS = (
    "\u0e40\u0e18",  # mojibake sequence containing "เธ"
    "\u0e40\u0e19\u20ac",  # mojibake sequence containing "เน€"
    "\u0e42\u20ac",  # mojibake sequence containing "โ€"
    "\u0e22\u00a0",  # mojibake sequence containing "ย" + NBSP
)


def can_represent_source_byte(ch: str) -> bool:
    try:
        encoded = ch.encode("cp874")
        if len(encoded) == 1:
            return True
    except UnicodeEncodeError:
        pass

    code = ord(ch)
    return 0x80 <= code <= 0xFF


def source_byte(ch: str) -> int:
    try:
        encoded = ch.encode("cp874")
        if len(encoded) == 1:
            return encoded[0]
    except UnicodeEncodeError:
        pass

    code = ord(ch)
    if 0x80 <= code <= 0xFF:
        return code

    raise UnicodeEncodeError("cp874-byte", ch, 0, 1, "cannot map to source byte")


def has_mojibake_marker(text: str) -> bool:
    return any(marker in text for marker in MARKERS)


def repair_run(text: str) -> str | None:
    if not has_mojibake_marker(text):
        return None

    try:
        raw = bytes(source_byte(ch) for ch in text)
        repaired = raw.decode("utf-8")
    except Exception:
        return None

    repaired = repaired.replace("\u00a0", " ")
    if repaired == text:
        return None

    # Safety: accept only repairs that produce Thai text or known readable
    # symbols that were observed in quotation output.
    has_readable_non_ascii = any("\u0e00" <= ch <= "\u0e7f" for ch in repaired) or any(
        ch in "\u0e3f\u2013\u2014\u2026" for ch in repaired
    )
    if not has_readable_non_ascii:
        return None
    if has_mojibake_marker(repaired):
        return None

    return repaired


def repair_file(path: Path) -> int:
    source = path.read_text("utf-8", errors="replace")
    replacements: list[tuple[int, int, str]] = []
    i = 0

    while i < len(source):
        if not can_represent_source_byte(source[i]):
            i += 1
            continue

        start = i
        while i < len(source) and can_represent_source_byte(source[i]):
            i += 1

        run = source[start:i]
        repaired = repair_run(run)
        if repaired:
            replacements.append((start, i, repaired))

    if replacements:
        patched = source
        for start, end, replacement in reversed(replacements):
            patched = patched[:start] + replacement + patched[end:]
        path.write_text(patched, "utf-8", newline="")

    return len(replacements)


def main() -> None:
    total = 0
    for bundle in BUNDLES:
        count = repair_file(bundle)
        total += count
        print(f"{bundle}: repaired {count} mojibake run(s)")
    print(f"total repaired: {total}")


if __name__ == "__main__":
    main()
