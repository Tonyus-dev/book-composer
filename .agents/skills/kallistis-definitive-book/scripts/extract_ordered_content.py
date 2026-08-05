#!/usr/bin/env python3
"""
extract_ordered_content.py

Extrai o conteúdo ordenado (parágrafos + tabelas) do DOCX para auditoria.
Não cria fontes editoriais nem reconstrói o livro.
Saída: JSON com a ordem exata dos elementos do body.

Uso:
  python extract_ordered_content.py <source_docx> <output_json>
"""

import sys, json, pathlib, hashlib
from docx import Document
from docx.oxml.ns import qn


def sha256(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def run_text(para):
    return "".join(r.text for r in para.runs if r.text)


def cell_text(cell):
    return "\n".join(p.text for p in cell.paragraphs).strip()


def main():
    if len(sys.argv) != 3:
        print("Uso: extract_ordered_content.py <source_docx> <output_json>")
        sys.exit(1)
    src = pathlib.Path(sys.argv[1])
    out = pathlib.Path(sys.argv[2])
    out.parent.mkdir(parents=True, exist_ok=True)
    doc = Document(str(src))

    elements = []
    para_idx = 0
    tbl_idx = 0
    body = doc.element.body

    for child in body:
        tag = child.tag.split("}")[-1]
        if tag == "p":
            from docx.text.paragraph import Paragraph
            para = Paragraph(child, doc)
            text = run_text(para)
            elements.append({
                "order": len(elements),
                "type": "paragraph",
                "para_index": para_idx,
                "style": para.style.name if para.style else "",
                "text": text,
                "hash": sha256(text),
            })
            para_idx += 1
        elif tag == "tbl":
            from docx.table import Table
            table = Table(child, doc)
            rows = []
            for row in table.rows:
                rows.append([cell_text(c) for c in row.cells])
            elements.append({
                "order": len(elements),
                "type": "table",
                "table_index": tbl_idx,
                "row_count": len(rows),
                "col_count": len(rows[0]) if rows else 0,
                "rows": rows,
                "hash": sha256(json.dumps(rows, ensure_ascii=False)),
            })
            tbl_idx += 1

    out.write_text(json.dumps(elements, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[extract_ordered_content] {len(elements)} elementos extraídos → {out}")


if __name__ == "__main__":
    main()
