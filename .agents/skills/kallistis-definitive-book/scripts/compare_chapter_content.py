#!/usr/bin/env python3
"""
compare_chapter_content.py

Compara o conteúdo de um trecho do working_copy.docx com o baseline,
detectando qualquer alteração de texto em parágrafos já revisados.

Uso:
  python compare_chapter_content.py <baseline_hashes_json> <working_docx> [--chapter "NOME"]
"""
import sys, json, pathlib, hashlib, argparse
from docx import Document


def sha256(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def run_text(para):
    return "".join(r.text for r in para.runs if r.text)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("baseline_hashes_json")
    parser.add_argument("working_docx")
    parser.add_argument("--chapter", default=None)
    args = parser.parse_args()

    baseline = json.loads(pathlib.Path(args.baseline_hashes_json).read_text(encoding="utf-8"))
    baseline_map = {e["para_index"]: e for e in baseline}

    doc = Document(args.working_docx)
    mismatches = []
    checked = 0
    current_chapter = ""
    for i, para in enumerate(doc.paragraphs):
        style = para.style.name if para.style else ""
        text_raw = run_text(para)
        if style.startswith("Heading 1") and text_raw.strip():
            current_chapter = text_raw.strip()
        if args.chapter and args.chapter not in current_chapter:
            continue
        text = text_raw
        h = sha256(text)
        if i in baseline_map and baseline_map[i]["hash"] != h:
            mismatches.append({
                "para_index": i,
                "baseline_preview": baseline_map[i].get("text_preview", "")[:80],
                "working_text": text[:80],
                "baseline_hash": baseline_map[i]["hash"],
                "working_hash": h,
            })
        checked += 1

    result = {"checked": checked, "mismatches": len(mismatches), "detail": mismatches}
    print(json.dumps(result, indent=2, ensure_ascii=False))
    sys.exit(0 if not mismatches else 1)


if __name__ == "__main__":
    main()
