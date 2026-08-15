# KALLISTIS — Reconstrução editorial — arqueologia

Fonte desta execução: `KALLISTIS_MANUSCRITO_CONGELADO.md` fornecido em
`/home/tonyus-dev/Downloads/`.

Estado registrado antes da alteração: checkout limpo, branch
`fix/book-maker-production-deploy`, HEAD `e493534`.

## 1. Book Maker atual

- Root: `/home/tonyus-dev/Projetos/kallistis-book/book_maker`.
- Aplicação TanStack Start/React com rotas `/` (editor) e `/print` (renderização de impressão).
- Modelo serializável em `src/book/types.ts`, renderização em `PageRenderer`/`BlockRenderer`, persistência local em `src/lib/persistence/local.ts` e import/export em `src/lib/persistence/json.ts`.
- O fluxo físico vigente é trim `140 × 210 mm`, retrato, com sangria de `5 mm` por lado; a folha física de impressão mede `150 × 220 mm`.
- Exportação PDF usa Chromium real por `scripts/export-pdf.mjs`; preflight é parte do fluxo, não substituto da inspeção visual.
- O editor suporta edição de texto, imagens, tabelas, assets locais, salvamento local e reabertura.

## 2. Schema atual

- `schemaVersion: 1`.
- Estruturas principais: `meta`, `tokens`, `nodes`, `pages`, `assets`, `fonts`, `spreads`, `tableStyles`, `recipes`, `sheetTemplates` e `sheetInstances`.
- Tipos de página reutilizáveis encontrados: `cover`, `front_matter`, `toc`, `part_opening`, `chapter_opening`, `narrative`, `rules_2col`, `profile`, `table_page`, `quote_layout`, `full_art`, `map_page` e `timeline_milestone`.
- Blocos existentes cobrem heading, texto, imagem, quote, tabela, shapes/divisores, fichas e elementos de folha. A materialização deve continuar emitindo esse schema.
- Proveniência editorial já existe em `BaseBlock.materialization`, incluindo arquivo/linhas/bloco de origem e fragmentos.

## 3. Materializadores encontrados

- `scripts/materialize-manuscript.mjs` é um adaptador do Book Maker existente: lê Markdown, cria blocos, mede no `/print`, pagina por altura real e emite JSON do schema atual.
- O script reutiliza o renderer real, tabelas, famílias editoriais, assets semânticos e verificação de texto/overflow.
- Defeito identificado para esta missão: o materializador está parametrizado para outro manuscrito, catálogo e contagem fixa de `90.768` palavras. Será feita apenas a parametrização mínima de fonte/saída, sem renderer paralelo.
- `scripts/export-pdf.mjs`, `scripts/prepare-v1-4-prepress.py` e scripts de preflight/contact sheet são reutilizáveis depois da materialização.

## 4. Projetos anteriores encontrados

- `projects/kallistis-livro-basico.json`: base canônica do editor.
- Candidatos materializados v1, v1.3, v1.4 e v1.5, além de projetos de história e partes preservadas.
- Relatórios e revisões em `_review/`, `KALLISTIS_Manual_do_Mundo_v1.4_400p_CANDIDATO.report.*` e documentação editorial em `docs/` e `work/qa/`.
- Os candidatos antigos usam o manuscrito de produção anterior; não são autoridade textual para esta reconstrução.

## 5. Portable-base analisado

- Arquivo: `/home/tonyus-dev/Downloads/kallistis-book.portable (2).json`.
- SHA-256: `ddb082220b9b9994c6837af5d4fc84cbe78421a1e19ae1fb8e7ebb2d415a9d3f`.
- `schemaVersion: 1`, 402 páginas, 9 nodes, 4.454 blocos, 1 spread e 3 referências de asset.
- O arquivo é referência editorial histórica, não fonte textual. Seus assets têm referências `storage.kind=local` sem bytes `data`; portanto não é um portable autossuficiente fora do perfil local original.
- Decisões reaproveitáveis: schema, famílias, trim, bleed, spreads, posicionamento/crop e tratamento de tabelas quando compatíveis.

## 6. Assets encontrados

- Há um catálogo local real em `public/assets/`, além do acervo de produção em
  `/home/tonyus-dev/Downloads/CURADORIA_DE_CONTEUDO/agora_sim_producao/PRODUCAO/IMAGENS/`.
