from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design" / "favicon.png"
PUBLIC = ROOT / "public"
NAVY = (2, 28, 62, 255)


def contain_icon(size: int, padding_ratio: float = 0.08) -> Image.Image:
    source = Image.open(SOURCE).convert("RGBA")
    canvas = Image.new("RGBA", (size, size), NAVY)
    padding = max(1, int(size * padding_ratio))
    fitted = ImageOps.contain(source, (size - padding * 2, size - padding * 2), Image.Resampling.LANCZOS)
    x = (size - fitted.width) // 2
    y = (size - fitted.height) // 2
    canvas.alpha_composite(fitted, (x, y))
    return canvas


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)

    PUBLIC.mkdir(exist_ok=True)
    contain_icon(16, 0.06).save(PUBLIC / "favicon-16x16.png", optimize=True)
    contain_icon(32, 0.06).save(PUBLIC / "favicon-32x32.png", optimize=True)
    contain_icon(180, 0.08).save(PUBLIC / "apple-icon.png", optimize=True)
    contain_icon(512, 0.08).save(PUBLIC / "icon.png", optimize=True)

    ico_source = contain_icon(256, 0.08)
    ico_source.save(
        PUBLIC / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
    print("Generated contained favicon files from design/favicon.png")


if __name__ == "__main__":
    main()
