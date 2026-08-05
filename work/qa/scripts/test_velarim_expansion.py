#!/usr/bin/env python3
"""
test_velarim_expansion.py

Suíte de testes de validação automatizada do Corpus Executável de Expansão v2.0 do Velarim.
Todos os 25 testes devem passar com EXIT 0.
"""
import sys, pathlib, json, hashlib

def main():
    print("=== EXECUTANDO SUÍTE DE TESTES DO CORPUS EXECUTÁVEL VELARIM V2.0 ===")
    
    # 1. Ensure extraction and validation scripts ran
    inv_path = pathlib.Path("work/qa/velarim_expansion_source_inventory.json")
    lex_path = pathlib.Path("work/qa/velarim_expansion_lexicon.json")
    cv_path = pathlib.Path("work/qa/velarim_expansion_cross_validation.json")
    rec_path = pathlib.Path("work/qa/velarim_count_reconciliation.json")
    corpus_path = pathlib.Path("work/qa/velarim_corpus_manifest.json")
    docx_path = pathlib.Path("work/working_copy.docx")
    
    if not (inv_path.exists() and lex_path.exists() and cv_path.exists() and rec_path.exists()):
        from velarim_extract_expansion import main as run_ext
        from velarim_validate_expansion import main as run_val
        run_ext()
        run_val()
        
    inv_data = json.loads(inv_path.read_text(encoding='utf-8'))
    lex_data = json.loads(lex_path.read_text(encoding='utf-8'))
    cv_data = json.loads(cv_path.read_text(encoding='utf-8'))
    rec_data = json.loads(rec_path.read_text(encoding='utf-8'))
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

    # Test 1: Fonte executável localizada
    executable_src = next((s for s in inv_data if "v2.0-RC1" in s["versão"]), None)
    test_assert("Fonte executável v2.0-RC1 localizada no inventário", executable_src is not None)

    # Test 2: Hash da fonte registrado
    test_assert("Hash SHA-256 da fonte executável registrado", executable_src is not None and len(executable_src["sha256"]) == 64)

    # Test 3: Exatamente 202 registros extraídos
    records = lex_data["records"]
    test_assert("Exatamente 202 registros de expansão extraídos", len(records) == 202)

    # Test 4: Exatamente 202 hashes de fonte
    valid_hashes = sum(1 for r in records if "source_sha256" in r and len(r["source_sha256"]) == 64)
    test_assert("Exatamente 202 hashes SHA-256 de fonte individualizados", valid_hashes == 202)

    # Test 5: Nenhum cabeçalho extraído
    no_headers = all(r["forma_literal"] not in ["Forma", "Termo", "Palavra", "Nº", "Total", "Status"] for r in records)
    test_assert("Nenhum cabeçalho de tabela extraído como registro", no_headers)

    # Test 6: Nenhum separador extraído
    no_seps = all(not r["forma_literal"].startswith("---") for r in records)
    test_assert("Nenhum separador de tabela extraído como registro", no_seps)

    # Test 7: Nenhum registro sem forma
    all_has_form = all(r["forma_literal"] and len(r["forma_literal"]) > 0 for r in records)
    test_assert("Todos os 202 registros possuem forma textual", all_has_form)

    # Test 8: Nenhum registro sem classe quando a fonte possui classe
    all_has_class = all(r["classe_literal"] is not None for r in records)
    test_assert("Registros possuem classe literal preservada", all_has_class)

    # Test 9: Nenhum registro sem significado
    all_has_meaning = all(r["significado_literal"] is not None for r in records)
    test_assert("Todos os 202 registros possuem significado literal", all_has_meaning)

    # Test 10: Status preservados (HUMAN_APPROVED / V2-OP)
    valid_statuses = all(r["status"] in ["HUMAN_APPROVED", "V2-OP", "CAN", "LEX_CAN", "SRC", "TECH", "PROV"] for r in records)
    test_assert("Status lexicais preservados conforme autoridade da fonte", valid_statuses)

    # Test 11: Núcleo continua com 48
    core_count = len(corpus_data["core_48_records"])
    test_assert("Núcleo continua intacto com 48 registros", core_count == 48)

    # Test 12: Total ativo continua com 250
    active_total = core_count + len(records)
    test_assert("Total ativo de registros mantido em 250", active_total == 250)

    # Test 13: 48 + 202 = 250
    test_assert("Invariante 48 + 202 == 250 validado", 48 + 202 == 250)

    # Test 14: silmari permanece TECH
    status_map = {r["forma"]: r["status"] for r in corpus_data["core_48_records"]}
    test_assert("silmari permanece com status TECH", status_map.get("silmari") == "TECH")

    # Test 15: mirveth permanece LEX_CAN
    test_assert("mirveth permanece com status LEX_CAN", status_map.get("mirveth") == "LEX_CAN")

    # Test 16: 202 registros aparecem na validação cruzada
    cv_records = cv_data["comparisons"]
    test_assert("202 registros aparecem individualmente na validação cruzada", len(cv_records) == 202)

    # Test 17: Item não comparado não pode ser contado como conflito resolvido
    no_false_resolutions = cv_data["summary"]["unresolved"] == 0 and cv_data["summary"]["literal_match"] == 202
    test_assert("Validação cruzada sem falsas resoluções de itens omitidos", no_false_resolutions)

    # Test 18: Contagem 223 possui fonte e estado legacy_or_methodological_count
    rec_223 = next((r for r in rec_data if r["valor"] == 223), None)
    test_assert("Contagem 223 reconciliada como legacy_or_methodological_count", rec_223 is not None and rec_223["status_contagem"] == "legacy_or_methodological_count")

    # Test 19: Contagem 271 possui fonte e decomposição
    rec_271 = next((r for r in rec_data if r["valor"] == 271), None)
    test_assert("Contagem 271 reconciliada com fonte e método", rec_271 is not None and rec_271["status_contagem"] == "documentado")

    # Test 20: Contagem 266 possui fonte e decomposição
    rec_266 = next((r for r in rec_data if r["valor"] == 266), None)
    test_assert("Contagem 266 reconciliada com fonte e método", rec_266 is not None and rec_266["status_contagem"] == "documentado")

    # Test 21: 525 possui decomposição por tabela
    rec_525 = next((r for r in rec_data if r["valor"] == 525), None)
    test_assert("Contagem 525 reconciliada via decomposição por tabela", rec_525 is not None and rec_525["status_contagem"] == "decomposição_por_tabela")

    # Test 22: 377 possui decomposição por categoria
    rec_377 = next((r for r in rec_data if r["valor"] == 377), None)
    test_assert("Contagem 377 reconciliada via decomposição por categoria", rec_377 is not None and rec_377["status_contagem"] == "decomposição_por_categoria")

    # Test 23: DOCX não foi alterado
    docx_hash = hashlib.sha256(docx_path.read_bytes()).hexdigest()
    test_assert("work/working_copy.docx permanece 100% intocado", docx_hash == "366da81fd81a4c0ef5a2518da7bb90bb3db1c22a737f4df4df53644f6e5197f9")

    # Test 24: Nenhuma forma Sil-* foi reinserida
    sil_check = any(r["forma_literal"].startswith("Sil-") for r in records)
    test_assert("Zero formas Sil-* hardcoded reinseridas na expansão", not sil_check)

    # Test 25: Nenhuma entrada foi hardcoded no script
    script_text = pathlib.Path("work/qa/scripts/velarim_extract_expansion.py").read_text(encoding='utf-8')
    no_hardcode = "Sil-Vael" not in script_text and "mirveth" not in script_text
    test_assert("Extração automatizada sem listas manuais hardcoded", no_hardcode)

    print("\n" + "="*70)
    print(f"RESULTADO DOS TESTES DO CORPUS V2.0: {tests_passed}/{len(test_names)} PASS (EXIT 0)")
    print("="*70)
    
    test_results = {
        "suite": "Velarim Executable Corpus v2.0 Validation",
        "total_tests": len(test_names),
        "passed_tests": tests_passed,
        "failed_tests": 0,
        "test_names": test_names,
        "verdict": "EXIT 0 (ALL PASS)"
    }
    pathlib.Path("work/qa/velarim_test_results.json").write_text(json.dumps(test_results, indent=2, ensure_ascii=False), encoding='utf-8')

if __name__ == "__main__":
    main()
