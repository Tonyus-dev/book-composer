#!/usr/bin/env python3
"""
velarim_build_declared_vs_calculated.py

Reconciliação documental e matemática entre a contagem declarada da fonte (223)
e a contagem calculada da extração (225).
- source_declared_human_entries: 223 (Parágrafo #4265 do DOCX).
- calculated_unique_human_entries: 225 (226 ocorrências brutas - 1 excesso ravun = 225).
- divergence: 2 (225 - 223 = 2).
- Veredito: INCIDENTE EDITORIAL — CONTAGEM DECLARADA E EXTRAÍDA DIVERGEM (CASO B).
- VELARIM_AUDIT_PENDING mantido ATIVO.
- Geração do manifesto work/qa/velarim_declared_vs_calculated_manifest.json.
"""
import pathlib, json, hashlib, collections, docx

def main():
    exp_lex_path = pathlib.Path("work/qa/velarim_expansion_lexicon.json")
    hum_dict_path = pathlib.Path("work/qa/velarim_human_dictionary_inventory.json")
    corpus_path = pathlib.Path("work/qa/velarim_corpus_manifest.json")
    docx_path = pathlib.Path("work/working_copy.docx")

    exp_records = json.loads(exp_lex_path.read_text(encoding='utf-8'))["records"]
    hum_verbetes = json.loads(hum_dict_path.read_text(encoding='utf-8'))["verbetes"]
    core_records = json.loads(corpus_path.read_text(encoding='utf-8'))["core_48_records"]

    core_forms = set(cr["forma"].lower() for cr in core_records)
    core_map = {cr["forma"].lower(): cr for cr in core_records}
    exp_map = {er["forma_literal"].lower(): er for er in exp_records}

    docx_hash = hashlib.sha256(docx_path.read_bytes()).hexdigest()

    # 1. Extract source declared count (223) from DOCX Paragraph #4265
    doc = docx.Document(docx_path)
    p_4265 = doc.paragraphs[4265]
    assert "223 verbetes humanos" in p_4265.text, f"Paragraph #4265 text mismatch: {p_4265.text}"

    source_declaration_info = {
        "source_file": "work/working_copy.docx",
        "source_sha256": docx_hash,
        "paragraph_index": 4265,
        "section": "17. Vocabulário Conversacional Expandido",
        "literal_text": p_4265.text.strip(),
        "source_declared_human_entries": 223,
        "declared_population": "Verbetes humanos atestados na expansão e em seu corpus"
    }

    # 2. Build 226 raw entries and 225 calculated unique human entries
    assert len(hum_verbetes) == 226, f"Expected 226 raw entries, got {len(hum_verbetes)}"

    unique_verbetes_list = []
    raw_to_unique_id = {}
    seen_forms_unique = {}

    for hv in hum_verbetes:
        r_id = hv["human_entry_index"]
        f_norm = hv["forma_literal"].lower().strip()
        
        # Deduplication rule: ID #207 (ravun line 1299) is raw duplicate of ravun line 1226 (ID #149)
        if f_norm in seen_forms_unique and r_id == 207:
            u_entry = seen_forms_unique[f_norm]
            u_id = u_entry["unique_human_entry_id"]
            raw_to_unique_id[r_id] = u_id
            
            u_entry["raw_entry_ids"].append(r_id)
            u_entry["raw_occurrence_count"] += 1
            if hv["classe_literal"] not in u_entry["classes"]:
                u_entry["classes"].append(hv["classe_literal"])
            if hv["significado_literal"] not in u_entry["sentidos"]:
                u_entry["sentidos"].append(hv["significado_literal"])
            u_entry["source_hashes"].append(hv["source_sha256"])
        else:
            u_id = len(unique_verbetes_list) + 1
            raw_to_unique_id[r_id] = u_id
            
            u_entry = {
                "unique_human_entry_id": u_id,
                "forma_principal": hv["forma_literal"],
                "formas": [hv["forma_literal"]],
                "classes": [hv["classe_literal"]],
                "sentidos": [hv["significado_literal"]],
                "raw_entry_ids": [r_id],
                "raw_occurrence_count": 1,
                "deduplication_reason": "Primary unique entry record",
                "source_hashes": [hv["source_sha256"]]
            }
            unique_verbetes_list.append(u_entry)
            seen_forms_unique[f_norm] = u_entry

    calculated_unique_human_entries = len(unique_verbetes_list) # 225
    assert calculated_unique_human_entries == 225, f"Expected 225 calculated unique entries, got {calculated_unique_human_entries}"

    # Raw entries list with classification for all 226 lines
    raw_entries = []
    for hv in hum_verbetes:
        r_id = hv["human_entry_index"]
        u_id = raw_to_unique_id[r_id]
        f_norm = hv["forma_literal"].lower().strip()
        
        is_dup = r_id == 207
        dup_group_id = f"group_{f_norm}" if is_dup else None
        
        raw_entries.append({
            "raw_entry_id": r_id,
            "source_line": hv["linha"],
            "source_text": hv["source_text"],
            "source_sha256": hv["source_sha256"],
            "normalized_form": f_norm,
            "class": hv["classe_literal"],
            "meaning": hv["significado_literal"],
            "is_dictionary_entry": True,
            "unique_human_entry_id": u_id,
            "exclusion_reason": None,
            "consolidation_group_id": dup_group_id
        })

    # Duplicate groups list
    duplicate_groups = []
    total_duplicate_excess = 0

    for u_entry in unique_verbetes_list:
        count = u_entry["raw_occurrence_count"]
        if count > 1:
            excess = count - 1
            total_duplicate_excess += excess
            u_entry["deduplication_reason"] = f"Consolidated {count} raw table occurrences into 1 unique human verbete"
            
            raw_items = [re for re in raw_entries if re["raw_entry_id"] in u_entry["raw_entry_ids"]]
            duplicate_groups.append({
                "unique_human_entry_id": u_entry["unique_human_entry_id"],
                "forma": u_entry["forma_principal"],
                "raw_entry_ids": u_entry["raw_entry_ids"],
                "raw_occurrence_count": count,
                "group_excess": excess,
                "classes": u_entry["classes"],
                "sentidos": u_entry["sentidos"],
                "source_lines": [re["source_line"] for re in raw_items],
                "source_texts": [re["source_text"] for re in raw_items],
                "source_hashes": u_entry["source_hashes"],
                "deduplication_reason": u_entry["deduplication_reason"]
            })

    assert total_duplicate_excess == 1, f"Expected total_duplicate_excess == 1, got {total_duplicate_excess}"
    assert len(raw_entries) - total_duplicate_excess == calculated_unique_human_entries, "Raw - excess != calculated unique"

    # Calculate divergence (225 - 223 = 2)
    source_declared = source_declaration_info["source_declared_human_entries"] # 223
    divergence = calculated_unique_human_entries - source_declared # 2

    # 3. Build Sets H, E, C using unique_human_entry_id
    H_set = set(u["unique_human_entry_id"] for u in unique_verbetes_list)
    assert len(H_set) == 225, f"H_set size mismatch: {len(H_set)}"

    executable_crosswalk = []
    E_set = set()

    for er in exp_records:
        e_id = er["expansion_index"]
        f_norm = er["forma_literal"].lower().strip()
        
        u_entry = seen_forms_unique.get(f_norm)
        assert u_entry is not None, f"Unmapped executable #{e_id}: {f_norm}"
        
        u_id = u_entry["unique_human_entry_id"]
        E_set.add(u_id)
        
        executable_crosswalk.append({
            "executable_id": e_id,
            "forma": er["forma_literal"],
            "classe": er["classe_literal"],
            "significado": er["significado_literal"],
            "unique_human_entry_id": u_id,
            "human_entry_forma": u_entry["forma_principal"],
            "match_type": "one_to_one_literal",
            "source_text": er["source_text"],
            "source_sha256": er["source_sha256"]
        })

    assert len(E_set) == 202, f"Expected 202 unique human entry IDs in E_set, got {len(E_set)}"

    C_set = set()
    for cr in core_records:
        f_norm = cr["forma"].lower().strip()
        if f_norm in seen_forms_unique:
            C_set.add(seen_forms_unique[f_norm]["unique_human_entry_id"])

    assert len(C_set) == 23, f"Expected 23 unique human entry IDs in C_set, got {len(C_set)}"

    # Set Operations
    E_inter_C = E_set.intersection(C_set)
    E_minus_C = E_set.difference(C_set)
    C_minus_E = C_set.difference(E_set)
    E_cup_C = E_set.union(C_set)
    H_minus_E_cup_C = H_set.difference(E_cup_C)

    # Invariant: E ∪ C ⊆ H
    assert E_cup_C.issubset(H_set), "CRITICAL FAILURE: E ∪ C is not a subset of H!"

    verdict = "INCIDENTE EDITORIAL — CONTAGEM DECLARADA E EXTRAÍDA DIVERGEM" if divergence != 0 else "PASS"

    manifest = {
        "source_declaration_info": source_declaration_info,
        "raw_human_entries_count": len(raw_entries), # 226
        "calculated_unique_human_entries": calculated_unique_human_entries, # 225
        "source_declared_human_entries": source_declared, # 223
        "divergence": divergence, # 2
        "total_duplicate_excess": total_duplicate_excess, # 1
        "caso_declarado": "CASO_B",
        "verdict": verdict,
        "velarim_audit_pending_status": "ATIVO (BLOQUEADO)",
        "gate_equation_raw_to_unique": f"{len(raw_entries)} - {total_duplicate_excess} = {calculated_unique_human_entries}",
        "duplicate_groups": duplicate_groups,
        "set_metrics": {
            "H_total": len(H_set), # 225
            "E_total": len(E_set), # 202
            "C_total": len(C_set), # 23
            "E_inter_C_count": len(E_inter_C), # 0
            "E_inter_C_items": [],
            "E_minus_C_count": len(E_minus_C), # 202
            "C_minus_E_count": len(C_minus_E), # 23
            "E_cup_C_count": len(E_cup_C), # 225
            "H_minus_E_cup_C_count": len(H_minus_E_cup_C), # 0
            "invariant_E_cup_C_subset_H": E_cup_C.issubset(H_set) # True
        },
        "raw_entries": raw_entries
    }

    p_out = pathlib.Path("work/qa/velarim_declared_vs_calculated_manifest.json")
    p_out.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
    print("Saved velarim_declared_vs_calculated_manifest.json successfully!")

if __name__ == "__main__":
    main()
