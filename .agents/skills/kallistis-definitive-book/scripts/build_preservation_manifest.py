#!/usr/bin/env python3
"""
build_preservation_manifest.py

Gera um manifest de preservação comparando hashes de parágrafos entre
o baseline e a cópia de trabalho. Detecta qualquer alteração de texto.

Uso:
  python build_preservation_manifest.py <baseline_dir> <working_docx> <output_json>
"""

import sys, json, pathlib, hashlib
from docx import Document


def sha256(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def run_text(para):
    return "".join(r.text for r in para.runs if r.text)


def collect_hashes(docx_path):
    doc = Document(str(docx_path))
    hashes = []
    for i, para in enumerate(doc.paragraphs):
        text = run_text(para)
        hashes.append({"para_index": i, "text_preview": text[:60], "hash": sha256(text)})
    return hashes


def main():
    if len(sys.argv) != 4:
        print("Uso: build_preservation_manifest.py <baseline_dir> <working_docx> <output_json>")
        sys.exit(1)
    baseline_dir = pathlib.Path(sys.argv[1])
    working_docx = pathlib.Path(sys.argv[2])
    out = pathlib.Path(sys.argv[3])
    out.parent.mkdir(parents=True, exist_ok=True)

    baseline_hashes_path = baseline_dir / "source_text_hashes.json"
    if not baseline_hashes_path.is_file():
        print(f"ERRO: {baseline_hashes_path} não encontrado. Gere o baseline primeiro.")
        sys.exit(1)
    baseline_hashes = json.loads(baseline_hashes_path.read_text(encoding="utf-8"))
    baseline_by_idx = {e["para_index"]: e["hash"] for e in baseline_hashes}

    working_hashes = collect_hashes(working_docx)

    mismatches = []
    for entry in working_hashes:
        idx = entry["para_index"]
        bh = baseline_by_idx.get(idx)
        if bh is None:
            mismatches.append({"para_index": idx, "issue": "not_in_baseline", "preview": entry["text_preview"]})
        elif bh != entry["hash"]:
            mismatches.append({
                "para_index": idx,
                "issue": "hash_mismatch",
                "preview": entry["text_preview"],
                "baseline_hash": bh,
                "working_hash": entry["hash"],
            })

    result = {
        "baseline_para_count": len(baseline_hashes),
        "working_para_count": len(working_hashes),
        "mismatches_count": len(mismatches),
        "preserved": len(mismatches) == 0,
        "mismatches": mismatches,
    }
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    status = "PRESERVADO" if result["preserved"] else f"DIVERGÊNCIAS: {len(mismatches)}"
    print(f"[build_preservation_manifest] {status} → {out}")
    sys.exit(0 if result["preserved"] else 1)


if __name__ == "__main__":
    main()
