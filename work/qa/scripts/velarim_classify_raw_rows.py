#!/usr/bin/env python3
"""
velarim_classify_raw_rows.py

Classificação sistemática de cada uma das 226 linhas brutas da Seção 17
do Manual Expandido v2.0-RC1.
"""
import pathlib, json, hashlib

def sha256(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def main():
    m_exp_path = pathlib.Path("/home/tonyus-dev/Projetos/RPG/kallistis/docs/canon/source/VELARIM_MANUAL_EXPANDIDO_CONVERSACIONAL_v2.0-RC1.md")
    m_def_path = pathlib.Path("/home/tonyus-dev/Projetos/RPG/kallistis/docs/canon/VELARIM_MANUAL_DEFINITIVO_v1.0.md")

    m_def = m_def_path.read_text(encoding='utf-8')
    m_exp = m_exp_path.read_text(encoding='utf-8')

    core_records = []
    lines_def = m_def.splitlines()
    for idx in range(762, 810):
        line = lines_def[idx]
        if line.startswith("|") and not "---" in line and not "Forma" in line:
            parts = [p.strip() for p in line.split("|")[1:-1]]
            if len(parts) >= 5:
                core_records.append({
                    "forma": parts[0].strip("`* "),
                    "classe": parts[2].strip("`* "),
                    "significado": parts[3].strip("`* "),
                    "status": parts[4].strip("`* "),
                    "line": idx + 1
                })

    core_map = {cr["forma"].lower(): cr for cr in core_records}
    lines = m_exp.splitlines()

    raw_classifications = []
    core_overlaps_list = []
    seen_exp = set()

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
                    raw_idx = len(raw_classifications) + 1
                    
                    classe = parts[1].strip("`* ") if len(parts) > 1 else None
                    significado = parts[2].strip("`* ") if len(parts) > 2 else (parts[1].strip("`* ") if len(parts) > 1 else None)
                    status_part = parts[3].strip("`* ") if len(parts) > 3 else "HUMAN_APPROVED"
                    
                    classification = "expansion_unique"
                    exclusion_reason = None
                    linked_core = None
                    resulting_exp = None
                    
                    if f_lower in core_map:
                        classification = "exact_core_overlap"
                        exclusion_reason = f"Forma '{forma}' já catalogada no Núcleo 1.0 (L{core_map[f_lower]['line']})"
                        linked_core = core_map[f_lower]
                        
                        core_overlaps_list.append({
                            "expansion_form": forma,
                            "expansion_raw_index": raw_idx,
                            "core_form": core_map[f_lower]["forma"],
                            "core_line": core_map[f_lower]["line"],
                            "class_expansion": classe,
                            "class_core": core_map[f_lower]["classe"],
                            "meaning_expansion": significado,
                            "meaning_core": core_map[f_lower]["significado"],
                            "status_expansion": status_part,
                            "status_core": core_map[f_lower]["status"],
                            "source_text": line,
                            "source_sha256": sha256(line),
                            "overlap_type": "literal_duplicate" if classe == core_map[f_lower]["classe"] else "same_form_new_class",
                            "decision": "excluído_da_expansão_mantido_no_núcleo"
                        })
                    elif f_lower in seen_exp:
                        classification = "internal_exact_duplicate"
                        exclusion_reason = f"Duplicata interna da forma '{forma}' na Seção 17"
                    else:
                        seen_exp.add(f_lower)
                        resulting_exp = len(seen_exp)
                        
                    raw_classifications.append({
                        "raw_index": raw_idx,
                        "source_line": idx,
                        "source_text": line,
                        "source_sha256": sha256(line),
                        "forma": forma,
                        "classe": classe,
                        "significado": significado,
                        "status": status_part,
                        "classification": classification,
                        "exclusion_reason": exclusion_reason,
                        "linked_core_entry": linked_core,
                        "resulting_expansion_entry": resulting_exp
                    })

    class_counts = {}
    for rc in raw_classifications:
        c = rc["classification"]
        class_counts[c] = class_counts.get(c, 0) + 1

    p_raw = pathlib.Path("work/qa/velarim_expansion_raw_classification.json")
    p_raw.write_text(json.dumps({
        "total_raw_lines": len(raw_classifications),
        "classification_counts": class_counts,
        "classifications": raw_classifications
    }, indent=2, ensure_ascii=False), encoding='utf-8')

    p_overlap = pathlib.Path("work/qa/velarim_core_overlap_analysis.json")
    p_overlap.write_text(json.dumps({
        "total_overlaps": len(core_overlaps_list),
        "overlaps": core_overlaps_list
    }, indent=2, ensure_ascii=False), encoding='utf-8')

    print(f"Saved {p_raw} and {p_overlap}")

if __name__ == "__main__":
    main()
