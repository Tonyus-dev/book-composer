# KALLISTIS — Manual do Mundo v4.3

## Fonte efetivamente usada

- PRINT_PROJECT_SOURCE: `projects/KALLISTIS_MANUAL_DO_MUNDO_v4_3_REBUILD.json`
- PRINT_DATA_SOURCE: `/print?src=/projects/KALLISTIS_MANUAL_DO_MUNDO_v4_3_REBUILD.json`
- PRINT_TEMPLATE_SOURCE: `src/routes/print.tsx` + renderer/template Book Maker
- Base: `projects/KALLISTIS_MANUAL_DO_MUNDO_v4_2_REBUILD.json`
- Cache/snapshot: não usado como fonte final; o projeto explícito foi carregado e validado no `/print`.

## Alterações materializadas

- Vethari: mesmo asset, crop reposicionado para tornar o rosto visível.
- Página 24: metade inferior do asset aprovado OPEN-006, sem remoção do texto.
- História em Marcos: reflow local da abertura em duas colunas, sem redução global de fonte.
- Teaser “Os Lightbringers” removido; seção principal preservada.
- Thaeraen: intro e desenvolvimento unidos; título único; imagem reduzida para eliminar overflow.
- “O Mapa em Duas Camadas”: imagem secundária removida; texto e tabela preservados.
- Parte III: arte canônica aprovada inserida na abertura.
- Índice mecânico dos nove Povos: imagem reduzida proporcionalmente e tabela na mesma página.
- Oito selos inseridos no fim físico dos Ofícios: G3, D1, A3, T3, C1, E2, AR2, B1.
- Marco 9 preservado no fluxo narrativo circundante.
- Remoção autorizada: somente o teaser da página antiga 42.

## Gates

- PRINT_READY: PASS
- Páginas no /print: 323
- HTML_LEAK: PASS
- MARKDOWN_LEAK: PASS
- BASE64_TEXT: PASS
- GLYPHS: PASS — 62
- GLYPH_SIZE_LIMIT: PASS — glifos mantidos em 22 mm, abaixo de 1/7 da página
- VETHARI_FACE_VISIBLE: PASS
- PAGE24_LOWER_HALF_ASSET: PASS
- HISTORY_LOCAL_REFLOW: PASS
- LIGHTBRINGERS_TEASER_REMOVED_MAIN_SECTION_PRESENT: PASS
- THAERAEN_SINGLE_COMPOSITION: PASS
- MAP_SECONDARY_IMAGE_REMOVED: PASS
- PART_III_APPROVED_ART: PASS
- PEOPLES_INDEX_SAME_PAGE: PASS
- OFFICE_SEALS: PASS — 8/8, sem páginas novas
- MARCO9_FLOW: PASS
- TOC_MISMATCH: PASS — 0
- TEXT_OVERFLOW: PASS — 0 errors
- PREFLIGHT_ERRORS: PASS — 0
- FINAL_CLOSURE: PASS — 1 ocorrência, página final
- PDF_CHANGED_VS_V4.2: PASS
- PPI_ANALYSIS: NOT EXECUTED, conforme instrução.

## Saída

- PDF: `dist/export/KALLISTIS_MANUAL_DO_MUNDO_v4.3_PROVA.pdf`
- Cópia Downloads: `/home/tonyus-dev/Downloads/KALLISTIS_MANUAL_DO_MUNDO_v4.3_PROVA.pdf`
- Páginas: 323
- SHA-256: `60729878f99b340f7df60a0cc141927b42b0cc0f38c388aef860dfbb922fb388`
- Commit/push: não executados.

