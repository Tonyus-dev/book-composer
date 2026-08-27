# KALLISTIS — Materialização Editorial MVP

## Veredito

**KALLISTIS_EDITORIAL_MVP=PASS_WITH_MANUAL_REVIEW**

O MVP integral é editável, abre no Book Maker, mantém o manuscrito oficial materializado e não possui P0/P1 conhecido. A fila registra refinamentos P2/P3 esperados para a próxima revisão página por página.

## Fonte e estado

- OFFICIAL_MANUSCRIPT: `/home/tonyus-dev/Downloads/KALLISTIS_MANUSCRITO_CONGELADO.md`
- OFFICIAL_MANUSCRIPT_SHA256: `da7bdf3177b8bb34e8b9df5ca33361c6f451681732be64c458078a4c2da2deca`
- OFFICIAL_MANUSCRIPT_BYTES: 680194
- OFFICIAL_MANUSCRIPT_LINES: 12505
- OFFICIAL_MANUSCRIPT_WORDS: 94040
- PROJECT: `projects/kallistis-manual-do-mundo-reconstrucao.json`
- PAGE_COUNT: 424
- PROJECT_SCHEMA: 1

## Comparação textual

**OFFICIAL_VS_CURRENT=IDENTICAL_CONTENT**

O relatório de materialização registra 4454 blocos selecionados e materializados, 0 mismatches, 0 palavras perdidas, 0 adicionadas, 0 blocos perdidos e 0 duplicados. As diferenças de normalização Markdown não foram tratadas como perda textual.

## Gates reais

- APP_STARTS=PASS — Vite iniciou o app real; o launcher oficial continua bloqueado pelo ambiente na porta 4185 com EPERM, por isso a mesma aplicação foi validada na porta 8082.
- PROJECT_OPENS=PASS — o editor real abriu o projeto integral com 424 páginas.
- CURRENT_BOOK_VISIBLE=PASS — início, meio e fim navegáveis; thumbnail count 424.
- CURRENT_BOOK_EDITABLE=PASS — canvas/editor real carregou blocos nativos, seleção e painel de propriedades.
- PRINT_RENDER=PASS — rota /print renderizou 424 páginas.
- BROWSER_ERRORS=0.
- BROKEN_IMAGES=0; MISSING_REFERENCES=0.
- TABLES=131 páginas com tabelas; 174 elementos de tabela; BROKEN_TABLE_ROWS=0.
- PAGE_OVERFLOW=0 no relatório do materializador; a inspeção DOM das tabelas encontrou 0 tabelas fora da caixa da página.
- SAVE_REOPEN=PASS — projeto integral persistido no projeto local de teste e reaberto no editor real com 424 páginas.
- MANUAL_EDITING_REGRESSION=PASS — seleção, multiseleção, cópia/colagem, agrupamento, bloqueio e undo/redo foram exercitados no editor real; os blocos do manuscrito são flow-only, então drag/resize de moldura não foi aplicado ao conteúdo editorial automático.
- PROOF_EXPORT=INCIDENT_ENVIRONMENT — o exportador auxiliar não conseguiu alcançar o servidor local nesta execução; PRINT_RENDER=PASS continua sendo a prova de renderização real e nenhum PDF foi chamado de final.

## Problemas classificados

- P0_FOUND=0; P0_FIXED=0; P0_REMAINING=0.
- P1_FOUND=0; P1_FIXED=0; P1_REMAINING=0.
- P2_FIXED=0 nesta passagem; as correções de roteamento já presentes foram preservadas.
- MANUAL_REVIEW_COUNT=70; NEEDS_TABLE_REVIEW=36; INCIDENT=0.
- UNDERFILLED_PAGES_LT_60_PERCENT=51; full_art/map_page foram excluídas da classificação de subpreenchimento porque o espaço visual é intencional.

## Templates e roteamento