- O checkout já contém famílias `complete`, `handoff/approved`, `maps`, `locations`, `partes`, `povos`, `cover` e o acervo hashado de prepress.
- Existe também `FICHA_PERSONAGEM/KALLISTIS_FICHA_PERSONAGEM_FINAL_22_DE_22.zip`; a presença do ZIP foi confirmada, mas a cobertura 22/22 ainda precisa ser validada antes de declarar a ficha pronta.
- Regra de uso: asset aprovado/canônico primeiro; lacuna será marcada como `MISSING_ASSET` com âncora semântica, nunca preenchida por arte aleatória ou gerada.

## 7. Decisões editoriais boas

- Separação entre modelo editorial e JSX.
- Paginação medida pelo DOM/CSS real do `/print`, preservando o trim físico.
- Proveniência por bloco e comparação textual por palavras.
- Famílias distintas para abertura, narrativa, regras, tabela, mapa, timeline e arte.
- Tratamento semântico de assets com `objectX/objectY`, crop, spreads e metadata de âncora.
- Tabelas com modelo próprio, quebra/continuação e cabeçalho repetível.
- Exportação portátil explícita e persistência local com IndexedDB para bytes de assets.

## 8. Erros editoriais anteriores

- Relatórios dos candidatos anteriores registram corridas longas de páginas somente textuais e páginas não-feature subpreenchidas; o PDF e o JSON não foram suficientes para declarar prontidão editorial.
- Há risco documentado de repetição mecânica `imagem → título → texto` e de composição com espaço morto; o rebuild deve escolher família conforme função.
- Preservar uma solução visual histórica não autoriza preservar texto antigo, crop ruim, tabela ilegível ou asset quebrado.

## 9. Erros técnicos anteriores

- O materializador atual ainda acopla fonte e contagem do manuscrito de produção anterior.
- O portable histórico pode parecer importável, mas depende de assets locais ausentes em outro perfil.
- Build, parse de JSON e exportação PDF são gates parciais; não provam abertura, edição, save/reopen ou portabilidade.
- A meta histórica de 400/420 páginas não deve orientar a nova paginação; a extensão deve emergir do manuscrito e do renderer.

## 10. Componentes reutilizáveis

- `src/book/types.ts`, `PageRenderer`, `BlockRenderer`, templates existentes e CSS físico.
- `src/lib/persistence/json.ts` e `src/lib/persistence/local.ts` para import/export/save/reopen.
- `scripts/materialize-manuscript.mjs` como adaptador, com parametrização mínima.
- `scripts/export-pdf.mjs`, preflight, medição de tabela e contact sheets.
- Assets aprovados já materializados no checkout, quando a âncora textual continuar válida.

## 11. Componentes que NÃO devem ser reutilizados

- Texto, ordem de capítulos, metas de páginas ou metadados editoriais do portable antigo quando divergirem do manuscrito novo.
- Referências locais de asset do portable sem bytes ou sem resolução verificável.
- Qualquer mock, placeholder não sinalizado ou arte gerada para esconder lacuna.
- Um renderer, schema, persistência ou HTML de livro paralelo.

## 12. Riscos da reconstrução

- O manuscrito novo tem 94.040 palavras, 10 headings de nível 1 (incluindo apêndices e contrato da ficha), 1.115 headings no total, 152 tabelas, 1.621 linhas de lista e 3 quotes; é estruturalmente diferente da fonte antiga.
- O parser existente precisa ser exercitado com a nova divisão em seis Partes + Apêndices e com o contrato da ficha.
- Parte do acervo de produção ainda pode não ter correspondência canônica no catálogo do checkout.
- A ficha pode ser um ZIP legado que precisa de validação documental/visual própria.
- O resultado pode terminar como `INCIDENTE` por lacunas de asset, overflow, falha de portabilidade ou ritmo visual, mesmo com cobertura textual perfeita.

## 13. Estratégia escolhida

1. Parametrizar a fonte Markdown e a saída do materializador mantendo o schema e o renderer atuais.
2. Gerar um piloto real com trechos representativos do manuscrito novo, abrir no Book Maker, editar, salvar e reabrir.
3. Só após o piloto, materializar um projeto separado com a ordem soberana do manuscrito, proveniência e paginação por altura real.
4. Gerar cobertura textual, catálogo de assets e status por página; marcar lacunas explicitamente.
5. Exportar/importar pelo mecanismo normal, produzir PDF e executar preflight/QA visual real.
6. Não alterar o manuscrito, o portable histórico, o projeto canônico, nem commitar/pushar automaticamente.

