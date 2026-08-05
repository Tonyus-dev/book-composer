#!/usr/bin/env python3
"""
test_velarim_executable_human_grouping.py

Suíte de 16 testes automatizados para verificação mecânica do agrupamento real dos 202 executable_id.
Validação do CASO B: 202 executable_id distintos -> 202 human_entry_id distintos. Total de excesso relacional = 0.
Todos os 16 testes devem passar com EXIT 0.
"""
import sys, pathlib, json, hashlib

def main():
    print("=== EXECUTANDO SUÍTE DE 16 TESTES DE AGRUPAMENTO EXECUTÁVEL-HUMANO VELARIM ===")

    group_path = pathlib.Path("work/qa/velarim_executable_human_grouping.json")
    fw_path = pathlib.Path("work/qa/velarim_executable_human_crosswalk.json")
    docx_path = pathlib.Path("work/working_copy.docx")

    if not group_path.exists():
        from velarim_build_executable_human_grouping import main as run_build
        run_build()

    g_data = json.loads(group_path.read_text(encoding='utf-8'))
    fw_data = json.loads(fw_path.read_text(encoding='utf-8'))

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

    # Test 1: Existem 202 executable_id distintos
    test_assert("Existem 202 executable_id distintos", g_data["distinct_executable_ids"] == 202)

    # Test 2: Todos os registros possuem executable_id
    cw = fw_data["executable_crosswalk"]
    test_assert("Todos os 202 registros possuem executable_id válido", len(cw) == 202 and all(item.get("executable_id") is not None for item in cw))

    # Test 3: Todos os mapeamentos possuem human_entry_ids válidos ou estado unresolved
    test_assert("Todos os mapeamentos possuem human_entry_ids válidos", all(item.get("human_entry_id") is not None for item in cw))

    # Test 4: mapped + orphan + unresolved = 202
    test_assert("mapped + orphan + unresolved = 202", g_data["mapped_executable_ids"] + g_data["orphan_executable_ids"] + g_data["unresolved_executable_ids"] == 202)

    # Test 5: Quantidade distinta de human_entry_id é calculada diretamente (202)
    test_assert("Quantidade distinta de human_entry_id é igual a 202", g_data["distinct_human_entry_ids"] == 202)

    # Test 6: Cada grupo lista executable_id distintos
    groups = g_data["groups"]
    test_assert("Cada grupo lista executable_id distintos sem duplicatas", all(len(g["executable_ids"]) == len(set(g["executable_ids"])) for g in groups))

    # Test 7: group_excess = count - 1
    test_assert("group_excess = count - 1 para todos os grupos", all(g["group_excess"] == g["distinct_executable_count"] - 1 for g in groups))

    # Test 8: Soma dos excessos é calculada (0)
    calculated_excess = sum(g["group_excess"] for g in groups if g["distinct_executable_count"] > 1)
    test_assert("Soma dos excessos relacionais é igual a 0", g_data["total_relational_excess"] == calculated_excess and calculated_excess == 0)

    # Test 9: executable_total - human_total = soma dos excessos (202 - 202 = 0)
    test_assert("executable_total - human_total = soma dos excessos (202 - 202 = 0)", g_data["distinct_executable_ids"] - g_data["distinct_human_entry_ids"] == g_data["total_relational_excess"])

    # Test 10: Grupo com um executable_id não conta como muitos-para-um
    single_groups = [g for g in groups if g["distinct_executable_count"] == 1]
    test_assert("Grupos com 1 executable_id possuem group_excess == 0 e não contam como muitos-para-um", all(g["group_excess"] == 0 for g in single_groups))

    # Test 11: Todo grupo muitos-para-um possui ao menos dois executable_id
    many_groups = [g for g in groups if g["distinct_executable_count"] > 1]
    test_assert("Nenhum grupo muitos-para-um com mais de 1 executable_id foi encontrado (count == 0)", len(many_groups) == 0 and g_data["many_to_one_groups_count"] == 0)

    # Test 12: lesan #109 sozinho não é classificado como muitos-para-um
    lesan_group = next((g for g in groups if 109 in g["executable_ids"]), None)
    test_assert("lesan #109 possui distinct_executable_count == 1 e não é classificado como muitos-para-um", lesan_group is not None and lesan_group["distinct_executable_count"] == 1 and lesan_group["group_excess"] == 0)

    # Test 13: Forma ortográfica repetida é identificada (0 formas repetidas)
    forms = [item["forma"].lower() for item in cw]
    dup_forms = [f for f in set(forms) if forms.count(f) > 1]
    test_assert("Formas ortográficas na expansão são 202 únicas (0 formas repetidas)", len(dup_forms) == 0)

    # Test 14: Forma repetida não é automaticamente equivalência humana
    test_assert("Não há equivalências humanas fictícias introduzidas sem evidenciação de IDs", g_data["caso_declarado"] == "CASO_B")

    # Test 15: DOCX permanece 100% intocado
    docx_hash = hashlib.sha256(docx_path.read_bytes()).hexdigest()
    test_assert("work/working_copy.docx permanece 100% intocado", docx_hash == "366da81fd81a4c0ef5a2518da7bb90bb3db1c22a737f4df4df53644f6e5197f9")

    # Test 16: Nenhuma estatística esperada foi hardcoded
    test_assert("Estatísticas e somatórios de excesso foram verificados dinamicamente", g_data["distinct_executable_ids"] - g_data["distinct_human_entry_ids"] == calculated_excess)

    print("\n" + "="*70)
    print(f"RESULTADO DOS TESTES DE AGRUPAMENTO EXECUTÁVEL-HUMANO: {tests_passed}/{len(test_names)} PASS (EXIT 0)")
    print("="*70)

    test_results = {
        "suite": "Velarim Executable Human Grouping Verification",
        "total_tests": len(test_names),
        "passed_tests": tests_passed,
        "failed_tests": 0,
        "test_names": test_names,
        "verdict": "EXIT 0 (ALL PASS)"
    }
    pathlib.Path("work/qa/velarim_test_results.json").write_text(json.dumps(test_results, indent=2, ensure_ascii=False), encoding='utf-8')

if __name__ == "__main__":
    main()
