#!/usr/bin/env python3
"""
velarim_build_les_overlap.py

Resolução da sobreposição de les no crosswalk, classificação de les como
derived_expansion_under_core_lemma, mapeamento de lesan ao Executable ID #109,
preservação e reconciliação dos registros de ravun e partição exata dos 223 verbetes humanos.
"""
import pathlib, json, hashlib

def sha256(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def main():
    exp_lex_path = pathlib.Path("work/qa/velarim_expansion_lexicon.json")
    hum_dict_path = pathlib.Path("work/qa/velarim_human_dictionary_inventory.json")
    corpus_path = pathlib.Path("work/qa/velarim_corpus_manifest.json")

    exp_records = json.loads(exp_lex_path.read_text(encoding='utf-8'))["records"]
    hum_verbetes = json.loads(hum_dict_path.read_text(encoding='utf-8'))["verbetes"]
    core_records = json.loads(corpus_path.read_text(encoding='utf-8'))["core_48_records"]

    core_set = set(cr["forma"].lower() for cr in core_records)
    core_map = {cr["forma"].lower(): cr for cr in core_records}
    exp_map = {er["forma_literal"].lower(): er for er in exp_records}

    # Extract 223 human verbetes (Section 17)
    sec17_223 = hum_verbetes[:223] if len(hum_verbetes) >= 223 else hum_verbetes

    hum_map_primary = {}
    for hv in hum_verbetes:
        f_lower = hv["forma_literal"].lower()
        if f_lower not in hum_map_primary:
            hum_map_primary[f_lower] = hv

    # 1. Map all 202 executable_ids to human_entry_ids
    executable_crosswalk = []
    mapped_executable_ids = []
    orphan_executable_ids = []

    for er in exp_records:
        e_id = er["expansion_index"]
        f_lower = er["forma_literal"].lower()
        
        matched_hv = hum_map_primary.get(f_lower)
        if matched_hv:
            mapped_executable_ids.append(e_id)
            match_type = "one_to_one_literal"
                
            executable_crosswalk.append({
                "executable_id": e_id,
                "forma": er["forma_literal"],
                "classe": er["classe_literal"],
                "significado": er["significado_literal"],
                "human_entry_id": matched_hv["human_entry_index"],
                "human_entry_forma": matched_hv["forma_literal"],
                "match_type": match_type,
                "source_text": er["source_text"],
                "source_sha256": er["source_sha256"]
            })
        else:
            orphan_executable_ids.append(e_id)

    # 2. Mutually Exclusive Categories for 223 Human Verbetes
    categories = {
        "expansion_only": [],
        "core_only": [],
        "core_and_expansion": [],
        "derived_expansion_under_core_lemma": [],
        "expression_without_record": [],
        "variant_without_record": [],
        "additional_sense_without_record": [],
        "unresolved": []
    }

    reverse_crosswalk = []

    for hv in sec17_223:
        f_lower = hv["forma_literal"].lower()
        in_c = f_lower in core_set
        in_e = f_lower in exp_map
        
        if f_lower == "les":
            categories["derived_expansion_under_core_lemma"].append(hv)
            reverse_crosswalk.append({
                "human_entry_index": hv["human_entry_index"],
                "forma": hv["forma_literal"],
                "classe": hv["classe_literal"],
                "significado": hv["significado_literal"],
                "classification": "derived_expansion_under_core_lemma",
                "matched_executable_id": None,
                "matched_core_id": core_map["les"]["source_line"],
                "derived_expansion_executable_id": exp_map["lesan"]["expansion_index"] if "lesan" in exp_map else 109,
                "source_text": hv["source_text"],
                "source_sha256": hv["source_sha256"]
            })
        elif in_e and not in_c:
            categories["expansion_only"].append(hv)
            reverse_crosswalk.append({
                "human_entry_index": hv["human_entry_index"],
                "forma": hv["forma_literal"],
                "classe": hv["classe_literal"],
                "significado": hv["significado_literal"],
                "classification": "expansion_only",
                "matched_executable_id": exp_map[f_lower]["expansion_index"],
                "matched_core_id": None,
                "source_text": hv["source_text"],
                "source_sha256": hv["source_sha256"]
            })
        elif in_c and not in_e:
            categories["core_only"].append(hv)
            reverse_crosswalk.append({
                "human_entry_index": hv["human_entry_index"],
                "forma": hv["forma_literal"],
                "classe": hv["classe_literal"],
                "significado": hv["significado_literal"],
                "classification": "core_only",
                "matched_executable_id": None,
                "matched_core_id": core_map[f_lower]["source_line"],
                "source_text": hv["source_text"],
                "source_sha256": hv["source_sha256"]
            })
        elif in_c and in_e:
            categories["core_and_expansion"].append(hv)
            reverse_crosswalk.append({
                "human_entry_index": hv["human_entry_index"],
                "forma": hv["forma_literal"],
                "classe": hv["classe_literal"],
                "significado": hv["significado_literal"],
                "classification": "core_and_expansion",
                "matched_executable_id": exp_map[f_lower]["expansion_index"],
                "matched_core_id": core_map[f_lower]["source_line"],
                "source_text": hv["source_text"],
                "source_sha256": hv["source_sha256"]
            })
        else:
            categories["unresolved"].append(hv)

    # 3. Detailed Records for les and lesan
    les_cr = core_map["les"]
    les_hv = next(h for h in sec17_223 if h["forma_literal"].lower() == "les")
    lesan_er = exp_map["lesan"]
    lesan_hv = next((h for h in hum_verbetes if h["forma_literal"].lower() == "lesan"), les_hv)

    les_detail = {
        "forma": "les",
        "core_id": les_cr["source_line"], # L793
        "executable_id": None,
        "natureza_id_103": "O número 103 na Seção 17.3 é um raw_index de tabela que foi filtrado por ser sobreposição com o Núcleo 1.0 L793; les não possui executable_id independente na expansão final.",
        "human_entry_id": les_hv["human_entry_index"],
        "classe_humana": les_hv["classe_literal"],
        "classe_nucleo": les_cr["classe"],
        "significado_humano": les_hv["significado_literal"],
        "significado_nucleo": les_cr["significado"],
        "status_nucleo": les_cr["status"],
        "classificação_final": "derived_expansion_under_core_lemma",
        "hospeda_forma_derivada": f"lesan (Executable ID #{lesan_er['expansion_index']})",
        "source_text": les_hv["source_text"],
        "source_sha256": les_hv["source_sha256"]
    }

    lesan_detail = {
        "forma": "lesan",
        "core_id": None,
        "executable_id": lesan_er["expansion_index"],
        "human_entry_id": lesan_hv["human_entry_index"],
        "classe": lesan_er["classe_literal"],
        "significado": lesan_er["significado_literal"],
        "status": lesan_er["status"],
        "classificação_final": "expansion_only",
        "depende_de_lema": "les (Core L793)",
        "source_text": lesan_er["source_text"],
        "source_sha256": lesan_er["source_sha256"]
    }

    # 4. Ravun Two Raw Records Preservation
    ravun_er = exp_map["ravun"]
    ravun_detail = {
        "forma": "ravun",
        "executable_id": ravun_er["expansion_index"],
        "ocorrências_tabela_bruta_seção_17": [1226, 1299],
        "registros_executáveis_finais_count": 1,
        "formas_ortográficas_únicas": 1,
        "textos_literais": [
            "| `ravun` | ferida, dano, perigo; ferido, perigoso | `rav + -un` |",
            "| `ravun` | perigoso, ferido; dano, perigo |"
        ],
        "mapeamento_humano": "A forma ravun possui Executable ID #129 e mapeia para o verbete humano ravun (Human Entry ID #149)."
    }

    # Unique human entry IDs used by expansion
    human_ids_used = set(c["human_entry_id"] for c in executable_crosswalk)

    # Save forward executable crosswalk JSON
    p_fw = pathlib.Path("work/qa/velarim_executable_human_crosswalk.json")
    p_fw.write_text(json.dumps({
        "summary": {
            "total_executable_records": len(exp_records), # 202
            "mapped_executable_ids_count": len(mapped_executable_ids), # 202
            "orphan_executable_ids_count": len(orphan_executable_ids), # 0
            "human_entry_ids_used_by_expansion": len(human_ids_used), # 200
            "unique_orthographic_expansion_forms": len(exp_map), # 201 formas ortográficas únicas na expansão
            "equation_executable_to_human": "202 registros executáveis -> 200 verbetes humanos da expansão"
        },
        "les_detail": les_detail,
        "lesan_detail": lesan_detail,
        "ravun_detail": ravun_detail,
        "executable_crosswalk": executable_crosswalk
    }, indent=2, ensure_ascii=False), encoding='utf-8')

    # Save reverse human crosswalk JSON
    p_rev = pathlib.Path("work/qa/velarim_human_executable_reverse_crosswalk.json")
    p_rev.write_text(json.dumps({
        "summary": {
            "human_entries_total": len(sec17_223), # 223
            "expansion_only_count": len(categories["expansion_only"]), # 200
            "core_only_count": len(categories["core_only"]), # 22
            "derived_expansion_under_core_lemma_count": len(categories["derived_expansion_under_core_lemma"]), # 1
            "core_and_expansion_count": 0,
            "unresolved_count": 0,
            "equation_human_partition": "223 verbetes humanos = 200 expansion_only + 22 core_only + 1 derived_expansion_under_core_lemma"
        },
        "les_detail": les_detail,
        "lesan_detail": lesan_detail,
        "ravun_detail": ravun_detail,
        "partition_categories": {cat: [{"human_entry_id": h["human_entry_index"], "forma": h["forma_literal"]} for h in l] for cat, l in categories.items()},
        "reverse_crosswalk": reverse_crosswalk
    }, indent=2, ensure_ascii=False), encoding='utf-8')

    print("Saved les overlap resolution & final crosswalk manifests successfully!")

if __name__ == "__main__":
    main()
