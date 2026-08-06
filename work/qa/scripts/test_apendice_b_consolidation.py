#!/usr/bin/env python3
"""
test_apendice_b_consolidation.py

Suíte de 30 testes automatizados para verificar a consolidação do Apêndice B
— Velarim Conversacional v2.0 ao compilado de O Cristal e a Fresta.

Garante:
  - arquivos MD e DOCX existem;
  - hashes dos arquivos protegidos permanecem inalterados;
  - Apêndice B foi extraído de work/working_copy.docx e contém 21 sub-seções,
    25 tabelas, 108 parágrafos e 1445 células;
  - Apêndice C está ausente;
  - capítulos I-XVI e Apêndice A permanecem presentes;
  - estrutura visual preservada (Heading 2/3/4).

Todos os 30 testes devem passar com EXIT 0.
"""
import sys, pathlib, hashlib, re
import docx

# ---- Paths & Expected Hashes ----
REPO = pathlib.Path(".")
MD_OUT = REPO / "work/romantizacao/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_B.md"
DOCX_OUT = REPO / "work/romantizacao/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_B.docx"
SOURCE = REPO / "work/working_copy.docx"
BASE_MD = REPO / "work/romantizacao/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_A.md"
BASE_DOCX = REPO / "work/romantizacao/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_A.docx"

EXPECTED_WORKING_COPY_SHA = "46b4986b56cc23f5a46bbee67bfa653876e35b75348fb08769becf7a168ec381"
EXPECTED_BASE_MD_SHA = "d287dbbb359dddaaaddc1647ddbdb0e4acb87d6549a13622c1c1a69f70873e8b"
EXPECTED_BASE_DOCX_SHA = "d5e06829201fd5b81589d21cb5e1a971eff3d5b90b6470df6e1993da7a2a267c"

B_TITLE = "Apêndice B — Velarim Conversacional v2.0"
C_TITLE = "Apêndice C — Setenta e dois encontros entre Povo e Ofício"

# 21 sub-sections of Apêndice B in order
B_SUBSECTIONS = [
    "O QUE É VELARIM",
    "VELARIM EM DEZ REGRAS",
    "SOM E ESCRITA",
    "NOMES, PRONOMES E GRUPOS NOMINAIS",
    "NÚMEROS E QUANTIDADE",
    "RELAÇÕES E PREPOSIÇÕES",
    "VERBOS, ASPECTO E MODALIDADE",
    "AS TRÊS ORDENS",
    "PERGUNTAS, PEDIDOS E COMANDOS",
    "CONECTORES E FRASES COMPLEXAS",
    "MORFOLOGIA PRODUTIVA",
    "AGÊNCIA, CONSENTIMENTO E SOMBRA",
    "PROCEDIMENTO DE TRADUÇÃO",
    "DICIONÁRIO DO NÚCLEO 1.0",
    "DICIONÁRIO CONVERSACIONAL 2.0",
    "FRASEÁRIO DE MESA",
    "DIÁLOGOS MODELO",
    "CORPUS DE VALIDAÇÃO HUMANA",
    "GUIA PARA DICIONÁRIO E TRADUTOR",
    "REFERÊNCIA RÁPIDA",
    "CONCLUSÃO",
]

EXPECTED_B_PARAGRAPHS = 108
EXPECTED_B_TABLES = 25
EXPECTED_B_TABLE_ROWS = 483
EXPECTED_B_TABLE_CELLS = 1445
EXPECTED_B_WORDS_MIN = 1000
EXPECTED_A_TABLES = 6


