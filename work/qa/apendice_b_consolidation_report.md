# Relatório de Consolidação — Apêndice B Real ao Compilado de Kallistis

> Relatório **corrigido** após auditoria de fidelidade integral.
> A versão anterior deste relatório afirmava incorretamente que os hashes
> normalizados deveriam ser distintos entre formatos diferentes; isto foi
> removido porque os três hashes normalizados são, na verdade, idênticos.

## Identificação

- **Repositório:** `/home/tonyus-dev/Projetos/RPG/kallistis libro/KALLISTIS_PARA_ANTIGRAVITY`
- **Repositório remoto:** `Tonyus-dev/kallistis-ate-capitulo-07`
- **Branch:** `master`
- **HEAD inicial:** `4340d1f335addf65d27d5b5afff5e70bede6149f`
- **HEAD da auditoria:** `c8267cb7e3352402972e467bfe490d1e667a37d0`

## Fonte

- **Arquivo-fonte:** `work/working_copy.docx`
- **SHA-256 binário da fonte:** `46b4986b56cc23f5a46bbee67bfa653876e35b75348fb08769becf7a168ec381`

## Hashes Binários dos Arquivos Versionados

| Arquivo | SHA-256 binário |
|---|---|
| `work/working_copy.docx` | `46b4986b56cc23f5a46bbee67bfa653876e35b75348fb08769becf7a168ec381` |
| `work/romantizacao/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_A.md` | `d287dbbb359dddaaaddc1647ddbdb0e4acb87d6549a13622c1c1a69f70873e8b` |
| `work/romantizacao/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_A.docx` | `d5e06829201fd5b81589d21cb5e1a971eff3d5b90b6470df6e1993da7a2a267c` |
| `work/romantizacao/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_B.md` | `c6467f02d97dae52378276219f89f97c46652e88ece817a9380e5962d29ab322` |
| `work/romantizacao/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_B.docx` | `f3b7f76326a0dd9528bbe2a73e8e705a57d150c1355ad5cb746df48009f84bc4` |

## Hashes Normalizados do Apêndice B

Os três hashes abaixo são calculados sobre a **representação canônica do
Apêndice B** (lista JSON UTF-8 intercalando parágrafos e tabelas, com as 6
normalizações permitidas aplicadas: CRLF/CR→LF, NBSP→espaço, espaços
finais removidos, células com múltiplos parágrafos unidas por `\n`,
sintaxe Markdown de título removida, `\|` revertido para `|`). Eles
**não** são hashes do arquivo binário.

- **SOURCE_B_NORMALIZED_SHA256:** `4720eae0f6cc84e22a5502bcee211cb950a1fdfbd858ad88dc8497f348d0abcd`
- **MD_B_NORMALIZED_SHA256:**     `4720eae0f6cc84e22a5502bcee211cb950a1fdfbd858ad88dc8497f348d0abcd`
- **DOCX_B_NORMALIZED_SHA256:**   `4720eae0f6cc84e22a5502bcee211cb950a1fdfbd858ad88dc8497f348d0abcd`

Os três valores são **idênticos**. Isto significa que, depois das
normalizações permitidas, o conteúdo textual e estrutural do Apêndice B
preservado no Markdown e no DOCX final é byte-a-byte equivalente ao
conteúdo da fonte.

## Elementos Comparados

| Métrica | Fonte | MD | DOCX |
|---|---:|---:|---:|
| Total de elementos | 133 | 133 | 133 |
| Parágrafos | 108 | 108 | 108 |
| Tabelas | 25 | 25 | 25 |
| Linhas de tabela | 483 | 483 | 483 |
| Células de tabela | 1 445 | 1 445 | 1 445 |
| Posições das tabelas | 25 índices | idênticas | idênticas |
| Dimensões de tabelas | 25 tuplas | idênticas | idênticas |
| Todos os parágrafos coincidem | — | sim | sim |
| Todas as células coincidem | — | sim | sim |

## Sub-seções B.1–B.21 (na ordem estrutural real)

1. O QUE É VELARIM
2. VELARIM EM DEZ REGRAS
3. SOM E ESCRITA
4. NOMES, PRONOMES E GRUPOS NOMINAIS
5. NÚMEROS E QUANTIDADE
6. RELAÇÕES E PREPOSIÇÕES
7. VERBOS, ASPECTO E MODALIDADE
8. AS TRÊS ORDENS
9. PERGUNTAS, PEDIDOS E COMANDOS
10. CONECTORES E FRASES COMPLEXAS
11. MORFOLOGIA PRODUTIVA
12. AGÊNCIA, CONSENTIMENTO E SOMBRA
13. PROCEDIMENTO DE TRADUÇÃO
14. DICIONÁRIO DO NÚCLEO 1.0
15. DICIONÁRIO CONVERSACIONAL 2.0
16. FRASEÁRIO DE MESA
17. DIÁLOGOS MODELO
18. CORPUS DE VALIDAÇÃO HUMANA
19. GUIA PARA DICIONÁRIO E TRADUTOR
20. REFERÊNCIA RÁPIDA
21. CONCLUSÃO

Todas verificadas em fonte, MD e DOCX. As 21 entradas acima aparecem na
mesma ordem e com o mesmo texto nas três representações.

## Primeira Divergência

Nenhuma. Os três hashes normalizados são idênticos; todos os 108
parágrafos e todas as 1 445 células de tabela coincidem entre fonte,
Markdown e DOCX final.

## Conteúdo Inventado

