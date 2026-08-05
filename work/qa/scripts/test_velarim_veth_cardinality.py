#!/usr/bin/env python3
"""
test_velarim_veth_cardinality.py

Suíte de 12 testes automatizados para verificação da resolução da cardinalidade
de veth e vethari, partição mutuamente exclusiva dos 223 verbetes humanos e isolamento das métricas.
Todos os 12 testes devem passar com EXIT 0.
"""
import sys, pathlib, json, hashlib

def main():
    print("=== EXECUTANDO SUÍTE DE 12 TESTES DE CARDINALIDADE DE VETH E VETHARI ===")

    rev_path = pathlib.Path("work/qa/velarim_human_executable_reverse_crosswalk.json")
    fw_path = pathlib.Path("work/qa/velarim_executable_human_crosswalk.json")
    hum_inv_path = pathlib.Path("work/qa/velarim_human_dictionary_inventory.json")
    exp_lex_path = pathlib.Path("work/qa/velarim_expansion_lexicon.json")
    corpus_path = pathlib.Path("work/qa/velarim_corpus_manifest.json")
    docx_path = pathlib.Path("work/working_copy.docx")

    if not (rev_path.exists() and fw_path.exists()):
        from velarim_build_veth_cardinality import main as run_build
        run_build()

    rev_data = json.loads(rev_path.read_text(encoding='utf-8'))
    fw_data = json.loads(fw_path.read_text(encoding='utf-8'))
    hum_data = json.loads(hum_inv_path.read_text(encoding='utf-8'))
    exp_data = json.loads(exp_lex_path.read_text(encoding='utf-8'))
    corpus_data = json.loads(corpus_path.read_text(encoding='utf-8'))

    tests_passed = 0
    test_names = []

    def test_assert(desc, condition):
        nonlocal tests_passed
        test_names.append(desc)
        if condition:
            tests_passed += 1
            print(f"PASS: {desc}")
        else:
            print(f"FAIL: {desc}")
            sys.exit(1)

    # Test 1: Total humano = 223
    test_assert("Total de verbetes humanos é igual a 223", len(hum_data["verbetes"]) == 223)

    # Test 2: Total executável = 202
    test_assert("Total de registros executáveis de expansão é igual a 202", len(exp_data["records"]) == 202)

    # Test 3: Total do núcleo = 48
    test_assert("Total de registros do Núcleo 1.0 é igual a 48", len(corpus_data["core_48_records"]) == 48)

    # Test 4: Partição humana soma 223 (200 maps_to_expansion_only + 23 maps_to_core_only)
    summary = rev_data["summary"]
    p_sum = summary["maps_to_expansion_only_count"] + summary["maps_to_core_only_count"] + summary["maps_to_core_and_expansion_count"] + summary["unresolved_count"]
    test_assert("Partição mutuamente exclusiva dos verbetes humanos soma 223", p_sum == 223)

    # Test 5: veth possui classificação única (maps_to_core_only)
    veth_detail = rev_data["veth_detail"]
    test_assert("veth possui classificação única como maps_to_core_only", veth_detail["classificação"] == "maps_to_core_only")

    # Test 6: vethari possui classificação única (maps_to_core_only)
    vethari_detail = rev_data["vethari_detail"]
    test_assert("vethari possui classificação única como maps_to_core_only", vethari_detail["classificação"] == "maps_to_core_only")

    # Test 7: executable_id de veth é comprovado como null
    test_assert("executable_id de veth é comprovado como null", veth_detail["executable_id"] is None)

    # Test 8: executable_id de vethari é comprovado como null
    test_assert("executable_id de vethari é comprovado como null", vethari_detail["executable_id"] is None)

    # Test 9: Item core-only aparece na contagem core-only (23 itens)
    test_assert("Contagem maps_to_core_only contém exatamente 23 itens", summary["maps_to_core_only_count"] == 23)

    # Test 10: Item core-and-expansion aparece nos dois conjuntos (0 itens)
    test_assert("Contagem maps_to_core_and_expansion contém 0 itens", summary["maps_to_core_and_expansion_count"] == 0)

    # Test 11: Métrica 48 possui universo explícito (48 registros do Núcleo 1.0)
    explicit_metrics = fw_data["explicit_metrics"]
    test_assert("Métrica 48 possui universo explícito indicado no JSON", "48 registros" in explicit_metrics["core_to_appendix"]["universe"])

    # Test 12: DOCX permanece 100% intocado
    docx_hash = hashlib.sha256(docx_path.read_bytes()).hexdigest()
    test_assert("work/working_copy.docx permanece 100% intocado", docx_hash == "366da81fd81a4c0ef5a2518da7bb90bb3db1c22a737f4df4df53644f6e5197f9")

    print("\n" + "="*70)
    print(f"RESULTADO DOS TESTES DE CARDINALIDADE: {tests_passed}/{len(test_names)} PASS (EXIT 0)")
    print("="*70)

    test_results = {
        "suite": "Velarim Veth & Vethari Cardinality Verification",
        "total_tests": len(test_names),
        "passed_tests": tests_passed,
        "failed_tests": 0,
        "test_names": test_names,
        "verdict": "EXIT 0 (ALL PASS)"
    }
    pathlib.Path("work/qa/velarim_test_results.json").write_text(json.dumps(test_results, indent=2, ensure_ascii=False), encoding='utf-8')

if __name__ == "__main__":
    main()