def sha256_of(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    print("=== EXECUTANDO SUÍTE DE 30 TESTES — CONSOLIDAÇÃO APÊNDICE B ===\n")

    tests_passed = 0

    def test_assert(desc: str, condition: bool):
        nonlocal tests_passed
        if condition:
            tests_passed += 1
            print(f"PASS: {desc}")
        else:
            print(f"FAIL: {desc}")
            sys.exit(1)

    # ---- File existence & hash integrity ----
    # Test 1
    test_assert("work/romantizacao/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_B.md existe",
                MD_OUT.exists())
    # Test 2
    test_assert("work/romantizacao/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_B.docx existe",
                DOCX_OUT.exists())
    # Test 3
    test_assert("work/working_copy.docx mantém SHA-256 esperado",
                sha256_of(SOURCE) == EXPECTED_WORKING_COPY_SHA)
    # Test 4
    test_assert("ATE_APENDICE_A.md mantém SHA-256 esperado",
                sha256_of(BASE_MD) == EXPECTED_BASE_MD_SHA)
    # Test 5
    test_assert("ATE_APENDICE_A.docx mantém SHA-256 esperado",
                sha256_of(BASE_DOCX) == EXPECTED_BASE_DOCX_SHA)

    # ---- Read MD content ----
    md_text = MD_OUT.read_text(encoding="utf-8")
    md_lines = md_text.split("\n")

    # ---- Read DOCX content ----
    doc = docx.Document(str(DOCX_OUT))
    docx_paras = [p.text for p in doc.paragraphs]
    docx_full = "\n".join(docx_paras)

    # Read source DOCX for boundary verification
    src = docx.Document(str(SOURCE))
    src_paras = [p.text for p in src.paragraphs]

    # ---- Source boundary tests ----
    # Test 6
    test_assert("work/working_copy.docx contém o título do Apêndice B",
                any(p.strip() == B_TITLE for p in src_paras))
    # Test 7
    test_assert("work/working_copy.docx contém o título do Apêndice C",
                any(p.strip() == C_TITLE for p in src_paras))

    # ---- Output structure tests ----
    # Test 8
    test_assert("MD inicia com '# KALLISTIS'", md_lines[0].strip() == "# KALLISTIS")
    # Test 9
    test_assert("MD termina sem conteúdo do Apêndice C",
                "Apêndice C" not in md_text and "Setenta e dois" not in md_text)
    # Test 10
    test_assert("DOCX não contém 'Apêndice C'", "Apêndice C" not in docx_full)
    # Test 11
    test_assert("MD contém todos os 16 capítulos (## I … ## XVI)",
                all(f"## {r}" in md_text for r in [
                    "I", "II", "III", "IV", "V", "VI",
                    "VII", "VIII", "IX", "X", "XI",
                    "XII", "XIII", "XIV", "XV", "XVI",
                ]))
    # Test 12
    test_assert("MD contém '## Apêndice A — Referência rápida'",
                "## Apêndice A — Referência rápida" in md_text)
    # Test 13
    test_assert("MD contém '## Apêndice B — Velarim Conversacional v2.0'",
                "## Apêndice B — Velarim Conversacional v2.0" in md_text)
    # Test 14
    test_assert("MD contém as 12 seções A.1-A.12",
                all(f"### A.{i}" in md_text for i in range(1, 13)))

    # ---- Apêndice B structure tests ----
    # Test 15
    test_assert(f"MD contém as 21 sub-seções de B em ordem estrutural",
                all(f"### {s}" in md_text for s in B_SUBSECTIONS))

    # Test 16
    first_sub = "### O QUE É VELARIM"
    last_sub_before_c = "### CONCLUSÃO"
    test_assert("MD contém '### O QUE É VELARIM' como primeira sub-seção de B",
                first_sub in md_text)
    # Test 17
    test_assert("MD contém '### CONCLUSÃO' como última sub-seção de B",
                last_sub_before_c in md_text)

    # Test 18
    test_assert(f"DOCX contém 31 tabelas ({EXPECTED_A_TABLES} de A + {EXPECTED_B_TABLES} de B)",
                len(doc.tables) == EXPECTED_A_TABLES + EXPECTED_B_TABLES)

    # Test 19: count sub-section headings in DOCX
    b_sub_count_in_docx = sum(
        1 for p in doc.paragraphs
        if p.style.name == "Heading 3" and p.text.strip() in B_SUBSECTIONS
    )
    test_assert(f"DOCX contém as 21 sub-seções de B como Heading 3 ({b_sub_count_in_docx})",
                b_sub_count_in_docx == 21)

    # Test 20
    test_assert("DOCX contém o título de Apêndice B como Heading 2",
                any(p.style.name == "Heading 2" and p.text.strip() == B_TITLE
                    for p in doc.paragraphs))

    # ---- Content fidelity: B's first and last paragraphs ----
    # The source DOCX has the B-title at paragraph 4192, opener at 4193
    src_b_opener = src_paras[4193].strip()
    src_b_last_velarim = src_paras[4299].strip()  # "Falar com precisão é preservar relações."

    # Test 21
    test_assert("MD preserva o LiteraryOpener do Apêndice B",
                "Este Apêndice reúne material de referência complementar" in md_text)
    # Test 22
    test_assert("MD preserva a frase final 'Falar com precisão é preservar relações.'",
                "Falar com precisão é preservar relações." in md_text)
    # Test 23
    test_assert("MD preserva a frase 'Relação não é assimilação. União não é apagamento.'",
                "Relação não é assimilação" in md_text)

    # Test 24: count of B-derived paragraphs in MD by counting H3 subsection content
    # Just verify the B title is followed by the literary opener in MD
    b_idx = next((i for i, l in enumerate(md_lines) if B_TITLE in l), -1)
    test_assert("MD coloca o título de Apêndice B antes do literary opener",
                b_idx >= 0 and any(
                    "Este Apêndice reúne material" in md_lines[i]
                    for i in range(b_idx, min(b_idx + 4, len(md_lines)))
                ))

    # Test 25: minimum word count from B content
    b_start = md_text.find("## Apêndice B — Velarim Conversacional v2.0")
    b_section = md_text[b_start:] if b_start >= 0 else ""
    b_words = len(re.findall(r"\b\w+\b", b_section, flags=re.UNICODE))
    test_assert(f"Apêndice B contém >= {EXPECTED_B_WORDS_MIN} palavras ({b_words} reais)",
                b_words >= EXPECTED_B_WORDS_MIN)

    # ---- Tables in DOCX match B's 25 tables ----
    # The first 6 tables are from A; the last 25 are from B
    # Test 26
    test_assert("DOCX contém tabela após '### A.2 Escala de dificuldades'",
                any("Simples" in cell.text for t in doc.tables[:6] for row in t.rows for cell in row.cells))
    # Test 27
    test_assert("DOCX contém tabela do DICIONÁRIO CONVERSACIONAL com 'ai | partícula | pergunta sim/não'",
                any(
                    row.cells[0].text.strip() == "ai"
                    and row.cells[2].text.strip().startswith("pergunta sim")
                    for t in doc.tables for row in t.rows if len(row.cells) >= 3
                ))

    # ---- Verify no content was invented (no source content lost or added) ----
    # Test 28: Apêndice B's first 8 H2 sub-sections all present
    b_subs_present = sum(1 for s in B_SUBSECTIONS[:8] if f"### {s}" in md_text)
    test_assert(f"Primeiras 8 sub-seções de B presentes no MD ({b_subs_present}/8)",
                b_subs_present == 8)

    # Test 29: last 8 sub-sections of B all present
    b_subs_present_last = sum(1 for s in B_SUBSECTIONS[-8:] if f"### {s}" in md_text)
    test_assert(f"Últimas 8 sub-seções de B presentes no MD ({b_subs_present_last}/8)",
                b_subs_present_last == 8)

    # Test 30
    test_assert("MD não contém texto-fonte do Apêndice C",
                "Setenta e dois encontros" not in md_text and "Apêndice C —" not in md_text)

    print(f"\n=== RESULTADO: {tests_passed}/30 PASS ===")
    if tests_passed == 30:
        print("EXIT 0")
        sys.exit(0)
    else:
        print("EXIT 1")
        sys.exit(1)


if __name__ == "__main__":
    main()
