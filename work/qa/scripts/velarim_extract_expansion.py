#!/usr/bin/env python3
"""
velarim_extract_expansion.py

Localização, extração e serialização individual dos 202 registros
da expansão conversacional Velarim v2.0 a partir das fontes canônicas.
"""
import pathlib, json, hashlib

def sha256(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def main():
    m_exp_path = pathlib.Path("/home/tonyus-dev/Projetos/RPG/kallistis/docs/canon/source/VELARIM_MANUAL_EXPANDIDO_CONVERSACIONAL_v2.0-RC1.md")
    m_app_path = pathlib.Path("/home/tonyus-dev/Projetos/RPG/kallistis/docs/canon/decisions/VELARIM_CONVERSACIONAL_V2_APPROVAL_2026-08-01.md")
    m_phr_path = pathlib.Path("/home/tonyus-dev/Projetos/RPG/kallistis/docs/canon/decisions/VELARIM_PHRASE_CORE_v0.2.md")
    corpus_manifest_path = pathlib.Path("work/qa/velarim_corpus_manifest.json")
    
    # Load core records dynamically from corpus manifest
    corpus_data = json.loads(corpus_manifest_path.read_text(encoding='utf-8'))
    core_48 = set(r["forma"].lower() for r in corpus_data["core_48_records"])
    
    # 1. Inventory of Candidates
    inventory = [
        {
            "caminho": str(m_exp_path),
            "título": "Velarim Manual Expandido Conversacional v2.0-RC1",
            "versão": "v2.0-RC1",
            "status": "HUMAN_APPROVED",
            "tamanho_bytes": len(m_exp_path.read_bytes()),
            "sha256": hashlib.sha256(m_exp_path.read_bytes()).hexdigest(),
            "quantidade_registros_declarada": 202,
            "formato": "Markdown Table",
            "possibilidade_extracao_automatica": True,
            "autoridade_documental": "Grau 2 - Fonte Conversacional Oficial"
        },
        {
            "caminho": str(m_app_path),
            "título": "Aprovação Canônica: Velarim Conversacional v2.0",
            "versão": "v2.0",
            "status": "HUMAN_APPROVED",
            "tamanho_bytes": len(m_app_path.read_bytes()),
            "sha256": hashlib.sha256(m_app_path.read_bytes()).hexdigest(),
            "quantidade_registros_declarada": 250,
            "formato": "Markdown Decision Document",
            "possibilidade_extracao_automatica": True,
            "autoridade_documental": "Grau 2 - Decisão Editorial v2.0"
        },
        {
            "caminho": str(m_phr_path),
            "título": "Velarim Phrase Core v0.2",
            "versão": "v0.2",
            "status": "EXPERIMENTAL",
            "tamanho_bytes": len(m_phr_path.read_bytes()),
            "sha256": hashlib.sha256(m_phr_path.read_bytes()).hexdigest(),
            "quantidade_registros_declarada": 48,
            "formato": "Markdown Table",
            "possibilidade_extracao_automatica": True,
            "autoridade_documental": "Grau 3 - Fonte Auxiliar"
        }
    ]
    
    p_inv = pathlib.Path("work/qa/velarim_expansion_source_inventory.json")
    p_inv.write_text(json.dumps(inventory, indent=2, ensure_ascii=False), encoding='utf-8')
    
    # 2. Extract 202 Expansion Records
    lines = m_exp_path.read_text(encoding='utf-8').splitlines()
    
    expansion_records = []
    seen = set()
    in_sec17 = False
    sec_name = "17. Vocabulário Conversacional Expandido"

    for idx, line in enumerate(lines, start=1):
        if "## 17." in line or "# 17." in line:
            in_sec17 = True
            sec_name = line.strip("# ")
        elif in_sec17 and (line.startswith("# ") or (line.startswith("## ") and not "17." in line)):
            in_sec17 = False
            
        if in_sec17 and line.startswith("|") and not "---" in line:
            parts = [p.strip() for p in line.split("|")[1:-1]]
            if parts:
                forma = parts[0].strip("`* ")
                if forma and forma not in ["Forma", "Termo", "Palavra", "Nº", "Total", "Status", "Variedade", "Português", "Sufixo", "Partícula", "Conceito", "ID"]:
                    f_lower = forma.lower()
                    if f_lower not in core_48 and f_lower not in seen:
                        seen.add(f_lower)
                        
                        classe = parts[1].strip("`* ") if len(parts) > 1 else None
                        significado = parts[2].strip("`* ") if len(parts) > 2 else (parts[1].strip("`* ") if len(parts) > 1 else None)
                        status_part = parts[3].strip("`* ") if len(parts) > 3 else "HUMAN_APPROVED"
                        
                        expansion_records.append({
                            "expansion_index": len(expansion_records) + 1,
                            "forma_literal": forma,
                            "forma_normativa": forma,
                            "ipa": None,
                            "classe_literal": classe,
                            "significado_literal": significado,
                            "status": status_part if status_part in ["CAN", "LEX_CAN", "SRC", "TECH", "PROV", "V1-CAN", "V1-TECH", "V1-SRC", "V2-OP"] else "HUMAN_APPROVED",
                            "registro_de_uso": sec_name,
                            "raiz_documentada": None,
                            "afixos_documentados": None,
                            "valência": None,
                            "exemplos": [],
                            "source_file": "VELARIM_MANUAL_EXPANDIDO_CONVERSACIONAL_v2.0-RC1.md",
                            "source_section": sec_name,
                            "source_line_start": idx,
                            "source_line_end": idx,
                            "source_text": line,
                            "source_sha256": sha256(line)
                        })

    exp_lexicon = {
        "summary": {
            "total_expansion_extracted": len(expansion_records),
            "source": "VELARIM_MANUAL_EXPANDIDO_CONVERSACIONAL_v2.0-RC1.md (Seção 17)"
        },
        "records": expansion_records
    }
    
    p_lex = pathlib.Path("work/qa/velarim_expansion_lexicon.json")
    p_lex.write_text(json.dumps(exp_lexicon, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"Saved {p_lex} with {len(expansion_records)} records!")

if __name__ == "__main__":
    main()
