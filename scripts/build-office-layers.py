from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "design" / "approved-office-concept.png"
OFFICE_DIR = ROOT / "public" / "assets" / "office"


def make_layer(name: str, polygons: list[tuple[tuple[int, int], ...]]) -> None:
    source = Image.open(MASTER).convert("RGBA")
    mask = Image.new("L", source.size, 0)
    draw = ImageDraw.Draw(mask)

    for polygon in polygons:
        draw.polygon(polygon, fill=255)

    layer = Image.new("RGBA", source.size, (0, 0, 0, 0))
    layer.paste(source, (0, 0), mask)
    OFFICE_DIR.mkdir(parents=True, exist_ok=True)
    layer.save(OFFICE_DIR / name, optimize=True)


def main() -> None:
    width, height = Image.open(MASTER).size

    # Tammasit's center executive station.
    make_layer(
        "office-executive-station.png",
        [((500, 328), (1168, 328), (1172, 542), (496, 542))],
    )

    # Film and Kla stations: complete desks, monitors, keyboards, and desk props.
    make_layer(
        "office-middle-stations.png",
        [
            ((174, 352), (680, 352), (672, 612), (177, 612)),
            ((992, 352), (1498, 352), (1492, 612), (997, 612)),
        ],
    )

    # Foreman and Moss stations: the lower/back pair in the dashboard composition.
    make_layer(
        "office-back-stations.png",
        [
            ((31, 505), (699, 505), (687, 901), (28, 901)),
            ((973, 505), (1643, 505), (1648, 901), (985, 901)),
        ],
    )

    make_layer(
        "office-front-occlusion.png",
        [
            ((177, 558), (319, 540), (326, 681), (182, 687)),
            ((313, 544), (488, 545), (491, 678), (319, 680)),
            ((482, 548), (607, 559), (607, 675), (488, 678)),
            ((40, 682), (650, 682), (687, 731), (43, 746)),
            ((1081, 557), (1224, 545), (1226, 677), (1083, 681)),
            ((1218, 544), (1391, 544), (1393, 679), (1223, 677)),
            ((1384, 548), (1516, 560), (1519, 686), (1390, 679)),
            ((1022, 682), (1636, 682), (1642, 746), (986, 731)),
        ],
    )

    print(f"Built station and exact occlusion layers at {width}x{height}")


if __name__ == "__main__":
    main()
