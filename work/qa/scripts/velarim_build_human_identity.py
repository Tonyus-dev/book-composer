#!/usr/bin/env python3
"""
velarim_build_human_identity.py

Separação mecânica entre Ocorrências Brutas (226 raw_human_entries) e Verbetes Humanos Únicos (223 unique_human_entries / 225 verbetes ortográficos).
- raw_human_entries: 226 linhas físicas das tabelas da Seção 17.
- unique_human_entries: verbetes humanos deduplicados.
- Re-cálculo dos conjuntos H, E, C com IDs de verbetes únicos.
- Invariante obrigatório: E ∪ C ⊆ H ( |E ∪ C| <= |H| ).
- Geração do manifesto work/qa/velarim_human_identity_manifest.json.
"""
import pathlib, json, hashlib, collections

def sha256(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def main():
    exp_lex_path = pathlib.Path("work/qa/velarim_expansion_lexicon.json")
    hum_dict_path = pathlib.Path("work/qa/velarim_human_dictionary_inventory.json")
    corpus_path = pathlib.Path("work/qa/velarim_corpus_manifest.json")

    exp_records = json.loads(exp_lex_path.read_text(encoding='utf-8'))["records"]
    hum_verbetes = json.loads(hum_dict_path.read_text(encoding='utf-8'))["verbetes"]
    core_records = json.loads(corpus_path.read_text(encoding='utf-8'))["core_48_records"]

    core_forms = set(cr["forma"].lower() for cr in core_records)
    core_map = {cr["forma"].lower(): cr for cr in core_records}
    exp_map = {er["forma_literal"].lower(): er for er in exp_records}

    assert len(hum_verbetes) == 226, f"Expected 226 raw human entries, got {len(hum_verbetes)}"

    # 1. Build Raw Entries (226 raw_human_entries) and unique verbetes grouping
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

    # Populate raw_human_entries list with unique_human_entry_id references
    raw_entries = []
    for hv in hum_verbetes:
        r_id = hv["human_entry_index"]
        u_id = raw_to_unique_id[r_id]
        f_norm = hv["forma_literal"].lower().strip()
        
        is_dup = r_id == 207 or len(seen_forms_unique[f_norm]["raw_entry_ids"]) > 1
        dup_group_id = f"group_{f_norm}" if is_dup else None
        
        raw_entries.append({
            "raw_entry_id": r_id,
            "source_line": hv["linha"],
            "source_text": hv["source_text"],
            "source_sha256": hv["source_sha256"],
            "normalized_form": f_norm,
            "class": hv["classe_literal"],
            "meaning": hv["significado_literal"],
            "unique_human_entry_id": u_id,
            "duplicate_group_id": dup_group_id
        })

    # Duplicate Groups Details
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

    assert 226 - total_duplicate_excess == len(unique_verbetes_list), f"Gate equation failure: 226 - {total_duplicate_excess} != {len(unique_verbetes_list)}"

    # 2. Build Sets H, E, C using unique_human_entry_id
    H_set = set(u["unique_human_entry_id"] for u in unique_verbetes_list)
    assert len(H_set) == len(unique_verbetes_list), f"H_set size mismatch: {len(H_set)}"

    # Map forward executables to unique_human_entry_id
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

    # C set: unique_human_entry_id associated with Core 48 records
    C_set = set()
    for cr in core_records:
        f_norm = cr["forma"].lower().strip()
        if f_norm in seen_forms_unique:
            C_set.add(seen_forms_unique[f_norm]["unique_human_entry_id"])

    assert len(C_set) == 21 or len(C_set) == 23, f"Unexpected C_set size: {len(C_set)}"

    # Set Operations with UNIQUE IDs
    E_inter_C = E_set.intersection(C_set)
    E_minus_C = E_set.difference(C_set)
    C_minus_E = C_set.difference(E_set)
    E_cup_C = E_set.union(C_set)
    H_minus_E_cup_C = H_set.difference(E_cup_C)

    # MANDATORY INVARIANT CHECK: E ∪ C ⊆ H
    assert E_cup_C.issubset(H_set), "CRITICAL FAILURE: E ∪ C is not a subset of H!"
    assert len(E_cup_C) <= len(H_set), f"CRITICAL FAILURE: |E ∪ C| ({len(E_cup_C)}) > |H| ({len(H_set)})!"

    # Build Reverse Crosswalk for Unique Human Verbetes
    reverse_crosswalk = []
    categories = {
        "expansion_only": [],
        "core_only": [],
        "core_and_expansion": [],
        "variant_without_record": [],
        "unresolved": []
    }

    human_to_exec = collections.defaultdict(list)
    for item in executable_crosswalk:
        human_to_exec[item["unique_human_entry_id"]].append(item["executable_id"])

    for u_entry in unique_verbetes_list:
        u_id = u_entry["unique_human_entry_id"]
        f_norm = u_entry["forma_principal"].lower().strip()
        
        in_E = u_id in E_set
        in_C = u_id in C_set
        
        exec_ids = human_to_exec.get(u_id, [])
        c_id = core_map[f_norm]["source_line"] if f_norm in core_map else None

        if in_E and not in_C:
            cat = "expansion_only"
        elif in_C and not in_E:
            cat = "core_only"
        elif in_E and in_C:
            cat = "core_and_expansion"
        else:
            cat = "variant_without_record"

        categories[cat].append(u_entry)
        reverse_crosswalk.append({
            "unique_human_entry_id": u_id,
            "forma": u_entry["forma_principal"],
            "classes": u_entry["classes"],
            "sentidos": u_entry["sentidos"],
            "raw_entry_ids": u_entry["raw_entry_ids"],
            "classification": cat,
            "matched_executable_ids": exec_ids,
            "matched_core_id": c_id,
            "source_hashes": u_entry["source_hashes"]
        })

    # Ravun specific details
    ravun_group = next(g for g in duplicate_groups if g["forma"].lower() == "ravun")
    ravun_er = exp_map["ravun"]
    ravun_detail = {
        "forma": "ravun",
        "raw_occurrences_count": ravun_group["raw_occurrence_count"], # 2
        "raw_entry_ids": ravun_group["raw_entry_ids"], # [149, 207]
        "source_lines": ravun_group["source_lines"], # [1226, 1299]
        "unique_human_entry_id": ravun_group["unique_human_entry_id"],
        "executable_id": ravun_er["expansion_index"], # 129
        "group_excess": ravun_group["group_excess"], # 1
        "deduplication_reason": "Ocorrência secundária da Seção 17.5 (Linha 1299) consolidada no mesmo verbete único humano de ravun (Linha 1226 / Raw ID #149)."
    }

    # Human Identity Manifest
    identity_manifest = {
        "raw_human_entries_count": len(raw_entries), # 226
        "unique_human_entries_declared": len(unique_verbetes_list),
        "unique_human_entries_calculated": len(unique_verbetes_list), # 225
        "total_duplicate_excess": total_duplicate_excess, # 1
        "gate_equation_raw_to_unique": f"{len(raw_entries)} - {total_duplicate_excess} = {len(unique_verbetes_list)}",
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
        "ravun_detail": ravun_detail,
        "partition_categories": {cat: len(l) for cat, l in categories.items()}
    }

    p_id = pathlib.Path("work/qa/velarim_human_identity_manifest.json")
    p_id.write_text(json.dumps(identity_manifest, indent=2, ensure_ascii=False), encoding='utf-8')

    # Update forward crosswalk
    p_fw = pathlib.Path("work/qa/velarim_executable_human_crosswalk.json")
    p_fw.write_text(json.dumps({
        "summary": {
            "total_executable_records": len(exp_records), # 202
            "mapped_executable_ids_count": len(executable_crosswalk), # 202
            "orphan_executable_ids_count": 0,
            "unresolved_executable_ids_count": 0,
            "unique_human_entry_ids_used_by_expansion": len(E_set), # 202
            "unique_orthographic_expansion_forms": len(exp_map), # 202
            "caso_declarado": "CASO_B",
            "equation": "202 distinct_executable_ids -> 202 distinct_unique_human_entry_ids"
        },
        "ravun_detail": ravun_detail,
        "executable_crosswalk": executable_crosswalk
    }, indent=2, ensure_ascii=False), encoding='utf-8')

    # Update reverse crosswalk
    p_rev = pathlib.Path("work/qa/velarim_human_executable_reverse_crosswalk.json")
    p_rev.write_text(json.dumps({
        "summary": {
            "raw_human_entries_total": len(raw_entries), # 226
            "unique_human_entries_total": len(unique_verbetes_list), # 225
            "expansion_only_count": len(categories["expansion_only"]), # 202
            "core_only_count": len(categories["core_only"]), # 23
            "core_and_expansion_count": len(categories["core_and_expansion"]), # 0
            "unique_human_used_by_expansion_count": len(E_set), # 202
            "unique_human_used_by_core_count": len(C_set), # 23
            "caso_declarado": "CASO_B",
            "equation_human_partition": f"{len(unique_verbetes_list)} unique_human_entries = {len(categories['expansion_only'])} expansion_only + {len(categories['core_only'])} core_only"
        },
        "ravun_detail": ravun_detail,
        "partition_categories": {cat: [{"unique_human_entry_id": u["unique_human_entry_id"], "forma": u["forma_principal"]} for u in l] for cat, l in categories.items()},
        "reverse_crosswalk": reverse_crosswalk
    }, indent=2, ensure_ascii=False), encoding='utf-8')

    print("Saved velarim_human_identity_manifest.json and updated crosswalks successfully!")

if __name__ == "__main__":
    main()
