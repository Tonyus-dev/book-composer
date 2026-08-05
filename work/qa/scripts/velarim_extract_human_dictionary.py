#!/usr/bin/env python3
"""
velarim_extract_human_dictionary.py

Extração e inventário integral dos verbetes humanos do Dicionário Conversacional 2.0
a partir das tabelas da Edição Humana Canônica (Seção 17 do Manual v2.0-RC1).
"""
import pathlib, json, hashlib

def sha256(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def main():
    m_exp_path = pathlib.Path("/home/tonyus-dev/Projetos/RPG/kallistis/docs/canon/source/VELARIM_MANUAL_EXPANDIDO_CONVERSACIONAL_v2.0-RC1.md")
    
    human_sources = [
        {
            "caminho": str(m_exp_path),
            "título": "Velarim Manual Expandido Conversacional v2.0-RC1 (Seção 17)",
            "versão": "v2.0-RC1",
            "status": "HUMAN_APPROVED",
            "sha256": hashlib.sha256(m_exp_path.read_bytes()).hexdigest(),
            "quantidade_verbetes_declarada": 223,
            "formato": "Markdown Tables (Seção 17)"
        }
    ]

    lines = m_exp_path.read_text(encoding='utf-8').splitlines()
    human_verbetes = []
    
    in_sec17 = False
    sec_name = "17. Vocabulário Conversacional Expandido"

    for idx, line in enumerate(lines, start=1):
        if "## 17." in line or "# 17." in line:
            in_sec17 = True
        elif in_sec17 and (line.startswith("# ") or (line.startswith("## ") and not "17." in line)):
            in_sec17 = False
            
        if in_sec17 and line.startswith("|") and not "---" in line:
            parts = [p.strip() for p in line.split("|")[1:-1]]
            if parts:
                forma = parts[0].strip("`* ")
                if forma and forma not in ["Forma", "Termo", "Palavra", "Nº", "Total", "Status", "Variedade", "Português", "Sufixo", "Partícula", "Conceito", "ID"]:
                    classe = parts[1].strip("`* ") if len(parts) > 1 else None
                    significado = parts[2].strip("`* ") if len(parts) > 2 else (parts[1].strip("`* ") if len(parts) > 1 else None)
                    
                    human_verbetes.append({
                        "human_entry_index": len(human_verbetes) + 1,
                        "forma_literal": forma,
                        "classe_literal": classe,
                        "significado_literal": significado,
                        "seção": sec_name,
                        "tabela": "Seção 17 Dicionário Conversacional",
                        "linha": idx,
                        "source_text": line,
                        "source_sha256": sha256(line)
                    })

    human_dict_manifest = {
        "sources": human_sources,
        "summary": {
            "declared_human_verbetes": 223,
            "extracted_human_verbetes": len(human_verbetes), # 226 verbetes extraídos da Seção 17
            "raw_section_17_rows": len(human_verbetes)
        },
        "verbetes": human_verbetes
    }
    
    p_h = pathlib.Path("work/qa/velarim_human_dictionary_inventory.json")
    p_h.write_text(json.dumps(human_dict_manifest, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"Saved {p_h} with {len(human_verbetes)} human dictionary verbetes!")

if __name__ == "__main__":
    main()
