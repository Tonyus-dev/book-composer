#!/usr/bin/env python3
"""Materializa recortes cover como derivados grayscale antes do PDF.

Chromium pode converter um JPEG DEVICEGRAY em RGB/ICC quando precisa executar
object-fit: cover + clipping durante a impressão. Este passo faz a mesma
janela de recorte no asset, sem tocar no texto vivo nem nos originais.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CONTENT_W_MM = 112.0
CONTENT_H_MM = 180.0
BLEED_W_MM = 150.0
BLEED_H_MM = 220.0


def percent(value: object) -> float | None:
    if not isinstance(value, str) or not value.endswith("%"):
        return None
    try:
        return float(value[:-1])
    except ValueError:
        return None


def mm(value: object) -> float | None:
    if not isinstance(value, str) or not value.endswith("mm"):
        return None
    try:
        return float(value[:-2])
    except ValueError:
        return None


def target_aspect(block: dict) -> float | None:
    explicit = block.get("frameAspectRatio")
    if isinstance(explicit, (int, float)) and explicit > 0:
        return float(explicit)

    width_pct = percent(block.get("width"))
    height_mm = mm(block.get("height"))
    width_mm = mm(block.get("width"))
    height_pct = percent(block.get("height"))

    if block.get("fullBleed") or block.get("position") == "full":
        if block.get("fullBleed"):
            return BLEED_W_MM / BLEED_H_MM
        return CONTENT_W_MM / CONTENT_H_MM
    if width_mm and height_mm:
        return width_mm / height_mm
    if width_pct and height_mm:
        return (CONTENT_W_MM * width_pct / 100.0) / height_mm
    if width_pct and height_pct:
        return (CONTENT_W_MM * width_pct) / (CONTENT_H_MM * height_pct)
    if width_pct and block.get("height") == "100%":
        return (CONTENT_W_MM * width_pct / 100.0) / CONTENT_H_MM
    if block.get("width") == "100%" and height_mm:
        return CONTENT_W_MM / height_mm
    if block.get("width") == "100%" and block.get("height") == "100%":
        return CONTENT_W_MM / CONTENT_H_MM
    return None


def crop_for_aspect(image: Image.Image, aspect: float, x: float, y: float) -> Image.Image:
    source_w, source_h = image.size
    source_aspect = source_w / source_h
    if math.isclose(source_aspect, aspect, rel_tol=0.004, abs_tol=0.002):
        return image
    if source_aspect > aspect:
        crop_h = source_h
        crop_w = max(1, min(source_w, round(source_h * aspect)))
        left = round((source_w - crop_w) * max(0.0, min(100.0, x)) / 100.0)
        top = 0
    else:
        crop_w = source_w
        crop_h = max(1, min(source_h, round(source_w / aspect)))
        left = 0
        top = round((source_h - crop_h) * max(0.0, min(100.0, y)) / 100.0)
    return image.crop((left, top, left + crop_w, top + crop_h))


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("uso: crop-v1-4-prepress.py CANDIDATE.json")
    candidate_path = Path(sys.argv[1]).resolve()
    book = json.loads(candidate_path.read_text(encoding="utf-8"))
    manifest_path = candidate_path.with_name(candidate_path.stem + ".prepress-manifest.json")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {"mode": "grayscale", "assets": []}
    derived_root = ROOT / "public" / "assets" / "v1.4-prepress"
    cache: dict[str, dict] = {item["derived"]: item for item in manifest.get("assets", []) if isinstance(item, dict) and item.get("derived")}
    changed = 0

    for page in book.get("pages", []):
        for block in page.get("blocks", []):
            if block.get("type") != "image" or block.get("fit") != "cover":
                continue
            src = block.get("src")
            if not isinstance(src, str) or not src.startswith("/assets/v1.4-prepress/") or not src.lower().endswith(".jpg"):
                continue
            source_path = ROOT / "public" / src.lstrip("/")
            if not source_path.exists():
                continue
            aspect = target_aspect(block)
            if not aspect or aspect <= 0:
                continue
            with Image.open(source_path) as opened:
                image = opened.convert("L")
                if math.isclose(image.width / image.height, aspect, rel_tol=0.004, abs_tol=0.002):
                    continue
                x = float(block.get("objectX", 50) or 50)
                y = float(block.get("objectY", 50) or 50)
                cropped = crop_for_aspect(image, aspect, x, y)
                key = f"{source_path.name}:{aspect:.6f}:{x:.3f}:{y:.3f}"
                digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
                target = derived_root / f"crop-{digest}.jpg"
                if not target.exists():
                    cropped.save(target, format="JPEG", quality=88, optimize=True, progressive=True, dpi=(300, 300))
                derived_src = f"/assets/v1.4-prepress/{target.name}"
                block["src"] = derived_src
                cache[derived_src] = {
                    "source": src,
                    "source_sha256": source_path.stem,
                    "derived": derived_src,
                    "derived_sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
                    "width": cropped.width,
                    "height": cropped.height,
                    "mode": "L",
                    "cropAspect": round(aspect, 6),
                    "objectX": x,
                    "objectY": y,
                }
                changed += 1

    candidate_path.write_text(json.dumps(book, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest["assets"] = list(cache.values())
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"changed_blocks": changed, "derived_assets": len(cache)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