- TEMPLATES_REGISTERED=13: cover, front_matter, toc, part_opening, chapter_opening, narrative, rules_2col, profile, table_page, quote_layout, full_art, map_page, timeline_milestone.
- TEMPLATES_USED={"front_matter":2,"narrative":173,"chapter_opening":76,"part_opening":6,"timeline_milestone":8,"table_page":1,"full_art":21,"map_page":2,"rules_2col":135}
- TEMPLATES_UNUSED=cover, toc, profile, quote_layout
- UNUSED_COMPATIBILITY: cover=NÃO (sem slot de capa explícito); toc=NÃO como bloco-fonte explícito; profile=SIM — POSSIBLE_ROUTING_GAP para perfis de Povo/Ofício/criatura; quote_layout=SIM — POSSIBLE_ROUTING_GAP para 3 citações destacadas.
- MAPS=2 map_page + 2 map spread; o conteúdo cartográfico principal não caiu em chapter_opening.
- TABLES_ROUTING=135 páginas de referência em rules_2col + 1 table_page; 40 páginas narrative com tabelas compactas estão na fila P3, sem quebra objetiva.
- FALLBACK_PATH_FOUND=YES.
- ROUTING_PATH=SOURCE CONTENT → parseMarkdown → annotateHeadingPaths/bindSemanticAssets → assetForSource → compositionForSource → newPage/applyCompactReferencePage → pagination/addBlock → updatePageMetadata → PageRenderer/TEMPLATES → CSS
- FALLBACK_DETAILS=compositionForSource retorna narrative/TEXT_FLOW/default quando não há classificação/asset; applyCompactReferencePage transforma páginas narrativas sem imagem das Partes V/VI em rules_2col; assetForSource depende de aliases e âncoras semânticas.
- EDITORIAL_INFORMATION_LOST_AT=potencialmente na seleção final de compositionForSource e na compactação applyCompactReferencePage quando uma função não possui branch semântico; não houve perda textual nem incidente P0/P1 na materialização auditada.
- TEMPLATE_ROUTING_INCIDENTS=0 observados no MVP; POSSIBLE_ROUTING_GAP=profile, quote_layout e revisão semântica das tabelas narrative.

## Auditoria visual por família dominante

### narrative

- narrativa/lore contínuo — p.37 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- geografia — p.55 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS (a função cartográfica principal está no spread p.53–54); FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- cultura/sociedade — p.97 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS (não exigida nesta página de referência); FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- texto com elemento secundário — p.59 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- tabela de linguagem integrada ao fluxo — p.214 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS com revisão P3 de template; VISUAL_QUALITY=GOOD.

### rules_2col

- regra textual — p.241 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- procedimento/criação — p.243 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- lista/tabela — p.267 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- referência mecânica densa — p.264 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.

### chapter_opening

- abertura de capítulo — p.6 Manesh — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- Povo — p.81 Distribuição dos Povos — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- geografia — p.90 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.
- Bestiário especializado — p.288 — FIT_CONTENT=PASS; FIT_HIERARCHY=PASS; FIT_DENSITY=PASS; FIT_IMAGE=PASS; FIT_EDITORIAL_ROLE=PASS; VISUAL_QUALITY=GOOD.

A amostragem indica composição deliberada nas famílias dominantes. A ressalva observada é semântica, não de acomodação: tabelas compactas em páginas `narrative` permanecem legíveis, mas entram na fila P3 para confirmação editorial humana.

## Cobertura visual

- VISUAL_ASSETS_AVAILABLE=346 arquivos; 334 hashes únicos no diretório público.
- VISUAL_ASSETS_USED=139 referências únicas; 136 hashes únicos; 160 colocações.
- VISUAL_ASSETS_UNUSED=198 hashes únicos não utilizados nesta materialização.
- VISUAL_ASSETS_MISSING=0; nenhum ref de imagem do projeto aponta para arquivo inexistente.
- PAGES_WITH_IMAGES=147; UNIQUE_IMAGE_PATHS=139.
- PART_OPENINGS=6/6.
- POVO_OPENINGS=9/9.
- OFICIO_OPENINGS=9 (8 ofícios oficiais + abertura cultural genérica).
- BESTIARY=35 páginas.
- LONG_TEXT_RUN_MAX=33; classificado como ritmo editorial/manual review quando pertinente, não como incidente.

## Pendências honestas

- A Ficha do Jogador está representada pelo contrato textual oficial, mas as quatro páginas nativas ainda não foram materializadas; por isso as páginas do contrato estão em MANUAL_REVIEW, não em INCIDENT.
- A revisão visual integral página a página ainda é a próxima fase. O MVP foi verificado por auditoria estrutural completa, render real e amostragem visual sem P0/P1.
- Não foram geradas novas imagens e nenhum asset ausente foi substituído silenciosamente.

## Arquivos

- `src/lib/persistence/local.ts` deixou de falhar quando a cópia legada v1 excede a quota; o snapshot v2 atual continua sendo salvo.
- `src/data/canonical-book.ts` agora aponta para a materialização integral existente; o projeto anterior de 280 páginas foi preservado.
- `KALLISTIS_EDITORIAL_MVP_REPORT.md`
- `KALLISTIS_EDITORIAL_COVERAGE.md`
- `KALLISTIS_PAGE_REVIEW_QUEUE.tsv`
- `KALLISTIS_EDITORIAL_ASSETS.tsv`