**Zero.** Todo o conteúdo do Apêndice B foi extraído diretamente de
`work/working_copy.docx`. Nenhuma palavra, raiz, regra, exemplo,
tradução ou forma linguística foi acrescentada, modificada ou resumida.

## Testes Executados

- Script: `python3 work/qa/scripts/test_apendice_b_consolidation.py`
- **Resultado:** **30/30 PASS** · EXIT 0

Cobertura dos 30 testes:
1. SHA-256 binário de `work/working_copy.docx` preservado
2. SHA-256 binário do `ATE_APENDICE_A.md` preservado
3. SHA-256 binário do `ATE_APENDICE_A.docx` preservado
4. Quantidade de elementos fonte = MD (133 = 133)
5. Quantidade de elementos fonte = DOCX (133 = 133)
6. Quantidade de parágrafos fonte = MD (108 = 108)
7. Quantidade de parágrafos fonte = DOCX (108 = 108)
8. Quantidade de tabelas fonte = MD (25 = 25)
9. Quantidade de tabelas fonte = DOCX (25 = 25)
10. Posição de todas as tabelas fonte = MD
11. Posição de todas as tabelas fonte = DOCX
12. Dimensões de todas as 25 tabelas coincidem (fonte, MD, DOCX)
13. Todas as 1 445 células coincidem (fonte = MD)
14. Todas as 1 445 células coincidem (fonte = DOCX)
15. Todos os 108 parágrafos coincidem (fonte = MD)
16. Todos os 108 parágrafos coincidem (fonte = DOCX)
17. Hash normalizado fonte = MD
18. Hash normalizado fonte = DOCX
19. Hash normalizado é o esperado `4720eae0f6cc84e2…`
20. Apenas `incoming/` permanece não rastreado
21. Fonte contém título do Apêndice B
22. Fonte contém título do Apêndice C
23. DOCX final contém 31 tabelas (6 de A + 25 de B)
24. DOCX final contém o título do Apêndice B como Heading 2
25. MD contém `## Apêndice B — Velarim Conversacional v2.0`
26. MD contém `## Apêndice A — Referência rápida`
27. MD contém os 16 capítulos (## I … ## XVI)
28. MD não contém `Apêndice C`
29. DOCX final não contém `Apêndice C`
30. Somente arquivos autorizados foram alterados (escopo respeitado)

## Inspeção Visual Real (renderização PDF)

**Comando usado:**
```
soffice --headless --convert-to pdf \
  --outdir work/qa/rendered \
  work/romantizacao/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_B.docx
```

**PDF criado:**
`work/qa/rendered/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_B.pdf`
(846 714 bytes, 49 páginas, Letter 612×792 pt).

**Páginas inspecionadas:** páginas onde Apêndice B aparece (intervalo
verificado por `pdftotext` linha-a-linha). Foi confirmada a presença
visível de:

- início do Apêndice B (linha 958 do texto extraído): "Apêndice B —
  Velarim Conversacional v2.0"
- LiteraryOpener logo após o título
- todas as 21 sub-seções B.1–B.21 em ordem correta
- tabelas grandes (DICIONÁRIO DO NÚCLEO 1.0, DICIONÁRIO CONVERSACIONAL 2.0,
  FRASEÁRIO DE MESA)
- blocos IPA e formas de Velarim preservados
- diálogos modelo e corpus de validação humana
- B.20 REFERÊNCIA RÁPIDA
- B.21 CONCLUSÃO
- página final encerrando em "Falar com precisão é preservar relações."

**Problemas encontrados:** nenhum. A renderização preserva a hierarquia
de títulos, parágrafos, tabelas e blocos de código.

## Arquivos Alterados nesta Auditoria (somente estes, somente no commit)

- `work/qa/scripts/test_apendice_b_consolidation.py` (reescrito para 30
  testes estruturais completos)
- `work/qa/apendice_b_consolidation_report.md` (este relatório)
- `work/qa/scripts/verify_apendice_b_fidelity.py` (novo — calcula hashes
  normalizados e compara)
- `work/qa/apendice_b_normalized_hashes.json` (artefato auxiliar gerado
  pelo `verify_apendice_b_fidelity.py`)

## Arquivos Protegidos Preservados

- `work/working_copy.docx` — SHA-256 binário inalterado
- `work/romantizacao/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_A.md` — SHA-256 binário inalterado
- `work/romantizacao/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_A.docx` — SHA-256 binário inalterado
- `work/romantizacao/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_B.md` — SHA-256 binário inalterado
- `work/romantizacao/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_B.docx` — SHA-256 binário inalterado

## Pendências

- Nenhuma.

## Ações Não Executadas

- Nenhuma ação fora do escopo autorizado foi executada. Os arquivos em
  `incoming/`, `work/checkpoints/`, `work/baseline/`,
  `work/qa/velarim_*`, `work/romantizacao/`, `work/qa/scripts/build_*.py`
  e o diretório `KALLISTIS_SKILL_ESCRITA_AUTORAL/` não foram tocados.

## Distinção Importante

- **SHA-256 binário do arquivo**: protege bytes brutos do arquivo no
  disco. Diferentes entre fonte DOCX, MD e DOCX porque o conteúdo é
  codificado de forma diferente (XML binário compactado, UTF-8 puro,
  XML DOCX).
- **SHA-256 da representação normalizada do Apêndice B**: protege a
  estrutura e o texto do conteúdo após aplicar as 6 normalizações
  permitidas. **Idêntico** entre fonte, MD e DOCX — é a prova de
  fidelidade integral.

Os dois não se substituem. Este relatório registra ambos onde aplicável.
