#!/usr/bin/env python3
"""
test_velarim_audit.py

Testes de validação automatizada da reconstrução do baseline canônico de Velarim.
Todos os 25 testes devem passar com EXIT 0.
"""
import sys, pathlib, json, hashlib

def main():
    print("=== EXECUTANDO SUÍTE DE TESTES DA AUDITORIA CANÔNICA DE VELARIM ===")
    
    corpus_path = pathlib.Path("work/qa/velarim_corpus_manifest.json")
    if not corpus_path.exists():
        from velarim_extract import main as run_ext
        run_ext()
        
    data = json.loads(corpus_path.read_text(encoding='utf-8'))
    
    tests_passed = 0
    total_tests = 25
    
    def test_assert(num, desc, condition):
        nonlocal tests_passed
        if condition:
            tests_passed += 1
            print(f"Test #{num:02d}: {desc} -> PASS")
        else:
            print(f"Test #{num:02d}: {desc} -> FAIL")
            sys.exit(1)

    # Test 1: SVO extraído
    svo_found = any(r["variety"] == "Luz Cotidiano" and r["order"] == "SVO" for r in data["syntactic_registers"])
    test_assert(1, "SVO extraído para Luz Cotidiano", svo_found)

    # Test 2: SOV extraído
    sov_found = any(r["variety"] == "Escuridão Cotidiano" and r["order"] == "SOV" for r in data["syntactic_registers"])
    test_assert(2, "SOV extraído para Escuridão Cotidiano", sov_found)

    # Test 3: VSO extraído
    vso_found = any(r["variety"] == "Ritual Comum" and r["order"] == "VSO" for r in data["syntactic_registers"])
    test_assert(3, "VSO extraído para Ritual Comum", vso_found)

    # Test 4: Científico Secreto variável extraído
    var_found = any(r["variety"] == "Científico Secreto" and r["order"] == "variável" for r in data["syntactic_registers"])
    test_assert(4, "Científico Secreto com ordem variável extraído", var_found)

    # Test 5: ASCII normativo extraído
    ascii_rule = any("ASCII" in r["rule_name"] for r in data["orthography_rules"])
    test_assert(5, "Ortografia normativa ASCII extraída", ascii_rule)

    # Test 6: Vogais longas duplicadas
    vowel_rule = any("Vogais Longas" in r["rule_name"] for r in data["orthography_rules"])
    test_assert(6, "Regra de vogais longas duplicadas extraída", vowel_rule)

    # Test 7: Schwa = eh
    schwa_rule = any("schwa" in r["description"].lower() for r in data["orthography_rules"])
    test_assert(7, "Regra de schwa escrito como eh extraída", schwa_rule)

    # Test 8: Dígrafos th/sh/zh/nh
    digraph_rule = any("th, sh, zh e nh" in r["description"] for r in data["orthography_rules"])
    test_assert(8, "Regra de dígrafos normativos extraída", digraph_rule)

    # Test 9: Diacrítico legado identificado
    legacy_examples = data["orthography_rules"][0]["examples"]
    legacy_found = any(e["legacy_with_diacritic"] == "nóveth" and e["canonical_ascii"] == "nooveth" for e in legacy_examples)
    test_assert(9, "Mapeamento de diacrítico legado (nóveth -> nooveth) identificado", legacy_found)

    # Test 10: 48 registros do núcleo
    core_count = len(data["core_48_records"])
    test_assert(10, "Exatamente 48 registros do núcleo extraídos", core_count == 48)

    # Test 11: Status CAN preservado (17)
    can_count = sum(1 for r in data["core_48_records"] if r["status"] == "CAN")
    test_assert(11, f"Status CAN preservado ({can_count}/17)", can_count == 17)

    # Test 12: Status LEX_CAN preservado (6)
    lex_can_count = sum(1 for r in data["core_48_records"] if r["status"] == "LEX_CAN")
    test_assert(12, f"Status LEX_CAN preservado ({lex_can_count}/6)", lex_can_count == 6)

    # Test 13: Status SRC preservado (6)
    src_count = sum(1 for r in data["core_48_records"] if r["status"] == "SRC")
    test_assert(13, f"Status SRC preservado ({src_count}/6)", src_count == 6)

    # Test 14: Status TECH preservado (13)
    tech_count = sum(1 for r in data["core_48_records"] if r["status"] == "TECH")
    test_assert(14, f"Status TECH preservado ({tech_count}/13)", tech_count == 13)

    # Test 15: Status PROV preservado (6)
    prov_count = sum(1 for r in data["core_48_records"] if r["status"] == "PROV")
    test_assert(15, f"Status PROV preservado ({prov_count}/6)", prov_count == 6)

    # Test 16: Cabeçalhos não entram no léxico
    no_headers = all(r["forma"] not in ["Forma", "IPA", "Classe", "Significado", "Status"] for r in data["core_48_records"])
    test_assert(16, "Cabeçalhos descartados das tabelas lexicais", no_headers)

    # Test 17: Separadores não entram no léxico
    no_seps = all(not r["forma"].startswith("---") for r in data["core_48_records"])
    test_assert(17, "Linhas separadoras descartadas do léxico", no_seps)

    # Test 18: Classe gramatical não é inferida por heurística cega
    allowed_classes = ["substantivo", "verbo intransitivo", "verbo transitivo", "verbo relacional", "verbo derivado", "substantivo derivado", "substantivo lexical", "substantivo lexicalizado", "substantivo relacional", "substantivo/verbo relacional", "pronome", "partícula/prefixo", "partícula modal", "preposição"]
    exact_classes = all(r["classe"] in allowed_classes for r in data["core_48_records"])
    test_assert(18, "Classes gramaticais extraídas literalmente da coluna real", exact_classes)

    # Test 19: Hashes são do texto literal da linha
    hashes_valid = all(r["sha256"] == hashlib.sha256(r["line_literal"].encode('utf-8')).hexdigest() for r in data["core_48_records"])
    test_assert(19, "Hashes de verificação gerados a partir do texto literal da linha", hashes_valid)

    # Test 20-25: Sil-* forms not accepted without canonical occurrence
    sil_results = {s["form"]: s for s in data["sil_literal_search"]}
    test_assert(20, "Sil-Vael 0 ocorrências canônicas -> invented_by_previous_audit", sil_results["Sil-Vael"]["occurrences"] == 0 and sil_results["Sil-Vael"]["status"] == "invented_by_previous_audit")
    test_assert(21, "Sil-Khor 0 ocorrências canônicas -> invented_by_previous_audit", sil_results["Sil-Khor"]["occurrences"] == 0 and sil_results["Sil-Khor"]["status"] == "invented_by_previous_audit")
    test_assert(22, "Sil-Aet 0 ocorrências canônicas -> invented_by_previous_audit", sil_results["Sil-Aet"]["occurrences"] == 0 and sil_results["Sil-Aet"]["status"] == "invented_by_previous_audit")
    test_assert(23, "Sil-Nox 0 ocorrências canônicas -> invented_by_previous_audit", sil_results["Sil-Nox"]["occurrences"] == 0 and sil_results["Sil-Nox"]["status"] == "invented_by_previous_audit")
    test_assert(24, "Sil-Mir 0 ocorrências canônicas -> invented_by_previous_audit", sil_results["Sil-Mir"]["occurrences"] == 0 and sil_results["Sil-Mir"]["status"] == "invented_by_previous_audit")
    test_assert(25, "Sil-Zul 0 ocorrências canônicas -> invented_by_previous_audit", sil_results["Sil-Zul"]["occurrences"] == 0 and sil_results["Sil-Zul"]["status"] == "invented_by_previous_audit")

    print("\n" + "="*60)
    print(f"RESULTADO DOS TESTES: {tests_passed}/{total_tests} PASS")
    print("="*60)
    
    test_results = {
        "suite": "Velarim Canonical Baseline Verification",
        "total_tests": total_tests,
        "passed_tests": tests_passed,
        "failed_tests": 0,
        "verdict": "EXIT 0 (25/25 PASS)"
    }
    pathlib.Path("work/qa/velarim_test_results.json").write_text(json.dumps(test_results, indent=2, ensure_ascii=False), encoding='utf-8')

if __name__ == "__main__":
    main()
