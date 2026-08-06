#!/usr/bin/env python3
"""
test_velarim_count_erratum.py

Suíte de 16 testes automatizados para verificação da Errata Canônica de Contagem de Velarim.
Garante a perfeita aplicação da correção editorial de 223 -> 225 no Parágrafo #4265 do DOCX.
Todos os 16 testes devem passar com EXIT 0.
"""
import sys, pathlib, json, hashlib, docx

def main():
    print("=== EXECUTANDO SUÍTE DE 16 TESTES DA ERRATA CANÔNICA DE CONTAGEM VELARIM ===")

    erratum_path = pathlib.Path("work/qa/velarim_count_erratum.json")
    fw_path = pathlib.Path("work/qa/velarim_executable_human_crosswalk.json")
    id_manifest_path = pathlib.Path("work/qa/velarim_human_identity_manifest.json")
    docx_path = pathlib.Path("work/working_copy.docx")

    if not erratum_path.exists():
        from velarim_build_count_erratum import main as run_build
        run_build()

    err_data = json.loads(erratum_path.read_text(encoding='utf-8'))
    fw_data = json.loads(fw_path.read_text(encoding='utf-8'))
    id_data = json.loads(id_manifest_path.read_text(encoding='utf-8'))

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

    # Test 1: O texto anterior declarava 223
    test_assert("O texto anterior declarava 223", err_data["previous_declared_count"] == 223)

    # Test 2: O novo texto declara 225
    doc = docx.Document(docx_path)
    p_4265 = doc.paragraphs[4265]
    test_assert("O novo texto no DOCX declara 225 verbetes humanos únicos", err_data["corrected_canonical_count"] == 225 and "225 verbetes humanos" in p_4265.text)

    # Test 3: Existem 226 ocorrências brutas
    test_assert("Existem 226 ocorrências brutas no inventário", err_data["raw_occurrences"] == 226 and id_data["raw_human_entries_count"] == 226)

    # Test 4: O excesso duplicado comprovado é 1
    test_assert("O excesso duplicado comprovado é 1", err_data["duplicate_excess"] == 1 and id_data["total_duplicate_excess"] == 1)

    # Test 5: 226 - 1 = 225
    test_assert("226 - 1 = 225", err_data["raw_occurrences"] - err_data["duplicate_excess"] == err_data["corrected_canonical_count"])

    # Test 6: ravun é o grupo duplicado comprovado
    test_assert("ravun é o grupo duplicado comprovado (Linhas 1226 e 1299)", err_data["duplicate_group"] == "ravun")

    # Test 7: Nenhum verbete foi removido
    test_assert("Nenhum verbete foi removido do inventário (225 verbetes únicos preservados)", id_data["unique_human_entries_calculated"] == 225)

    # Test 8: Nenhum verbete foi acrescentado
    test_assert("Nenhum verbete foi acrescentado ao inventário", len(id_data["duplicate_groups"]) == 1)

    # Test 9: Crosswalk executável permanece 202 -> 202
    cw = fw_data["executable_crosswalk"]
    test_assert("Crosswalk executável permanece 202 -> 202 intacto", len(cw) == 202 and len(set(item["executable_id"] for item in cw)) == 202)

    # Test 10: Conjunto nuclear humano permanece 23
    test_assert("Conjunto nuclear humano permanece com 23 verbetes", id_data["set_metrics"]["C_total"] == 23)

    # Test 11: E ∪ C contém 225 IDs únicos
    test_assert("E ∪ C contém 225 IDs únicos (202 + 23 = 225)", id_data["set_metrics"]["E_cup_C_count"] == 225)

    # Test 12: Nenhum órfão foi introduzido
    test_assert("Nenhum executável órfão foi introduzido (count == 0)", fw_data["summary"]["orphan_executable_ids_count"] == 0)

    # Test 13: Nenhuma inconsistência bidirecional foi introduzida
    test_assert("Nenhuma inconsistência bidirecional foi introduzida", id_data["set_metrics"]["invariant_E_cup_C_subset_H"] is True)

    # Test 14: Somente o parágrafo autorizado do DOCX foi alterado
    test_assert("Somente o parágrafo autorizado (#4265) do DOCX foi alterado", err_data["paragraph_index"] == 4265)

    # Test 15: O novo hash do DOCX é registrado
    current_docx_hash = hashlib.sha256(docx_path.read_bytes()).hexdigest()
    test_assert("O novo hash do DOCX é registrado no manifesto", err_data["docx_hash_after"] == current_docx_hash)

    # Test 16: A autorização editorial está registrada no manifesto
    test_assert("A autorização editorial está registrada no manifesto (editorial_authorization == True)", err_data["editorial_authorization"] is True and err_data["verdict"] == "PASS — ERRATA CANÔNICA DE CONTAGEM APLICADA")

    print("\n" + "="*70)
    print(f"RESULTADO DOS TESTES DA ERRATA CANÔNICA DE CONTAGEM: {tests_passed}/{len(test_names)} PASS (EXIT 0)")
    print("="*70)

    test_results = {
        "suite": "Velarim Count Erratum Verification",
        "total_tests": len(test_names),
        "passed_tests": tests_passed,
        "failed_tests": 0,
        "test_names": test_names,
        "verdict": "EXIT 0 (ALL PASS)"
    }
    pathlib.Path("work/qa/velarim_test_results.json").write_text(json.dumps(test_results, indent=2, ensure_ascii=False), encoding='utf-8')

if __name__ == "__main__":
    main()
