# KALLISTIS — QA da materialização do livro-base

Data da prova: 2026-08-15

## Resultado

`FINAL_STATUS=INCIDENTE`

O livro-base foi materializado, salvo como projeto nativo, aberto no Book Maker,
editado de forma reversível, fechado, reaberto, revertido e reexportado. O
status global permanece INCIDENTE porque a Ficha do Jogador foi explicitamente
adiada pelo usuário e, portanto, não foi criada nem exportada.

## Gates

```text
SOURCE_SHA256=5427818b44f08ba00cc74f8635172b44952ded4eb948589d22016e4272990d83
SOURCE_VALID=PASS
MANUSCRIPT_INTEGRITY=PASS
BOOK_PROJECT_PATH=/home/tonyus-dev/Projetos/kallistis-book/book_maker/projects/KALLISTIS_manual_do_mundo_final_book.json
PDF_PATH=/home/tonyus-dev/Projetos/kallistis-book/book_maker/dist/export/KALLISTIS_manual_do_mundo_final_book.pdf
BOOK_PAGE_COUNT=394
BOOK_TRIM_SIZE=140 x 210 mm
BLEED=5 mm
BOOK_MATERIALIZATION=PASS (livro-base; ficha explicitamente pendente)
TEXT_BLOCKS_MATERIALIZED=4382 manuscript blocks / 4382 selected
TABLES_MATERIALIZED=175 native table blocks / 133 pages with tables
IMAGES_USED=144 placements / 123 unique approved assets / 124 unique image sources including cover
UNUSED_APPROVED_IMAGES=54
MISSING_ASSETS=0 image source paths missing from public/
FICHA_ASSETS=PENDING_BY_USER
FICHA_PAGES=0 (adiada pelo usuário)
RAW_CONTRACT_EXPORTED=NO
OVERFLOW_ERRORS=0
BLANK_PAGE_ERRORS=0 (394 páginas rasterizadas; a única página sem texto vetorial é a capa raster)
BROKEN_IMAGE_ERRORS=0
PERSISTENCE_TEST=PASS
REOPEN_TEST=PASS
REEXPORT_TEST=PASS
PDF_PREFLIGHT=PASS (0 errors, 528 warnings, 221 infos)
PART_OPENINGS=PASS (6 native part_opening pages; Part I through Part VI)
TOC=PASS (4 pages; 128 derived H1/H2 entries)
BUILD=PASS
TYPECHECK=PASS
TEST=PASS
LINT=INCIDENTE (lint global não concluiu; lint escopado encontrou 147 erros de Prettier preexistentes/distribuídos, sem aplicar formatação ampla)
FINAL_STATUS=INCIDENTE
```

## Evidências

- Fonte: SHA-256 validado antes da materialização; nenhum bloco textual foi
  perdido, duplicado ou reordenado (`4382/4382`, zero divergências de texto,
  zero palavras perdidas/adicionadas).
- Capa: `/assets/cover/kallistis-capa-aprovada-final.png`, SHA-256
  `cd8d9a1e89bec18fd66ab3fe1a73843a6221db688cc51dd622c5c55f3ef88511`.
- Sumário: 4 páginas, 128 entradas derivadas de H1/H2 materializados; não há
  números de página fixos no manuscrito.
- Imagens: 124 fontes únicas foram verificadas contra `public/`; nenhuma está
  quebrada. Os 54 assets aprovados não usados são alternativos, históricos,
  duplicados ou sem atribuição semântica no plano atual; permanecem listados
  para revisão posterior e não foram usados como preenchimento aleatório.
- QA visual: páginas 1, 2, 6, 10, 50, 100, 150, 200, 250, 300, 350 e 394
  inspecionadas; as 394 páginas também foram rasterizadas em baixa resolução.
- Persistência real: no Chromium, `Crop X` de uma imagem da página
  `all-page-0001` foi alterado de 50 para 51, salvo, confirmado após fechar e
  reabrir o navegador, depois revertido para 50 e salvo novamente. O projeto
  preservou 394 páginas e não gerou erros de console.
- PDF final: `345204986` bytes, 394 páginas, folha de 150 x 220 mm; fontes
  EB Garamond e Liberation Sans incorporadas. Busca no texto não encontrou
  `BOOKMAKER CONTRACT`, marcadores brutos, `lorem ipsum`, `placeholder`,
  `missing` ou `debug`.

## Pendências explícitas

1. A Ficha do Jogador não foi materializada, conforme decisão do usuário. O
   contrato existente no manuscrito foi consumido e não aparece no PDF.
2. O lint global do script nativo `bun run lint` percorre a árvore inteira de
   assets e não terminou em mais de quatro minutos. A execução escopada do
   ESLint reportou 147 erros de formatação Prettier em arquivos já alterados e
   em arquivos fora do núcleo desta entrega; não foi aplicada reformatação
   ampla para não introduzir churn.
3. O relatório de assets mantém 54 aprovados sem uso; cada um foi preservado
   no inventário e não foi substituído silenciosamente por outro asset.

Por essas pendências, não há commit final de PASS.
