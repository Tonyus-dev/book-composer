#!/usr/bin/env python3
"""
audit_docx_structure.py

Audita a estrutura interna do DOCX: seções, cabeçalhos/rodapés,
bookmarks, campos, relações de imagem, estilos e orientação de páginas.

Uso:
  python audit_docx_structure.py <docx_file> <output_json>
"""
import sys, json, pathlib, zipfile
from docx import Document
from docx.oxml.ns import qn
from lxml import etree


def get_section_props(doc):
    sections = []
    body = doc.element.body
    for child in body:
        tag = child.tag.split("}")[-1]
        if tag == "sectPr":
            pgSz = child.find(qn("w:pgSz"))
            orient = "portrait"
            if pgSz is not None:
                w = int(pgSz.get(qn("w:w"), 0))
                h = int(pgSz.get(qn("w:h"), 0))
                if w > h:
                    orient = "landscape"
            sections.append({"orientation": orient, "w": w if pgSz is not None else 0, "h": h if pgSz is not None else 0})
    # Add document-level section
    final_sect = doc.element.body.find(qn("w:sectPr"))
    if final_sect is not None:
        pgSz = final_sect.find(qn("w:pgSz"))
        orient = "portrait"
        w = h = 0
        if pgSz is not None:
            w = int(pgSz.get(qn("w:w"), 0))
            h = int(pgSz.get(qn("w:h"), 0))
            if w > h:
                orient = "landscape"
        sections.append({"orientation": orient, "w": w, "h": h, "is_document_level": True})
    return sections


def get_bookmarks(doc):
    bmarks = []
    for bm in doc.element.body.iter(qn("w:bookmarkStart")):
        bmarks.append({
            "id": bm.get(qn("w:id")),
            "name": bm.get(qn("w:name")),
        })
    return bmarks


def get_fields(doc):
    fields = []
    for fld in doc.element.body.iter(qn("w:fldChar")):
        ftype = fld.get(qn("w:fldCharType"))
        if ftype == "begin":
            fields.append({"type": "fldChar"})
    for fld in doc.element.body.iter(qn("w:instrText")):
        if fld.text:
            fields.append({"instrText": fld.text.strip()[:80]})
    return fields


def get_styles(doc):
    styles_used = set()
    for para in doc.paragraphs:
        if para.style:
            styles_used.add(para.style.name)
    return sorted(styles_used)


def get_relationships(docx_path):
    rels = []
    with zipfile.ZipFile(str(docx_path)) as zf:
        rel_files = [n for n in zf.namelist() if n.endswith(".rels")]
        for rf in rel_files:
            content = zf.read(rf).decode("utf-8")
            root = etree.fromstring(content.encode("utf-8"))
            for rel in root:
                rtype = rel.get("Type", "")
                target = rel.get("Target", "")
                if "image" in rtype.lower() or "media" in target.lower():
                    rels.append({"rel_file": rf, "type": rtype.split("/")[-1], "target": target})
    return rels


def main():
    if len(sys.argv) != 3:
        print("Uso: audit_docx_structure.py <docx_file> <output_json>")
        sys.exit(1)
    docx_path = pathlib.Path(sys.argv[1])
    out = pathlib.Path(sys.argv[2])
    out.parent.mkdir(parents=True, exist_ok=True)

    doc = Document(str(docx_path))

    sections = get_section_props(doc)
    bookmarks = get_bookmarks(doc)
    fields = get_fields(doc)
    styles = get_styles(doc)
    image_rels = get_relationships(docx_path)

    landscape_count = sum(1 for s in sections if s.get("orientation") == "landscape")

    result = {
        "total_sections": len(sections),
        "landscape_sections": landscape_count,
        "sections": sections,
        "total_bookmarks": len(bookmarks),
        "bookmarks_sample": bookmarks[:20],
        "total_fields": len(fields),
        "fields_sample": fields[:20],
        "styles_used": styles,
        "total_styles": len(styles),
        "image_relationships": len(image_rels),
        "image_rels_sample": image_rels[:10],
    }

    out.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[audit_docx_structure] seções: {len(sections)}, bookmarks: {len(bookmarks)}, campos: {len(fields)}, estilos: {len(styles)} → {out}")


if __name__ == "__main__":
    main()
