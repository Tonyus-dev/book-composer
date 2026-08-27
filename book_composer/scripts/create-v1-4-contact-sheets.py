#!/usr/bin/env python3
"""Renderiza contact sheets leves do PDF candidato para auditoria visual."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("uso: create-v1-4-contact-sheets.py CANDIDATE.pdf")
    pdf = Path(sys.argv[1]).resolve()
    root = pdf.parent / "contact-sheets"
    pages = root / "_pages"
    root.mkdir(parents=True, exist_ok=True)
    pages.mkdir(parents=True, exist_ok=True)
    subprocess.run(["pdftoppm", "-jpeg", "-r", "30", str(pdf), str(pages / "page")], check=True)
    rendered = sorted(pages.glob("page-*.jpg"))
    for start in range(0, len(rendered), 25):
        group = rendered[start:start + 25]
        thumb_w, thumb_h = 177, 265
        sheet = Image.new("L", (thumb_w * 5, thumb_h * 5), 245)
        draw = ImageDraw.Draw(sheet)
        for index, page_path in enumerate(group):
            with Image.open(page_path) as image:
                image = image.convert("L")
                image.thumbnail((thumb_w - 10, thumb_h - 22))
                x = (index % 5) * thumb_w + (thumb_w - image.width) // 2
                y = (index // 5) * thumb_h + 4
                sheet.paste(image, (x, y))
                draw.text(((index % 5) * thumb_w + 5, (index // 5) * thumb_h + thumb_h - 15), str(start + index + 1), fill=20)
        out = root / f"KALLISTIS_v1.4_pages_{start + 1:03d}-{start + len(group):03d}.jpg"
        sheet.save(out, quality=88, optimize=True)
    shutil.rmtree(pages)
    print(f"contact_sheets={len(list(root.glob('KALLISTIS_v1.4_pages_*.jpg')))}")


if __name__ == "__main__":
    main()
