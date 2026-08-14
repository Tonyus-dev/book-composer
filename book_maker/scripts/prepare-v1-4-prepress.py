#!/usr/bin/env python3
"""Create immutable grayscale derivatives for the v1.4 candidate."""

import hashlib
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
HEX_COLOR = re.compile(r"#[0-9a-fA-F]{3,8}\b")
RGB_COLOR = re.compile(r"rgba?\(([^)]+)\)", re.IGNORECASE)


def gray_channel(red: int, green: int, blue: int) -> int:
    return round(0.2126 * red + 0.7152 * green + 0.0722 * blue)


def gray_hex(match: re.Match[str]) -> str:
    value = match.group(0)
    raw = value[1:]
    if len(raw) == 3:
        raw = "".join(char * 2 for char in raw)
    if len(raw) not in (6, 8):
        return value
    channel = gray_channel(int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16))
    result = f"#{channel:02x}{channel:02x}{channel:02x}"
    return result + (raw[6:] if len(raw) == 8 else "")


def gray_rgb(match: re.Match[str]) -> str:
    pieces = [piece.strip() for piece in match.group(1).split(",")]
    if len(pieces) < 3:
        return match.group(0)
    try:
        channel = gray_channel(*(int(float(pieces[index])) for index in range(3)))
    except ValueError:
        return match.group(0)
    alpha = f", {pieces[3]}" if len(pieces) > 3 else ""
    return f"rgb({channel}, {channel}, {channel}{alpha})"


def grayscale_css(value: str) -> str:
    return RGB_COLOR.sub(gray_rgb, HEX_COLOR.sub(gray_hex, value))


def transform_styles(value):
    if isinstance(value, dict):
        result = {}
        for key, child in value.items():
            if isinstance(child, str) and any(token in key.lower() for token in ("color", "background", "border", "stroke", "fill")):
                result[key] = grayscale_css(child)
            else:
                result[key] = transform_styles(child)
        return result
    if isinstance(value, list):
        return [transform_styles(child) for child in value]
    return value


def source_path(src: str) -> Path:
    return ROOT / "public" / src.lstrip("/")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def derive_raster(source: Path, target: Path) -> dict:
    with Image.open(source) as image:
        rgba = image.convert("RGBA")
        paper = Image.new("RGBA", rgba.size, (250, 250, 250, 255))
        paper.alpha_composite(rgba)
        gray = ImageOps.autocontrast(paper.convert("L"))
        gray.save(target, "JPEG", quality=88, optimize=True, progressive=True, dpi=(300, 300))
        return {"width": gray.width, "height": gray.height, "mode": "L"}


def derive_svg(source: Path, target: Path) -> dict:
    content = source.read_text(encoding="utf-8")
    target.write_text(grayscale_css(content), encoding="utf-8")
    return {"width": None, "height": None, "mode": "vector-gray"}


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("uso: prepare-v1-4-prepress.py INPUT.json OUTPUT.json")
    input_path = Path(sys.argv[1]).resolve()
    output_path = Path(sys.argv[2]).resolve()
    book = json.loads(input_path.read_text(encoding="utf-8"))
    derived_root = ROOT / "public" / "assets" / "v1.4-prepress"
    derived_root.mkdir(parents=True, exist_ok=True)
    manifest = []
    cache = {}

    def visit(value):
        if isinstance(value, dict):
            for key, child in list(value.items()):
                if key == "src" and isinstance(child, str) and child.startswith("/assets/"):
                    source = source_path(child)
                    if not source.exists():
                        raise FileNotFoundError(source)
                    source_sha = digest(source)
                    if source_sha not in cache:
                        suffix = source.suffix.lower()
                        target = derived_root / f"{source_sha}.{'svg' if suffix == '.svg' else 'jpg'}"
                        if suffix == ".svg":
                            dimensions = derive_svg(source, target)
                        else:
                            dimensions = derive_raster(source, target)
                        cache[source_sha] = {
                            "source": child,
                            "source_sha256": source_sha,
                            "derived": "/assets/v1.4-prepress/" + target.name,
                            "derived_sha256": digest(target),
                            **dimensions,
                        }
                    value[key] = cache[source_sha]["derived"]
                else:
                    visit(child)
        elif isinstance(value, list):
            for child in value:
                visit(child)

    visit(book)
    book["meta"] = {
        **book.get("meta", {}),
        "title": "KALLISTIS — Manual do Mundo",
        "prepressGrayscale": True,
    }
    book = transform_styles(book)
    output_path.write_text(json.dumps(book, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest_path = output_path.with_name(output_path.stem + ".prepress-manifest.json")
    manifest_path.write_text(json.dumps({"mode": "grayscale", "assets": list(cache.values())}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(output_path), "assets": len(cache), "manifest": str(manifest_path)}))


if __name__ == "__main__":
    main()
