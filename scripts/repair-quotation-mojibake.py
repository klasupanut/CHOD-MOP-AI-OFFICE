from __future__ import annotations

from pathlib import Path


MARKERS = ("เธ", "เน€", "โ")


def read_js_strings(source: str):
    i = 0
    n = len(source)
    while i < n:
        quote = source[i]
        if quote not in ("\"", "'", "`"):
            i += 1
            continue

        start = i
        i += 1
        chars: list[str] = []
        escaped = False

        while i < n:
            ch = source[i]
            if escaped:
                chars.append("\\" + ch)
                escaped = False
                i += 1
                continue
            if ch == "\\":
                escaped = True
                i += 1
                continue
            if ch == quote:
                yield start, i + 1, quote, "".join(chars)
                i += 1
                break
            chars.append(ch)
            i += 1
        else:
            break


def raw_bytes_from_cp874_mojibake(text: str) -> bytes:
    out = bytearray()
    fallback = {
        "€": 0x80,
        "‘": 0x91,
        "’": 0x92,
        "“": 0x93,
        "”": 0x94,
        "•": 0x95,
        "–": 0x96,
        "—": 0x97,
        "™": 0x99,
    }

    for ch in text:
        try:
            encoded = ch.encode("cp874")
            if len(encoded) == 1:
                out.extend(encoded)
                continue
        except UnicodeEncodeError:
            pass

        code = ord(ch)
        if 0 <= code <= 255:
            out.append(code)
            continue
        if ch in fallback:
            out.append(fallback[ch])
            continue
        raise UnicodeEncodeError("cp874-raw", ch, 0, 1, "unmapped")

    return bytes(out)


def repair_mojibake(text: str) -> str | None:
    try:
        return raw_bytes_from_cp874_mojibake(text).decode("utf-8")
    except Exception:
        return None


def js_quote(value: str, quote: str) -> str:
    escaped = value.replace("\\", "\\\\")
    if quote == "`":
        escaped = escaped.replace("`", "\\`").replace("${", "\\${")
    elif quote == '"':
        escaped = escaped.replace('"', '\\"')
    else:
        escaped = escaped.replace("'", "\\'")
    return quote + escaped + quote


def patch_file(path: Path, write: bool) -> tuple[int, int]:
    source = path.read_text("utf-8", errors="replace")
    replacements: list[tuple[int, int, str, str]] = []

    for start, end, quote, value in read_js_strings(source):
        if not any(marker in value for marker in MARKERS):
            continue
        repaired = repair_mojibake(value)
        if not repaired or repaired == value:
            continue
        replacements.append((start, end, js_quote(repaired, quote), repaired))

    if write and replacements:
        patched = source
        for start, end, replacement, _ in reversed(replacements):
            patched = patched[:start] + replacement + patched[end:]
        path.write_text(patched, "utf-8", newline="")

    return len(replacements), len(source)


def looks_like_cp874_mojibake_run(ch: str) -> bool:
    code = ord(ch)
    if "\u0e00" <= ch <= "\u0e7f":
        return True
    if 0x80 <= code <= 0x9F:
        return True
    if ch in {"€", "‘", "’", "“", "”", "•", "–", "—", "™", " "}:
        return True
    return False


def patch_mojibake_runs(path: Path, write: bool) -> int:
    source = path.read_text("utf-8", errors="replace")
    replacements: list[tuple[int, int, str]] = []
    i = 0
    n = len(source)

    while i < n:
        if not looks_like_cp874_mojibake_run(source[i]):
            i += 1
            continue
        start = i
        while i < n and looks_like_cp874_mojibake_run(source[i]):
            i += 1
        run = source[start:i]
        if not any(marker in run for marker in MARKERS):
            continue
        repaired = repair_mojibake(run)
        if not repaired or repaired == run:
            continue
        # Avoid touching healthy Thai by requiring the repair to contain Thai
        # and no known mojibake marker.
        if not any("\u0e00" <= ch <= "\u0e7f" for ch in repaired):
            continue
        if any(marker in repaired for marker in MARKERS):
            continue
        replacements.append((start, i, repaired))

    if write and replacements:
        patched = source
        for start, end, replacement in reversed(replacements):
            patched = patched[:start] + replacement + patched[end:]
        path.write_text(patched, "utf-8", newline="")

    return len(replacements)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    paths = [
        root / "quotation-app-dist" / "assets" / "index-Bvr2xpFw.js",
    ]

    for path in paths:
        literal_count, _ = patch_file(path, write=True)
        run_count = patch_mojibake_runs(path, write=True)
        print(f"{path}: repaired {literal_count} string literal(s), {run_count} mojibake run(s)")


if __name__ == "__main__":
    main()
