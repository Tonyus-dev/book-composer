#!/usr/bin/env python3
"""
inventory_docx.py

Gera os manifests de baseline a partir de um DOCX protegido.

Saída (em work/baseline/):
  document_inventory.json
  heading_tree.json
  table_manifest.json
  image_manifest.json
  mechanical_values.json
  source_text_hashes.json
  summary.json

Uso:
  python inventory_docx.py <source_docx> <output_dir>
"""

import sys, json, re, hashlib, datetime, pathlib, zipfile
from docx import Document
from docx.oxml.ns import qn

MECH_CATEGORIES = {
    "formula_central": re.compile(
        r"(teste|rolar|d10|d6|acerto|dificuldade|grau|graus|bônus|penalidade|impulso|pressão)",
        re.I,
    ),
    "atributo": re.compile(
        r"\b(Força|Agilidade|Mente|Espírito|Presença|Vigor)\b", re.I
    ),
    "pericia": re.compile(
        r"\b(perícia|treino|especialização|perito)\b", re.I
    ),
    "recurso": re.compile(r"\b(recurso|ouro|prata|cobre|moeda)\b", re.I),
    "condicao": re.compile(
        r"\b(condição|exausto|ferido|incapacitado|morto)\b", re.I
    ),
    "combate": re.compile(
        r"\b(combate|ataque|defesa|iniciativa|turno|rodada|ação)\b", re.I
    ),
    "movimento": re.compile(
        r"\b(movimento|deslocamento|diagonal|adjacente|terreno)\b", re.I
    ),
    "dano": re.compile(
        r"\b(dano|proteção|resistência|armadura|multiplicador)\b", re.I
    ),
    "impulso_pressao": re.compile(r"\b(Impulso|Pressão|Ajudar|Predominância|Ressonância)\b"),
    "tecnica": re.compile(r"\b(técnica|manobra|postura)\b", re.I),
    "magia": re.compile(r"\b(magia|feitiço|conjuração|Evocação|evocação)\b", re.I),
    "arma": re.compile(r"\b(arma|espada|lança|arco|machado|adaga|bastão)\b", re.I),
    "armadura": re.compile(r"\b(armadura|escudo|proteção)\b", re.I),
    "artefato": re.compile(r"\b(artefato|relíquia|item mágico)\b", re.I),
    "sombra": re.compile(r"\b(Sombra|Fenda|Merge|Coro)\b"),
    "povo": re.compile(r"\b(Povo|Povos|raça|espécie)\b", re.I),
    "oficio": re.compile(r"\b(Ofício|classe|vocação)\b", re.I),
    "adversario": re.compile(r"\b(adversário|inimigo|monstro|criatura)\b", re.I),
    "progressao": re.compile(r"\b(progressão|experiência|XP|nível|avanço)\b", re.I),
    "velarim": re.compile(r"\b(Velarim|Vélarim)\b"),
}

NUMS_RE = re.compile(r"-?\d+(?:[,\.]\d+)?")


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def all_paragraphs_and_tables(doc):
    """Yield (type, obj) preserving document order via body XML."""
    body = doc.element.body
    for child in body:
        tag = child.tag.split("}")[-1]
        if tag == "p":
            from docx.text.paragraph import Paragraph
            yield "paragraph", Paragraph(child, doc)
        elif tag == "tbl":
            from docx.table import Table
            yield "table", Table(child, doc)
        elif tag == "sectPr":
            continue


def heading_level(para):
    style_name = para.style.name if para.style else ""
    if style_name.startswith("Heading"):
        try:
            return int(style_name.split()[-1])
        except ValueError:
            pass
    outline = para._element.find(qn("w:pPr"))
    if outline is not None:
        ol = outline.find(qn("w:outlineLvl"))
        if ol is not None:
            val = ol.get(qn("w:val"))
            if val is not None:
                return int(val) + 1
    return None


def run_text(para):
    return "".join(r.text for r in para.runs if r.text)


def table_to_dict(table, table_idx):
    rows = []
    for row in table.rows:
        cells = []
        for cell in row.cells:
            cells.append(cell.text.strip())
        rows.append(cells)
    # headers = first row
    headers = rows[0] if rows else []
    return {
        "table_index": table_idx,
        "headers": headers,
        "row_count": len(rows),
        "col_count": len(headers),
        "rows": rows,
        "hash": sha256(json.dumps(rows, ensure_ascii=False)),
    }


def extract_images(docx_path: pathlib.Path):
    images = []
    with zipfile.ZipFile(docx_path, "r") as zf:
        for name in sorted(zf.namelist()):
            if name.startswith("word/media/"):
                fname = name.split("/")[-1]
                if not fname:
                    continue
                info = zf.getinfo(name)
                images.append(
                    {
                        "filename": fname,
                        "path_in_zip": name,
                        "size_bytes": info.file_size,
                    }
                )
    return images


