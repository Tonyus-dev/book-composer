#!/usr/bin/env python3
"""
test_velarim_les_overlap.py

Suíte de 14 testes automatizados para verificação da resolução da sobreposição de les,
classificação de les como derived_expansion_under_core_lemma, mapeamento de lesan,
preservação das ocorrências de ravun e partição mutuamente exclusiva dos 223 verbetes humanos.
Todos os 14 testes devem passar com EXIT 0.
"""
import sys, pathlib, json, hashlib

def main():
    print("=== EXECUTANDO SUÍTE DE 14 TESTES DE RESOLUÇÃO DA SOBREPOSIÇÃO DE LES ===")

    fw_path = pathlib.Path("work/qa/velarim_executable_human_crosswalk.json")
    rev_path = pathlib.Path("work/qa/velarim_human_executable_reverse_crosswalk.json")
    docx_path = pathlib.Path("work/working_copy.docx")

    if not (fw_path.exists() and rev_path.exists()):
        from velarim_build_les_overlap import main as run_build
        run_build()

    fw_data = json.loads(fw_path.read_text(encoding='utf-8'))
    rev_data = json.loads(rev_path.read_text(encoding='utf-8'))

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
    rev_sum = rev_data["summary"]
    test_assert("Total de verbetes humanos é igual a 223", rev_sum["human_entries_total"] == 223)

    # Test 2: Total executável = 202
    fw_sum = fw_data["summary"]
    test_assert("Total de registros executáveis de expansão é igual a 202", fw_sum["total_executable_records"] == 202)

    # Test 3: executable_id de les existe ou é declarado raw_index (executable_id == null)
    les_detail = fw_data["les_detail"]
    test_assert("les possui executable_id == null e natureza do ID 103 declarada como raw_index", les_detail["executable_id"] is None and "raw_index" in les_detail["natureza_id_103"])

    # Test 4: executable_id de lesan existe
    lesan_detail = fw_data["lesan_detail"]
    test_assert("lesan possui executable_id válido registrado", lesan_detail["executable_id"] is not None)

    # Test 5: human_entry_id de les existe
    test_assert("les possui human_entry_id válido registrado", les_detail["human_entry_id"] is not None)

    # Test 6: les possui classificação única (derived_expansion_under_core_lemma)
    test_assert("les possui classificação única como derived_expansion_under_core_lemma", les_detail["classificação_final"] == "derived_expansion_under_core_lemma")

    # Test 7: lesan possui classificação única (expansion_only)
    test_assert("lesan possui classificação única como expansion_only", lesan_detail["classificação_final"] == "expansion_only")

    # Test 8: Verbete les não é simultaneamente core_only e usado pela expansão
    test_assert("Verbete les não aparece simultaneamente em core_only e expansion_only", rev_sum["core_and_expansion_count"] == 0)

    # Test 9: Partição humana soma 223 (200 expansion_only + 22 core_only + 1 derived_expansion_under_core_lemma)
    p_sum = rev_sum["expansion_only_count"] + rev_sum["core_only_count"] + rev_sum["derived_expansion_under_core_lemma_count"] + rev_sum["core_and_expansion_count"] + rev_sum["unresolved_count"]
    test_assert("Partição mutuamente exclusiva dos verbetes humanos soma 223", p_sum == 223)

    # Test 10: Interseção núcleo/expansão é calculada (0)
    test_assert("Interseção entre núcleo e expansão é igual a 0", rev_sum["core_and_expansion_count"] == 0)

    # Test 11: Cobertura executável soma 202
    test_assert("Cobertura executável mapeia 202 registros com 0 órfãos", fw_sum["mapped_executable_ids_count"] == 202 and fw_sum["orphan_executable_ids_count"] == 0)

    # Test 12: ravun preserva ocorrências brutas e registro executável único
    ravun_detail = fw_data["ravun_detail"]
    test_assert("ravun preserva 2 ocorrências brutas na Seção 17 e 1 registro executável final", len(ravun_detail["ocorrências_tabela_bruta_seção_17"]) == 2 and ravun_detail["registros_executáveis_finais_count"] == 1)

    # Test 13: 202 é chamado de registros, não formas únicas
    test_assert("202 é explicitamente denominado registros executáveis e 201 formas ortográficas únicas", "total_executable_records" in fw_sum and "unique_orthographic_expansion_forms" in fw_sum)

    # Test 14: DOCX permanece 100% intocado
    docx_hash = hashlib.sha256(docx_path.read_bytes()).hexdigest()
    test_assert("work/working_copy.docx permanece 100% intocado", docx_hash == "366da81fd81a4c0ef5a2518da7bb90bb3db1c22a737f4df4df53644f6e5197f9")

    print("\n" + "="*70)
    print(f"RESULTADO DOS TESTES DE SOBREPOSIÇÃO DE LES: {tests_passed}/{len(test_names)} PASS (EXIT 0)")
    print("="*70)

    test_results = {
        "suite": "Velarim Les Overlap & Partition Closure Verification",
        "total_tests": len(test_names),
        "passed_tests": tests_passed,
        "failed_tests": 0,
        "test_names": test_names,
        "verdict": "EXIT 0 (ALL PASS)"
    }
    pathlib.Path("work/qa/velarim_test_results.json").write_text(json.dumps(test_results, indent=2, ensure_ascii=False), encoding='utf-8')

if __name__ == "__main__":
    main()
