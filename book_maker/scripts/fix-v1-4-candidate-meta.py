#!/usr/bin/env python3
"""Corrige apenas metadado editorial duplicado no candidato; não toca no manuscrito."""

import json
import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit("uso: fix-v1-4-candidate-meta.py CANDIDATE.json")
path = Path(sys.argv[1])
book = json.loads(path.read_text(encoding="utf-8"))
meta = book.get("meta", {})
edition = meta.get("edition")
if isinstance(edition, str):
    duplicate = " · continuação Partes II–IV"
    while edition.count(duplicate) > 1:
        edition = edition.replace(duplicate + duplicate, duplicate)
    meta["edition"] = edition
meta["title"] = "KALLISTIS — Manual do Mundo"
meta["prepressGrayscale"] = True
path.write_text(json.dumps(book, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(meta.get("edition", ""))