def build_mechanical_entries(paragraphs_data, tables_data):
    entries = []

    def add_entry(text, chapter, section, source_table_idx, table_name):
        nums = NUMS_RE.findall(text)
        for cat_name, pattern in MECH_CATEGORIES.items():
            if pattern.search(text):
                entries.append(
                    {
                        "categoria": cat_name,
                        "nome": text[:80].strip(),
                        "capítulo": chapter,
                        "seção": section,
                        "texto_literal": text,
                        "números_encontrados": nums,
                        "tabela_origem": table_name,
                        "indice_tabela": source_table_idx,
                        "hash": sha256(text),
                    }
                )
                break  # one category per entry

    for p in paragraphs_data:
        t = p["text"]
        if len(t.strip()) < 5:
            continue
        if NUMS_RE.search(t):
            add_entry(t, p.get("chapter", ""), p.get("section", ""), None, None)
        else:
            for pattern in MECH_CATEGORIES.values():
                if pattern.search(t):
                    add_entry(t, p.get("chapter", ""), p.get("section", ""), None, None)
                    break

    for tbl in tables_data:
        tbl_idx = tbl["table_index"]
        tbl_name = tbl["headers"][0] if tbl["headers"] else f"tabela_{tbl_idx}"
        for row in tbl["rows"][1:]:  # skip header row
            for cell in row:
                if len(cell.strip()) < 3:
                    continue
                if NUMS_RE.search(cell) or any(
                    p.search(cell) for p in MECH_CATEGORIES.values()
                ):
                    add_entry(cell, "", "", tbl_idx, tbl_name)

    return entries


def word_count(text):
    return len(text.split())


def main():
    if len(sys.argv) != 3:
        print("Uso: inventory_docx.py <source_docx> <output_dir>")
        sys.exit(1)

    source = pathlib.Path(sys.argv[1])
    out_dir = pathlib.Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    if not source.is_file():
        print(f"ERRO: arquivo não encontrado: {source}")
        sys.exit(1)

    doc = Document(str(source))

    # ── document_inventory ────────────────────────────────────────────────────
    paragraphs_data = []
    tables_data = []
    headings = []
    current_chapter = ""
    current_section = ""
    total_words = 0
    para_count = 0
    table_idx = 0

    for typ, obj in all_paragraphs_and_tables(doc):
        if typ == "paragraph":
            text = run_text(obj)
            lvl = heading_level(obj)
            if lvl is not None and text.strip():
                headings.append({"level": lvl, "text": text.strip(), "para_index": para_count})
                if lvl == 1:
                    current_chapter = text.strip()
                    current_section = ""
                elif lvl == 2:
                    current_section = text.strip()
            para_count += 1
            wc = word_count(text)
            total_words += wc
            paragraphs_data.append(
                {
                    "para_index": para_count,
                    "style": obj.style.name if obj.style else "",
                    "level": lvl,
                    "chapter": current_chapter,
                    "section": current_section,
                    "text": text,
                    "word_count": wc,
                    "hash": sha256(text),
                }
            )
        elif typ == "table":
            tbl_dict = table_to_dict(obj, table_idx)
            tbl_dict["chapter"] = current_chapter
            tbl_dict["section"] = current_section
            tables_data.append(tbl_dict)
            table_idx += 1

    # ── images ────────────────────────────────────────────────────────────────
    images_data = extract_images(source)

    # ── heading_tree ──────────────────────────────────────────────────────────
    heading_tree = []
    stack = []
    for h in headings:
        node = {"level": h["level"], "text": h["text"], "children": []}
        while stack and stack[-1]["level"] >= h["level"]:
            stack.pop()
        if stack:
            stack[-1]["children"].append(node)
        else:
            heading_tree.append(node)
        stack.append(node)

    # ── mechanical_values ─────────────────────────────────────────────────────
    mechanical_entries = build_mechanical_entries(paragraphs_data, tables_data)

    # ── source_text_hashes ────────────────────────────────────────────────────
    source_text_hashes = []
    for p in paragraphs_data:
        if p["text"].strip():
            source_text_hashes.append(
                {
                    "para_index": p["para_index"],
                    "hash": p["hash"],
                    "chapter": p["chapter"],
                }
            )

    # ── summary ───────────────────────────────────────────────────────────────
    # Count categories in mechanical_values
    cats = {}
    for e in mechanical_entries:
        cats[e["categoria"]] = cats.get(e["categoria"], 0) + 1

    # Detect Partes, chapters, appendices from headings
    partes = [h for h in headings if h["level"] == 1 and re.search(r"parte\b", h["text"], re.I)]
    chapters_list = [h for h in headings if h["level"] == 1]
    appendices = [h for h in headings if re.search(r"apêndice|appendix", h["text"], re.I)]

    summary = {
        "source_file": str(source),
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        "source_sha256": sha256(source.read_bytes().decode("latin-1", errors="replace")),
        "total_paragraphs": para_count,
        "total_words": total_words,
        "total_headings": len(headings),
        "total_tables": len(tables_data),
        "total_images": len(images_data),
        "total_mechanical_entries": len(mechanical_entries),
        "mechanical_categories": cats,
        "level1_headings_count": len(chapters_list),
        "detected_partes": len(partes),
        "detected_appendices": len(appendices),
    }

    def write_json(name, data):
        path = out_dir / name
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"  -> {path} ({len(data) if isinstance(data, list) else 'dict'} items)")

    print("[inventory_docx] Gerando manifests...")
    write_json("document_inventory.json", paragraphs_data)
    write_json("heading_tree.json", heading_tree)
    write_json("table_manifest.json", tables_data)
    write_json("image_manifest.json", images_data)
    write_json("mechanical_values.json", mechanical_entries)
    write_json("source_text_hashes.json", source_text_hashes)
    (out_dir / "summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"  -> {out_dir / 'summary.json'} (dict)")
    print("[inventory_docx] Concluído.")


if __name__ == "__main__":
    main()
