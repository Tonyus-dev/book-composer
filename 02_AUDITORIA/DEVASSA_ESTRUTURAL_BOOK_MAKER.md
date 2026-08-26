# DEVASSA ESTRUTURAL — KALLISTIS BOOK MAKER

> Auditoria read-only do estado `a56fa59` do repositório `Tonyus-dev/kallistis-book`.
> Sem alterações, sem commits, sem PRs. Apenas evidência.

---

## 1. Veredito

**AUDITORIA_INCOMPLETA — fonte canônica do manuscrito fora do repositório.**

- O **projeto Book canônico** existe e é versionado: `book_maker/projects/kallistis-manual-do-mundo-reconstrucao.json` (referenciado tanto pelo editor em `src/data/canonical-book.ts` quanto pelo materializador em `scripts/materialize-manuscript.mjs`). 423 páginas, 5,9 MB, schemaVersion 1.
- A **fonte textual canônica do manuscrito** está **fora do repositório** (`/home/tonyus-dev/Downloads/KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md`, SHA-256 esperado `5427818b44f08ba00cc74f8635172b44952ded4eb948589d22016e4272990d83`). O materializador **falha imediatamente** se o SHA não bater. Isto torna a fonte textual `SOURCE_OF_TRUTH_AMBIGUOUS`: o JSON é a verdade derivada; o `.md` congelado é a verdade primária e não está sob controle de versão.
- O **catálogo de imagens aprovado** vive em três lugares diferentes (`public/editorial-asset-manifest.json`, `drive-image-inventory.json` + `drive-image-disposition.csv`, e a tabela `KALLISTIS_RECONSTRUCAO_ASSETS.tsv` citada como `inventory` do manifest). Os três têm SHA-256 hardcoded de assets; o materializador aceita qualquer um.
- O **plano de produção editorial** é o componente `BookProductionPlan` dentro do próprio Book JSON (`projects/kallistis-manual-do-mundo-reconstrucao.json.productionPlan`) **e** um arquivo externo `projects/kallistis-production-plan.json` (versão antiga, ainda no repo).
- A **paginação é FIXA, não gerada**: o `pagination/adapter.ts` declara explicitamente que `engine="fixed"` é o único disponível; o materializador não usa esse adapter. Ele abre um Chromium real, abre `/print`, mede via `getBoundingClientRect`, e decide fit/split pelo DOM renderizado. As duas estratégias não compartilham código.
- O **Book Maker** (UI, persistência, edição, preflight, export) e o **motor de construção de livro** (materializer + planner) **são implementações separadas, em arquivos separados, com contratos parcialmente sobrepostos**. A separação conceitual pedida no briefing **NÃO está materializada no código** — é um alvo de refatoração, não um fato.

---

## 2. Estado Git

```text
REPOSITORY:  Tonyus-dev/kallistis-book
BRANCH:      master
HEAD:        a56fa59c4388481f21a5efcc55ff7da2f562b20b
DEFAULT_BRANCH: master (origin/HEAD = master)
WORKTREE:    /home/tonyus-dev/Portifolio/kallistis-book
NODE_VERSION: v24.19.0
BUN_VERSION: 1.3.14
OS:          Linux kalines-note 7.0.0-30-generic Ubuntu 24.04 x86_64
```

```bash
git status --short       # (vazio)
git branch --show-current  # master
git rev-parse HEAD         # a56fa59c4388481f21a5efcc55ff7da2f562b20b
git remote -v              # origin -> https://github.com/Tonyus-dev/kallistis-book.git
```

Working tree limpo. Nenhum arquivo alterado, nenhum untracked.

Os 20 commits mais recentes (resumo):
- topo: `a56fa59 docs: present KALLISTIS Book Maker`
- base: a partir de `424f89d Merge PR #5: streamline editor workspace`
- história principal: branch `fix/book-maker-production-deploy` foi mergeada no master e é a base de tudo o que se chama "produção" hoje.

---

## 3. Mapa do repositório

### 3.1 Top-level

| Diretório/arquivo | Tamanho | Função | Classificação |
| --- | --- | --- | --- |
| `00_COMECE_AQUI/` | 18 KB | Prompt de operação editorial congelado v1.1 | EDITORIAL_POLICY |
| `01_FONTE_UNICA/` | 18 MB | Cópia espelho de `source/KALLISTIS_LIVRO_BASICO_BASE_PARA_REVISAO.docx` (não é o manuscrito final v2) | LEGACY |
| `02_AUDITORIA/` | 5 KB | Auditoria pré-edição (Claude) | HISTORICAL |
| `03_OUTPUT_ESPERADO/` | 18 MB | `KALLISTIS_LIVRO_BASICO_ATE_CAPITULO_07.docx` (espelho de `work/`) | LEGACY |
| `KALLISTIS_SKILL_ESCRITA_AUTORAL/` | 8 KB | Skill de escrita autoral (`.agents/`) | EDITORIAL_POLICY |
| `MANIFESTO_SHA256.txt` | 636 B | SHA-256 dos artefatos top-level | KALLISTIS_POLICY |
| `README.md` | 608 B | README raiz mínimo | KALLISTIS_POLICY |
| `book_maker/` | ~10 GB (com assets) | Aplicação | SOURCE |
| `docs/` | 5 MB | Brand + editorial merge | KALLISTIS_POLICY |
| `source/` | 18 MB | Espelho do `01_FONTE_UNICA` | LEGACY |
| `work/` | 80 MB | `working_copy.docx`, checkpoints, QA, romantização | LEGACY/HISTORICAL/QA |

### 3.2 `book_maker/`

| Diretório | Linhas (aprox.) | Função | Classificação |
| --- | --- | --- | --- |
| `src/book/` | ~5 700 | Modelo de dados editorial + renderer + templates | CORE_MODEL + RENDERER |
| `src/book/templates/` | 600 | 13 templates (cover, front_matter, toc, part_opening, chapter_opening, narrative, rules_2col, profile, table_page, quote_layout, full_art, map_page, timeline_milestone) | RENDERER |
| `src/book/renderer/` | ~1 500 | `PageRenderer`, `BookRoot`, `BlockRenderer`, `SheetRenderer`, `markdown.tsx` | RENDERER |
| `src/book/pagination/adapter.ts` | 39 | Stub de paginação FIXA | PAGINATION (stub) |
| `src/book/authoring.ts` | 800 | Recipes, smart paste, ASCII layout, form-from-lines | EDITOR |
| `src/book/tableModel.ts` | 645 | V1/V2 tables, split, repeat header, continuation | EDITOR |
| `src/book/sheetModel.ts` + `sheetFormula.ts` | 700 | Documentos preenchíveis, fórmulas | EDITOR |
| `src/book/styles/` | 1 500 | tokens.css, page.css, components.css, tables.css, print.css, typography.css | RENDERER |
| `src/editor/` | 6 500 | Editor Free Canvas: layout, panels, store, overlays, components | EDITOR |
| `src/components/ui/` | 4 500 | Componentes shadcn (Radix) — infraestruturais | GENERIC_ENGINE |
| `src/lib/assets/` | 800 | Catálogo, registry, edit, upload, local-store | ASSET_PIPELINE |
| `src/lib/persistence/` | 800 | local (localStorage), cloud (D1), json, work-file, source, production-plan | PERSISTENCE |
| `src/lib/preflight/` | 1 400 | measure (DOM), static-rules, types, report, download | QA |
| `src/lib/rhythm/` | 500 | Métricas e warnings visuais | QA |
| `src/routes/` | 500 | `/`, `/print`, `/login` | RENDERER |
| `src/server-api.ts` | 639 | API do Worker (auth, projects D1, export-from-snapshot) | PERSISTENCE |
| `src/server.ts` + `start.ts` + `router.tsx` + `routeTree.gen.ts` | 200 | Bootstrap TanStack Start | GENERIC_ENGINE |
| `scripts/` | 8 200 | Materializador, planner, export-pdf, test scripts, build-p001-p030, audit, etc. | MATERIALIZER + EXPORT + TEST |
| `projects/` | 11 MB | 4 JSONs (canônico, final v1.5 reconstrução, plano de produção v1.0, qa) | PERSISTENCE |
| `public/assets/` | 1.7 GB (estimado) | Capas, branding, handoff/approved, partes, povos, ofícios, bestiário, mapas, v1.4-prepress, v1.5-acervo (64 PNGs), complete | ASSET_PIPELINE |
| `public/editorial-asset-manifest.json` | 286 KB | Manifesto aprovado de assets | KALLISTIS_POLICY |
| `tests/e2e/` | 350 | Playwright: free-canvas-mvp, production-smoke | TEST |
| `playwright.config.ts` | 21 | Config Playwright | TEST |
| `migrations/0001_initial.sql` | (não lido) | D1 | PERSISTENCE |
| `KALLISTIS_*.{tsv,md,json,png,html}` | raiz | Relatórios e artefatos de produção (v1.4, v1.5, reconstrução, MVP, queue) | HISTORICAL |
| `drive-image-inventory.json` + `drive-image-disposition.csv` | 6 KB + 4 KB | Inventário bruto de imagens do Drive | KALLISTIS_POLICY |
| `KALLISTIS-Book-Maker.desktop` | 331 B | Atalho `.desktop` para Linux | LOCAL_DEFAULT |
| `KALLISTIS_EDITORIAL_ASSETS.tsv` | 278 B | Stub antigo (placeholder) | LEGACY |
| `KALLISTIS_EDITORIAL_COVERAGE.md` + `KALLISTIS_EDITORIAL_MVP_REPORT.md` | 16 KB | Relatórios de cobertura editorial | HISTORICAL |
| `KALLISTIS_RECONSTRUCAO_*.{tsv,md}` | 200 KB | Relatórios de reconstrução | HISTORICAL |
| `KALLISTIS_Manual_do_Mundo_v1.4_400p_CANDIDATO.{manifest.json,report.json,png}` | 105 KB | Artefato v1.4 candidato a impressão 400p | HISTORICAL |
| `_review/` | 30 MB | 32 subdirs `P001..P032` + `historia-v4`, `historia-v5`, `completo-v1`, `completo-v1.3`, `completo-v1.3-final`, `partes-i-iv-v1` — previews e preflight | HISTORICAL/QA |
| `contact-sheets/` | 16 JPGs | KALLISTIS v1.4 400p por grupos de 25 páginas | HISTORICAL |
| `bun.lock` | 175 KB | Lockfile Bun | PERSISTENCE |
| `package.json` | 4.3 KB | Scripts npm/bun | GENERIC_ENGINE |
| `vite.config.ts` | 2 KB | Vite + TanStack Start | GENERIC_ENGINE |
| `wrangler.jsonc` + `.output/server/wrangler.json` | 1 KB | Config Cloudflare | PERSISTENCE |

### 3.3 Top-30 maiores arquivos (já fora de `public/assets/`)

- `KALLISTIS_Manual_do_Mundo_v1.5_400p_CANDIDATO-56_1.png` 3.4 MB e `…-57_1.png` 3.4 MB — duas páginas candidatas soltas na raiz
- `KALLISTIS_Manual_do_Mundo_v1.4_400p_CANDIDATO.manifest.json` 91 KB
- `preflight-report.json` 245 KB
- `preflight-report.html` 132 KB
- `projects/kallistis-manual-do-mundo-reconstrucao.json` 5.7 MB — **canônico**
- `projects/KALLISTIS_manual_do_mundo_final_book.json` 5.5 MB — **final v1.5**
- `work/checkpoints/working_copy_pre_prologo.docx` 18 MB — duplicado do manuscrito
- `01_FONTE_UNICA/KALLISTIS_LIVRO_BASICO_BASE_PARA_REVISAO.docx` 18 MB — espelho
- `source/KALLISTIS_LIVRO_BASICO_BASE_PARA_REVISAO.docx` 18 MB — espelho

**Conclusão:** o repositório é grande (~10 GB se contarmos `public/assets/`), redundante em ~36 MB de DOCX espelhados, e mistura artefatos versionados com artefatos de relatório.

---

## 4. Autoridades e sources of truth

### 4.1 Tabela de candidatos a "source of truth"

| Objeto | Caminho | Quem lê | Quem escreve | Competidor | Autoridade observada |
| --- | --- | --- | --- | --- | --- |
| Manuscrito `.docx` "básico" | `01_FONTE_UNICA/KALLISTIS_LIVRO_BASICO_BASE_PARA_REVISAO.docx` | ninguém no app (referenciado só pelo prompt) | humano | `source/` (espelho), `work/working_copy.docx`, `work/checkpoints/...` | LEGACY — não é o manuscrito final v2 |
| Manuscrito congelado v2 `.md` | `/home/tonyus-dev/Downloads/KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md` (SHA-256 `5427818b…d83`) | `scripts/materialize-manuscript.mjs` (via `EXPECTED_MANUSCRIPT_SHA256`); também `work/qa/audit_docx_structure_report.json` e `KALLISTIS_EDITORIAL_MVP_REPORT.md` (mencionam `KALLISTIS_MANUSCRITO_CONGELADO.md` SHA `da7bdf…ca`, **SHA diferente**) | humano | também o `.docx` "básico" no repo | `SOURCE_OF_TRUTH_AMBIGUOUS` — primária fora do repo + dois SHA diferentes circulando |
| Projeto Book canônico (v1.5) | `book_maker/projects/kallistis-manual-do-mundo-reconstrucao.json` | `src/data/canonical-book.ts` (import default); `scripts/materialize-manuscript.mjs` (`CANONICAL_PROJECT`); `scripts/audit-editorial-mvp.mjs`; `scripts/editorial-planner.mjs` via `book.productionPlan` | scripts (rebuild); UI (edição) | `projects/KALLISTIS_manual_do_mundo_final_book.json` (output do materializador, ~5,5 MB, "final v1.5") | `CURRENT_BOOK_PROJECT` — **autoridade observada** |
| Projeto Book final (v1.5) | `book_maker/projects/KALLISTIS_manual_do_mundo_final_book.json` | `src/data/canonical-book.ts` (NÃO) — só o "reconstrução" é importado | `scripts/materialize-manuscript.mjs` (output) | mesmo arquivo é canônico na cadeia de auditoria (`KALLISTIS_manual_do_mundo_final_book.qa.md` o cita como `BOOK_PROJECT_PATH`); QA report diz `INCIDENTE` | derivado, **não canônico para o editor** |
| Manifesto de assets | `book_maker/public/editorial-asset-manifest.json` | `scripts/materialize-manuscript.mjs` (default `DEFAULT_MANIFEST`); `scripts/editorial-planner.mjs` (recebido como `manifest`) | `scripts/build-editorial-asset-manifest.mjs` | `drive-image-inventory.json` (com paths absolutos antigos) + `drive-image-disposition.csv` (CSV) | `CURRENT_ASSET_MANIFEST` **por convenção**, não por tipo — o materializador aceita CSV via inventário se o manifest não tiver `assets` |
| Plano de produção editorial | dentro de `Book.productionPlan` (campo do JSON) | `PageRenderer` (data-attributes); `KALLISTIS_EDITORIAL_MVP_REPORT.md` (consome `EDITORIAL_PLAN_*` do diagnostics) | `scripts/materialize-manuscript.mjs` (gera em runtime) | `projects/kallistis-production-plan.json` (formato externo legado, **não** importado pelo app nem pelo materializador) | `CURRENT_PRODUCTION_PLAN` — versão no JSON canônico |
| Catálogo externo aprovado | `/home/tonyus-dev/Downloads/CURADORIA_DE_CONTEUDO/agora_sim_producao/PRODUCAO/00_CATALOGO_MESTRE_PRODUCAO_KALLISTIS_REV1.md` (env-overridable: `KALLISTIS_CATALOG_PATH`) | `scripts/materialize-manuscript.mjs` (exige string `## 28. Cobertura editorial capítulo a capítulo — REV1`) | humano | `public/editorial-asset-manifest.json` | `SOURCE_OF_TRUTH_AMBIGUOUS` — fallback do materializador se `KALLISTIS_CATALOG_PATH` não setado |
| Relatório de QA | `book_maker/projects/KALLISTIS_manual_do_mundo_final_book.qa.md` (+ `.report.json`) | humanos (não consumido pelo app) | `scripts/materialize-manuscript.mjs` (gera `.report.json`) | `book_maker/preflight-report.{json,html}` (gerado pelo `export-pdf.mjs` em runtime) | `CURRENT_QA_REPORT` — congelado em commit, mas reproduzível via `materialize:historia` |
| Relatório preflight | `book_maker/preflight-report.{json,html}` | humanos; `export-pdf.mjs` bloqueia se `errors > 0` | `scripts/export-pdf.mjs` (via `src/lib/preflight/report.ts`); `/print` route em runtime | idem | `CURRENT_QA_REPORT` em runtime |
| Capa aprovada | `book_maker/public/assets/cover/kallistis-capa-aprovada-final.png` (SHA-256 `cd8d9a1e…11`) | `scripts/materialize-manuscript.mjs` (`APPROVED_COVER_SRC` e `APPROVED_COVER_SHA256`) | humano | `book_maker/public/assets/cover/capa-cristal.jpg` (versão antiga, presente no JSON canônico) | `CURRENT_COVER` — hardcoded por SHA no materializador |
| Receita / plano de produção antigo | `book_maker/projects/kallistis-production-plan.json` (123 linhas, formato `{ pages: { "p-001": { status, brief, textSources, assets, notes, review } } }`) | ninguém no app | humano (provavelmente do Lovable ou Antígravity) | `Book.productionPlan` (formato V1 com `assignments` e `unusedApprovedAssets`) | `DEAD_CODE` no app — formato não consumido |

### 4.2 Identificações explícitas

- `CURRENT_TEXT_SOURCE_OF_TRUTH = SOURCE_OF_TRUTH_AMBIGUOUS` (manuscrito v2 fora do repo; SHA hardcoded, sem fallback local; manifesto v1.3 e manuscrito "básico" no repo referenciados pelo prompt mas não consumidos pelo materializador)
- `CURRENT_BOOK_PROJECT = book_maker/projects/kallistis-manual-do-mundo-reconstrucao.json` (5,9 MB, 423 pages, schemaVersion 1; importado por `src/data/canonical-book.ts` como `canonicalBook`)
- `CURRENT_ASSET_MANIFEST = book_maker/public/editorial-asset-manifest.json` (286 KB, 177 approved + 288 pending; formato com `policy.blockedStatuses`, `counts`, `assets[]`)
- `CURRENT_PRODUCTION_PLAN = Book.productionPlan` (dentro do JSON canônico, formato V1 com `assignments[]`, `unusedApprovedAssets[]`, `pendingAssets[]`)
- `CURRENT_QA_REPORT = book_maker/projects/KALLISTIS_manual_do_mundo_final_book.qa.md` + `.report.json` (veredito mais recente: `INCIDENTE` por ficha do jogador adiada; PASS materialização)
- `CURRENT_PDF_PIPELINE = scripts/export-pdf.mjs` (Playwright → /print → `page.pdf` em chunks de 50 → `pdfunite` → Ghostscript `/printer`; chamado pelo app via `POST /api/export-from-snapshot`, que **só roda em ambiente Node**)

---

## 5. Arquitetura runtime

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           KALLISTIS BOOK MAKER (UI)                          │
│                                                                              │
│  /index               /print                       /login                    │
│   ├─ EditorLayout        ├─ PrintView                 └─ auth              │
│   ├─ LightTable          ├─ BookRoot                                         │
│   ├─ PageCanvas          ├─ PageRenderer[]                                  │
│   ├─ panels/             └─ preflight (measure + report)                    │
│   ├─ store.tsx (Zustand)                                                        │
│   └─ lib/persistence/local.ts  (localStorage + IndexedDB)                    │
│                                                                              │
│  server-api.ts:                                                               │
│   POST /api/auth/login, /logout                                                │
│   GET  /api/auth/session                                                       │
│   GET/POST /api/projects  (D1)                                                 │
│   POST /api/projects/:id/snapshot   (D1 + R2)                                  │
│   POST /api/export-from-snapshot → spawns `scripts/export-pdf.mjs` (Node-only)│
│   GET  /api/projects/:id/assets/:aid   (R2)                                    │
│   GET  /api/sources/github/tree (Tonyus-dev/kallistis_producao @ main)        │
│   POST /api/sources/github/import (R2)                                         │
│   GET  /api/assets/github (R2)                                                 │
└──────────────────────────────────────────────────────────────────────────────┘
            ▲                                                ▲
            │ /print injeta window.__KALLISTIS_BOOK__        │ manifest externo
            │ via addInitScript (Playwright)                 │
            │                                                │
   ┌────────┴────────┐                              ┌───────┴────────┐
   │ scripts/export- │                              │ scripts/       │
   │ pdf.mjs         │                              │ materialize-   │
   │                 │                              │ manuscript.mjs │
   │  Chromium       │                              │                │
   │   ↳ /print      │                              │  Playwright    │
   │   ↳ page.pdf()  │                              │   ↳ http://    │
   │   (50 pages)    │                              │     127.0.0.1: │
   │   ↳ pdfunite    │                              │     4185/print │
   │   ↳ gs /printer │                              │   ↳ mede DOM   │
   └─────────────────┘                              │     real       │
                                                    │  Chromium      │
                                                    │  Playwright    │
                                                    └────────────────┘
                                                            ▲
                                                            │ lê:
                                                            │  /home/tonyus-dev/Downloads/
                                                            │   KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md
                                                            │  public/editorial-asset-manifest.json
                                                            │  projects/kallistis-manual-do-mundo-reconstrucao.json
                                                            │  public/assets/cover/kallistis-capa-aprovada-final.png
                                                            │  HISTORY_ASSETS (literais no script)
                                                            │  drive-image-inventory.json
```

Observações:

- O materializador **sobe o próprio servidor Vite** (`ensureServer` em `materialize-manuscript.mjs`) na porta `4185` (env `KALLISTIS_MATERIALIZER_PORT`), abre Chromium, navega em `/print`, e **mede cada candidato via `evaluate` + `getBoundingClientRect`**. O `getPaginationAdapter("fixed")` declarado em `src/book/pagination/adapter.ts` é um stub no-op que **não é usado pelo materializador**.
- O exportador `export-pdf.mjs` usa a mesma rota `/print`, mas injeta o snapshot via `addInitScript({window.__KALLISTIS_BOOK__ = ...})`. Em produção (`/api/export-from-snapshot`), o servidor spawna esse mesmo script em subprocesso Node. O exportador Cloudflare Worker (D1/R2) **NÃO tem export-from-snapshot**; retorna 503 deliberadamente.
- O `print.tsx` é o único consumidor real de paginação: ele publica `window.__KALLISTIS_PREFLIGHT__` quando o `data-print-ready='true'`. O exportador usa isso para abortar antes do PDF se houver `ERROR`.

---

## 6. Arquitetura editorial

```
Manuscrito .md congelado (off-repo)
   │
   ▼ parseMarkdown(markdown, scope)            ────────────► HISTÓRICO / SCOPE BOUNDARY
sourceBlocks[]                                   scope: HISTORIA | MUNDO | REGRAS | ALL
   │                                               │ PARTES_I_IV | COMPLETO
   │ annotateHeadingPaths                          
   │ filterBlocksForProfile(profile)               ────────► EDITORIAL POLICY (público vs contrato)
   │ scopedBlocks (filter by sectionH1 regex)     ────────► EDITORIAL POLICY
   │ planEditorialAssets(plan)                    ────────► ASSET POLICY (approved only, score ≥ 10)
   │ bindSemanticAssets (SEMANTIC_ASSET_RULES)    ────────► KALLISTIS_PROJECT_POLICY (lista literal)
   │
   ▼ materialize() — the engine
   │  for each source:
   │    asset = assetForSource(source)            ────────► KALLISTIS_PROJECT_POLICY
   │    compositionBoundary? frontMatter? timelineBoundary?
   │    cadenceReached? visualDebt ≥ targetInterval?
   │    candidate = page + materialize(block, policy)
   │    renderAndMeasure(chromium, page)          ────────► RENDERER (real)
   │    if fits: page += block
   │    else: split (text or table), binary search ────────► PAGINATION ENGINE
   │    updatePageMetadata
   │
   ▼
pages[], pageMeasurements[], spreads[]
   │
   ▼ assemble Book
   │ coverPage + tocPages + generated.pages
   │ productionPlan (assignments, unusedApprovedAssets, pendingAssets)
   │ nodes (front | part | chapter | appendix)
   │
   ▼ validateMaterialization
   │ SOURCE_BLOCK_TEXT_MISMATCHES, SOURCE_WORDS_LOST/ADDED,
   │ DUPLICATE_FRAGMENT_OCCURRENCES, FRAGMENT_SEQUENCE_ERRORS,
   │ PAGE_OVERFLOW, ORPHAN_HEADINGS, BROKEN_TABLE_ROWS,
   │ SOURCE_ORDER_CHANGED, INVALID_IMAGE_PLACEMENTS, ASSETS_MODIFIED
   │
   ▼ finalMeasurements (re-mede o livro inteiro)
   ▼
   ▼ writeFile(book.json + report.json)
   ▼
   ▼ exit 0 se PASS, 1 caso contrário
```

---

## 7. Modelo Book

Reconstrução a partir de `src/book/types.ts` (923 linhas) e usos no materializador:

```text
Book (schemaVersion: 1)
 ├── meta               { title, subtitle, author, imprint, edition, prepressGrayscale, firstFolio }
 │     AUTORIDADE: Book JSON canônico
 │     CONSUMIDOR: PageRenderer (header/footer, k-cover__product, k-cover__sub)
 │     EDIÇÃO HUMANA: somente via editor; meta imutável em runtime
 │
 ├── tokens             { pageWidth:"140mm", pageHeight:"210mm", bleed:"5mm", margins, gaps, fontSize, leading, fonts }
 │     AUTORIDADE: Book JSON canônico; DEFAULT_TOKENS é fallback em normalizeBook
 │     CONSUMIDOR: BookRoot.tokensToStyle (CSS custom properties); export-pdf.mjs lê --page-width
 │     EDIÇÃO HUMANA: via editor (panel "Design Tokens")
 │     ⚠ Duplicado: --page-width: 140mm em src/book/styles/tokens.css:34
 │     ⚠ Duplicado: "140mm" hardcoded em scripts/export-pdf.mjs:320
 │     ⚠ Duplicado: "140mm"/"210mm" em scripts/build-p001-p030.mjs:582
 │
 ├── nodes              SectionNode[] { id, label, kind: front|part|chapter|appendix, pageIds[] }
 │     AUTORIDADE: materializador gera nodes; editor pode editar manualmente
 │     CONSUMIDOR: StructurePanel; nodes[].label é usado para validar PartOrder no materializador
 │
 ├── pages              Page[] (423)
 │   Para cada Page:
 │     id, template, variant?, editorialComposition?,
 │     part?, chapter?, title?, subtitle?, eyebrow?,
 │     futureProductRole? (CORE/GM_CANDIDATE/PLAYER_REFERENCE/UNDECIDED),
 │     coverMode? (art-only | overlay),
 │     fixed? (manual override contra automação),
 │     recipeInstance? (RecipeInstance, somente leitura),
 │     settings: { header, footer, pageNumber, columns:1|2, background:"paper"|"obsidian", pageColor?, fullBleed, breakBefore? },
 │     blocks: Block[],
 │     materialization?: { generatedBy, materializationVersion, scope, sourceStartLine, sourceEndLine, sourceBlockIds[], sourceContentHash, autoGenerated:true, reviewFlags[], editorialFamily?, pageFillRatio?, wordCount?, compositionFamily? }
 │     SPREADS: Spreads[] contém pares left/right + asset compartilhado; não altera paginação física
 │     PERSISTÊNCIA: JSON canônico + localStorage `kallistis.book-builder.project.v2.<id>` + IndexedDB para binary assets + D1/R2 (cloud)
 │     IMPACTO VISUAL: total — toda a UI renderiza a partir de `book.pages`
 │     IMPACTO EDITORIAL: total — todos os campos editoriais vivem aqui
 │     EDIÇÃO MANUAL: sim, integral
 │
 ├── assets?            BookAsset[] (metadata apenas; binários em IndexedDB/R2)
 ├── fonts?             BookFont[] (data-URLs embutidos)
 ├── spreads?           Spread[] { left, right, asset, alt }
 ├── tableStyles?       TableStylePreset[]
 ├── recipes?           BookRecipe[] (templates editoriais reutilizáveis; páginas materializadas são independentes)
 ├── sheetTemplates?    SheetTemplate[]
 ├── sheetInstances?    SheetInstance[]
 └── productionPlan?    BookProductionPlan { version:1, profile, targetBookPages, generatedAt, manifestPath, assignments[], unusedApprovedAssets[], pendingAssets[] }
```

### 7.1 Tipos de bloco

- text, heading (1-5), image, quote, table (V1 ou V2 com `continuationOf` + `continuationHeader` + `continuationIndex`), box (regra/exemplo/ambientacao/mestre/atencao), caption, divider, shape (frame/window/line/fill), toc, lockup, form, sheet, layout (grid ASCII)

### 7.2 Decisões que vivem no modelo

- Geometry (x, y, width, height, rotation) por bloco (frame) e por imagem (objectX/Y, cropWindow, mirror, offsetX/Y, quadrant, spreadSide)
- Crop e máscara de imagem (feather, featherDirection)
- Composição (`fullBleed`, `coverMode`, `position`, `centered`, `frameAspectRatio`)
- Tipografia local por bloco (fontFamily, fontSize, fontWeight, fontStyle, lineHeight, color)
- Proveniência de materialização (sourceBlockId, sourceStartLine/EndLine, sourceRaw, sourceType, sourceFragmentIndex/Count, assetSourceBlockId, wordCount, assetStatus, assetCatalogReference, semanticAnchor, allowedHeadingIds, allowedWindow, semanticAnchorHeadingId, layoutRole, semanticPairId, fullArtOpening, plannerAssignment)

### 7.3 Decisões que **NÃO** vivem no modelo (estão hardcoded fora)

- Trim 140×210 mm + bleed 5 mm: `tokens.css:34-35`, `export-pdf.mjs:320-321`, `build-p001-p030.mjs:582`
- 18 HISTORY_ASSETS literais (heading → filename → alt → reference) embutidos em `materialize-manuscript.mjs:759-1370`
- 90+ regras `SEMANTIC_ASSET_RULES` literais (heading → semanticAnchor, allowedHeadingTexts, allowedWindow, family) em `materialize-manuscript.mjs:71-757`
- 8 ofícios oficiais (Duelista, Atirador, Tecelão, Curador, Evocador, Artífice, Batedor, Guardião) hardcoded nos rules e nos branches de Povo/Ofício
- 9 Povos (Aelvari, Kragor, Draken, Nomos, Livres, Dóreos, Teriantes, Nimari, Vitrálios) hardcoded como entradas de `POVO_OPENING`
- 10+ criaturas do Bestiário (Drakos, Dragão Cristalino, Tartaruga-Fortaleza, Leviatã, Árvore-Mãe, etc.) hardcoded como `BESTIARY_ENTRY`
- Expressão regular `^PARTE VII\b` decide `template = rules_2col` quando entra uma tabela
- Expressão regular `^MARCO\s+` decide fluxo de timeline
- Expressão regular `^PRÓLOGO\b` no `firstPriority`
- Listas literais: `["Dedicatória", "Para registro…", "Expediente", "Apresentação", "Como usar este livro", "Prólogo — A velha e a Fresta"]` para `frontMatterBoundary`
- Listas literais: `["MAP_PAGE", "GEOGRAPHY_OPENING", "POVO_OPENING", "OFICIO_CULTURAL_OPENING", "PEDRALMA_OPENING", "TENSION_OPENING", "TENSION_CONTINUATION", "FINAL_CLOSURE"]` para `independentOpening`
- "Cronologia consolidada por Marcos" hardcoded para `isChronologyContinuation`
- A frase completa `BOOKMAKER CONTRACT — KALLISTIS FICHA DO JOGADOR` para decidir se a ficha está no livro público

**Conclusão:** o modelo é razoavelmente completo para geometria e proveniência. **Políticas editoriais inteiras estão embutidas como literais no materializador, não no Book JSON.** A separação conceitual pedida no briefing **não existe**.

---

## 8. Renderer

### 8.1 Stack
- `BookRoot` injeta tokens como CSS custom properties em `<div class="k-book">`
- `PageRenderer` é o único renderizador de página, usado por editor e `/print`. Forward ref; nada de zoom, nada de overlays.
- 13 templates registrados em `src/book/templates/index.ts`; `PageRenderer` resolve o componente via `TEMPLATES[page.template].component`
- `BlockRenderer` para blocos inline (heading/text/quote/box/divider/caption/shape/lockup/toc/form/sheet/layout)
- `markdown.tsx` renderiza inline: `**bold**`, `*italic*`, `- lista`, `[link](url)`
- `SheetRenderer` para documentos preenchíveis
- `components.css`, `page.css`, `tables.css`, `tokens.css`, `print.css`, `typography.css` (~1 500 linhas) controlam geometria
- Página física: `.k-print-sheet` é a folha **150×220 mm** (trim 140 + 2×bleed 5). Em runtime, `export-pdf.mjs` força `@page { size: <trim>; margin:0 }` para que o PDF saia **140×210**, não 150×220. O `print.css:4` documenta essa diferença.

### 8.2 Folio
- `folioFor(book, index) = index + book.meta.firstFolio`
- `verso = folio % 2 === 0`
- Margens: `marginInner` (verso → esquerda), `marginOuter` (recto → direita) em CSS variables

### 8.3 Status do renderer
- Mesma renderização é usada para editor, /print, export-pdf, e medição pelo materializador. **Isso é uma fortaleza arquitetural**: o materializador mede o output final, não um proxy.

---

## 9. Materializer

`scripts/materialize-manuscript.mjs` — **4 967 linhas, 178 KB**. Escreve um único arquivo por execução. O algoritmo real (corrigido do diagrama hipotético do briefing):

```
materialize-manuscript.mjs
   │
   ▼ parseArgs(argv)                                # --scope, --profile, --pilot, --manuscript, --catalog, --manifest, --baseProject, --output
   │  DEFAULT_MANUSCRIPT = docs/imagens_curadoria/KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md
   │                   (env: KALLISTIS_CATALOG_PATH override)
   │  DEFAULT_CATALOG    = /home/tonyus-dev/Downloads/.../00_CATALOGO_MESTRE_PRODUCAO_KALLISTIS_REV1.md
   │  CANONICAL_PROJECT  = projects/kallistis-manual-do-mundo-reconstrucao.json
   │  APPROVED_COVER_*   = /assets/cover/kallistis-capa-aprovada-final.png + SHA
   │  PORT               = 4185
   │  VERSION            = 7
   │  IMAGE_CADENCE      = { targetInterval: 4, minimumInterval: 3, maximumInterval: 5 }
   │  SOFT_MAX_TEXT_RUN  = 5
   │  HARD_MAX_TEXT_RUN  = 7
   │
   ▼ 1. SHA check (manuscrito + cover)             # se falhar → exit 1, MANUSCRIPT_SOURCE=INCIDENT
   ▼ 2. catalog §28 string check                    # se faltar → exit 1
   ▼ 3. parseMarkdown(markdown, scope)              # AST: heading, paragraph, list, table, divider
   ▼ 4. annotateHeadingPaths                        # headingPath[], sectionH1, sectionH2, sectionH3
   ▼ 5. filterBlocksForProfile                      # PUBLIC_BOOK filtra "BOOKMAKER CONTRACT" (--), BOOKMAKER_CONTRACT mantém
   ▼ 6. scopedBlocks                                # filtra por sectionH1 (PARTES_I_IV, etc.)
   ▼ 7. enrichAcervoAssets (v1.5-acervo)            # adiciona regras a HISTORY_ASSETS dinamicamente
   ▼ 8. applyV2CuratedAssets                        # marca HISTORY_ASSETS já curados
   ▼ 9. planEditorialAssets(plan)                   # tokeniza, overlap, score, famílias
   ▼ 10. registerPlannedAssets                      # vira HISTORY_ASSETS.plannerAssignment = true
   ▼ 11. bindSemanticAssets                         # SEMANTIC_ASSET_RULES (KALLISTIS-literal)
   │       → sourceBlocks (com .asset, .supportAssets, .fullArtPlates)
   │
   ▼ 12. ensureServer (spawn vite dev na porta 4185)
   ▼ 13. launchChromium (Playwright)
   ▼ 14. context (1240×1754, pt-BR, UTC, color-scheme:light)
   ▼ 15. goto /print, waitForSelector('html[data-print-ready]')
   ▼ 16. addStyleTag(.k-print[data-pagination-measurer]{...})  # esconde para medição
   ▼
   ▼ 17. materialize({ sourceBlocks, baseBook, browserPage, scope })
   │      ┌────────────────────────────────────────────────────────────────┐
   │      │ currentPage = newPage(scope, 0, hint)                          │
   │      │ visualDebt = 0, lastImagePage = -100, textRun = 0             │
   │      │ usedAssetShas = new Set()                                     │
   │      │ usedSemanticPairs = new Map()                                 │
   │      │ for each source:                                              │
   │      │   asset = assetForSource(source)                              │
   │      │   if heading H1 / dedication / front-matter / compositionBoundary:
   │      │     finishCurrent()  ← transitionAsset inserted if sparse      │
   │      │   if "O Mapa em Duas Camadas" + MAP_PAGE:                     │
   │      │     MAP_SPREAD — duas páginas full-bleed; spreadSide=left/right│
   │      │   if cadenceReached OR firstPriority OR asset:                │
   │      │     image = generatedImage(source, asset, size, pairCount)    │
   │      │   if heading level ≥ 2:                                       │
   │      │     look-ahead keep-with-next (heading+next+image+next+next)  │
   │      │     if overflow: finishCurrent()                              │
   │      │   addBlock(block)                                             │
   │      │   if image: addBlock(image)                                   │
   │      │   if supportAssets: addBlock(supportImage)                    │
   │      │   if fullArtPlates: finishCurrent(); platePage (full_art)     │
   │      │                                                                 │
   │      │   addBlock(block):                                             │
   │      │     if table & current.part starts "PARTE VII" → 2 col       │
   │      │     measurement = renderAndMeasure(current + [block])          │
   │      │     if !overflow: current.blocks.push(block); return           │
   │      │     split = trySplitText(block) ?? trySplitTable(block)       │
   │      │     if split: push(first), finishCurrent(), addBlock(rest)     │
   │      │     if current.blocks.length: finishCurrent(); addBlock(block)│
   │      │     else: THROW (block não cabe sozinho)                       │
   │      │                                                                 │
   │      │   trySplitText:                                               │
   │      │     pieces = block.content.splitSentences() OR list lines     │
   │      │     binary search (low=1, high=pieces.length-1, best=0)        │
   │      │     candidate = fragmentText(block, pieces[:middle], 0, 2)     │
   │      │     measure; if !overflow: best=middle, low=middle+1          │
   │      │     return [first=pieces[:best], rest=pieces[best:]]          │
   │      │                                                                 │
   │      │   trySplitTable:                                              │
   │      │     bodyRows = block.rows.filter(not header/footer)           │
   │      │     binary search (low=1, high=bodyRows.length)               │
   │      │     candidate = splitTable(block, middle)                      │
   │      │     measure; if !overflow: best=middle                        │
   │      │     return [first=splitTable(block, best, inIdx, fragCnt),    │
   │      │             rest=splitTable(rest, bodyRows-best, nextIdx, ...)]│
   │      │                                                                 │
   │      │   renderAndMeasure(chromium, candidate):                      │
   │      │     candidateBook = { ...baseBook, pages: [...base, candidate]}│
   │      │     browserPage.goto('/print', {waitUntil:'domcontentloaded'})│
   │      │     waitForSelector('html[data-print-ready]')                  │
   │      │     browserPage.evaluate(() => {                              │
   │      │       [...document.querySelectorAll('.k-page')].map(root => {│
   │      │         rect = root.querySelector('.k-page__content').getBoundingClientRect()│
   │      │         blockInfo = [...root.querySelectorAll('[data-block-id]')]│
   │      │           .map(el => ({ id, height, top, bottom, isHeading, isImage }))│
   │      │         overflow = blockOutOfBounds || (fullArtCopy overflow) ||│
   │      │                   (no flow-float && scrollHeight>clientHeight+1)│
   │      │                   || scrollWidth > clientWidth + 1             │
   │      │         fillRatio = used / clientHeight                        │
   │      │         tableRows = [...querySelectorAll('[data-table-row-id]')]│
   │      │         return { overflow, fillRatio, usedHeight, clientHeight,│
   │      │                  clientWidth, scrollWidth, blockInfo, tableRows }│
   │      │       })                                                       │
   │      │     })                                                         │
   │      │                                                                 │
   │      │   # pass 2: trailing-heading repair                            │
   │      │   for i in 0..pages-2:                                        │
   │      │     if pages[i].blocks.last == heading:                        │
   │      │       try moving heading to next page                          │
   │      │       measure both; if no overflow: commit                     │
   │      │                                                                 │
   │      │   # pass 3: merge neighbor text-only pages (sem PART_OPENING,  │
   │      │   #         mesmo template, mesmo columns, sem h1, sem image) │
   │      │   for i in 0..pages-1:                                        │
   │      │     if compatible: merged = pages[i] + pages[i+1]              │
   │      │     measure; if !overflow: splice(merged)                      │
   │      │                                                                 │
   │      │   # pass 4: drop empty pages                                   │
   │      │   pages = pages.filter(p => p.blocks.length > 0)               │
   │      │   # renumber pages: ${scope.toLowerCase()}-page-NNNN           │
   │      └────────────────────────────────────────────────────────────────┘
   │
   ▼ 18. assemble Book
   │   book = { ...baseBook, meta:{...}, productionPlan:{...}, nodes:[...],
   │            pages: isContinuation ? [...base, ...continuation] :
   │                                     [cover, ...toc, ...generated],
   │            spreads: [...preserved, ...generated] }
   │
   ▼ 19. repairOrphanHeadings (delete trailing headings if any slip in)
   ▼ 20. applyPreexistingEditorialCorrections (only if isIntegral)
   ▼ 21. repairMeasuredTailOverflow (re-mede overflows remanescentes e tenta reempacotar)
   ▼ 22. finalMeasurements (re-mede o livro inteiro, /print)
   ▼ 23. validateMaterialization
   │     SOURCE_BLOCK_TEXT_MISMATCHES, SOURCE_WORDS_LOST, SOURCE_WORDS_ADDED,
   │     DUPLICATE_FRAGMENT_OCCURRENCES, FRAGMENT_SEQUENCE_ERRORS,
   │     PAGE_OVERFLOW, BROKEN_TABLE_ROWS, SOURCE_ORDER_CHANGED,
   │     ASSETS_MODIFIED, ORIGINAL_PROJECT_OVERWRITTEN, INVALID_IMAGE_PLACEMENTS
   ▼ 24. stats(book, measurements, sourceBlocks, manuscriptTotalWords)
   │     TOTAL_PAGES, IMAGE_INTERVAL_MEAN/MEDIAN, MAX_CONSECUTIVE_TEXT_PAGES,
   │     PROJECTED_BOOK_PAGES_TEXTUAL/CURRENT/DENSE, COMPOSITION_FAMILY_COUNTS, etc.
   ▼ 25. writeFile(args.output, JSON.stringify(book)) + .report.json
   ▼ 26. exit 0 se verdict==PASS, 1 caso contrário
```

### 9.1 Quem escolhe o quê

| Decisão | Quem decide | Onde |
| --- | --- | --- |
| Template | composição + asset + editorialFamily + sparseCurrent | `compositionForSource` + `addBlock` (regras literais) |
| Variant | `compositionForSource` (IMAGE_TOP/SIDE_ART_LEFT/…); `TEMPLATES[template].variants[0]` como default | `compositionForSource`, `createEmptyPage` |
| Asset | `assetForSource` (cache de `bindSemanticAssets`; planner se nenhum rule casa) | `materialize()` loop, `registerPlannedAssets` |
| Composição editorial | `compositionForSource` retorna `{ template, variant, family }` com base no `asset.family` e em `source.level` | linha 2576-2627 |
| Columns (1 vs 2) | `defaultColumnsForComposition` retorna 2 para `REFERENCE_TABLE` (PARTE VII) e 1 default; `addBlock` força 2 quando tabela em PARTE VII | linha 2657-2663; `addBlock` 3410-3422 |
| Background | `page.settings.background` (paper/obsidian) — decisão humana; Capa tem `coverMode: 'art-only'` por `isCanonicalComposedCover` | `normalizeBook` em `local.ts:230` |
| Full bleed | `page.settings.fullBleed` (humano) ou `art.fullBleed` (auto) ou `coverMode==='art-only'` | `FullArtTemplate`, `CoverTemplate` |

---

## 10. Paginação

### 10.1 Estado real

- `src/book/pagination/adapter.ts` declara três engines: `fixed` (ativo, no-op), `paged` (Paged.js, **lança erro**), `vivliostyle` (lança erro). Comentário explícito: "Nenhuma biblioteca externa é necessária."
- O materializador **não usa** esse adapter. Ele:
  1. Sobe um Vite dev na porta 4185
  2. Abre Chromium real
  3. Navega em `/print`
  4. Avalia cada candidato via `page.evaluate` que faz `getBoundingClientRect()` em `.k-page__content`
  5. Decide `overflow` por `scrollHeight > clientHeight + 1` ou por blocos fora dos limites
  6. Faz binary search para split de texto e tabela
- **Dois motores de "paginação" convivem, sem se tocar**:
  - O do app é FIXO: o JSON já vem paginado (423 páginas), o CSS é trim-aware, o Chromium imprime 1:1.
  - O do materializador é MEDIDO: cada candidato de página é renderizado e medido, e só então commitado.

### 10.2 Algoritmo de fitting (corrigido)

```
fit(candidate) = renderAndMeasure:
   if blockOutOfBounds (qualquer block.top < -1 || block.bottom > clientHeight + 1):
       overflow = true
   elif specialCopy (data-full-art-copy):
       overflow = specialCopy.scrollHeight > clientHeight + 1 ||
                  specialCopy.scrollWidth > clientWidth + 1
   elif template in {cover, part_opening, full_art}:
       overflow = false   # sempre: arte sangra além do trim
   elif hasFlowFloat (.k-figure--left | .k-figure--right):
       overflow = scrollWidth > clientWidth + 1   # só eixo X
   else:
       overflow = scrollHeight > clientHeight + 1 ||
                  scrollWidth > clientWidth + 1

fillRatio = used / clientHeight
  onde used = max(block.bottom)  para blocks que não são image
  EPS (preflight) = 1.5 px
  SAFE_INSET_MM   = 5 mm
```

### 10.3 Split de texto

```
trySplitText(block):
  if block.type != "text": return null
  if sourceType == "list":
    pieces = block.content.split("\n").filter(Boolean)
  else:
    pieces = splitSentences(block.content)        # naive: split(/([.!?…])\s+/u)
  if pieces.length < 2: return null
  low=1; high=pieces.length-1; best=0
  while low <= high:
    middle = floor((low+high)/2)
    content = pieces[:middle].join(" "|"\\n")
    candidate = fragmentText(block, content, 0, 2) # fragment index 0, total 2
    m = measure(current + [candidate])
    if !m.overflow: best=middle; low=middle+1
    else: high=middle-1
  if best == 0: return null
  return [fragmentText(block, pieces[:best], 0, 2),
          fragmentText(block, pieces[best:], 1, 2)]
```

`fragmentText` copia o bloco, marca `materialization.sourceFragmentIndex`, `sourceFragmentCount`, e **preserva `sourceBlockId`**. Proveniência preservada.

### 10.4 Split de tabela

```
trySplitTable(block):
  if block.type != "table": return null
  bodyRows = block.rows.filter(kind != "header" && kind != "footer")
  if bodyRows.length < 2: return null
  low=1; high=bodyRows.length; best=0
  while low <= high:
    middle = floor((low+high)/2)
    candidate = splitTable(block, middle, 0)
    m = measure(current + [candidate])
    if !m.overflow: best=middle; low=middle+1
    else: high=middle-1
  if best==0 || best==bodyRows.length: return null
  inIdx = block.continuationIndex ?? block.materialization.sourceFragmentIndex ?? 0
  nextIdx = inIdx + 1
  fragCnt = max(block.materialization.sourceFragmentCount ?? 1, nextIdx+1)
  return [
    splitTable(block, best, inIdx, fragCnt),
    splitTable({...block, rows: bodyRows[best:]}, bodyRows.length-best, nextIdx, fragCnt)
  ]
```

`splitTable` (em `src/book/tableModel.ts:629`) gera `continuation` com `continuationOf`, `continuationIndex+1`, e clona o header como `continuationHeader` se `repeatHeader`.

### 10.5 Keep rules

- **Heading H1 / dedication / front matter / compositionBoundary / forcedTensionContinuationBreak / forcedChavesBreak / PART_OPENING / timelineBoundary:** se `current.blocks.length`, fecha a página antes do heading.
- **Heading L≥2 com `lookahead` (heading + image + next + next-next):** mede `current + [block] + [image?] + [nextBlock] + [lookahead]`. Se overflow e não for "mayPairEncounterEntries" (L≥3 dentro de "SETENTA E DOIS ENCONTROS…"), fecha a página.
- **Heading H1 dentro de "SETENTA E DOIS ENCONTROS ENTRE HERANÇA E ESCOLHA":** dois entries do encontro podem coabitar (`mayPairEncounterEntries = isEncounterEntry && currentEncounterEntries === 1`).
- **Tabela em `rules_2col`:** o heading é mantido e `trySplitTable` reserva as linhas (`allowTableContinuation`).
- **Part-opening / Part-VII-table:** override local (template = `rules_2col` 2-col, sem fechar a página).
- **Trailing heading repair pass:** se a última página terminar com heading, tenta movê-lo para a próxima e re-medir.
- **Empty compositor pages:** removidas após medição.
- **Orphan headings repair:** função `repairOrphanHeadings` deleta páginas cujas blocks terminem em heading (pós-materialize).

### 10.6 Recomposição (pós-pipeline)

1. `repairMeasuredTailOverflow(book, browserPage, baseBook, sourceById, candidateIndexes)` — re-mede páginas com overflow ou `OFICIO_CULTURAL_OPENING`; tenta reempacotar.
2. `repairOrphanHeadings(book)` — remove trailing headings.
3. `applyPreexistingEditorialCorrections(book)` (somente `isIntegral`) — pequenas correções manuais pré-aprovadas (`editorialCorrectionAdded: true` no metadata).
4. Pass 2 do `materialize()`: heading-trailing swap entre vizinhas.
5. Pass 3 do `materialize()`: merge de páginas vizinhas compatíveis (mesmo `part`, `template`, `settings.columns`, sem image, sem H1, sem `PART_OPENING`).
6. Pass 4 do `materialize()`: filtra `pages.filter(p => p.blocks.length > 0)`.
7. Renumeração final: `${scope.toLowerCase()}-page-NNNN`.

---

## 11. Asset planner

`scripts/editorial-planner.mjs` (213 linhas) é a única coisa reutilizável e portável do materializador. Ele **decide atribuições por heading** (não por página) usando:

- `BLOCKED_STATUSES` = REVIEW_REQUIRED, REJECT, REFERENCE_ONLY, HUMAN_REVIEW, PENDING → nunca usados automaticamente.
- `STOP_WORDS` = 17 stopwords (pt-BR).
- `tokens(value)`: normaliza NFD, lowercase, split non-alphanumeric, filter `length >= 4` e `!STOP_WORDS`.
- `scoreAsset(source, asset, usedHashes, usedFamilies)`:
  - sourceTokens ∩ assetTokens = overlap
  - if overlap.length == 0 → null
  - score = overlap.length * 10
  - if source.level == 1 && family in {PART_HERO, IMAGE_TOP} → +7
  - if source.type == "table" && family == TEXT_FEATURE → +4
  - if usedHashes.has(hash) → -30
  - if usedFamilies.get(family) >= 2 → -8
  - if status == USED → +1
- Ordena por score desc, depois por SHA.
- Filtra `score >= 10`.
- Para cada source heading L≤2: pega o `selected = ranked.find(!usedHashes.has(hash)) ?? ranked[0]`.

O output é `assignments[]` com `sourceBlockId, heading, section, src, sha256, alt, reference, status, family, role, orientation, aspectRatio, cropWindow?, score, matchedTerms, maxRepetitions`. Esses assignments viram `productionPlan.assignments` no Book JSON. O materializador depois **sobrescreve** a decisão do planner com o resultado do `bindSemanticAssets` (regras literais KALLISTIS) — o planner é uma camada, não a fonte.

`isApprovedAsset(asset)`: `status includes APPROVED | USABLE | USED | COVERED_HIGH | USER_REQUESTED_FULL_ART`.

**Observação crítica:** o planner é genérico (não conhece KALLISTIS). Já o `bindSemanticAssets` (no materializador) é 100% KALLISTIS-literal.

---

## 12. Templates / Variants / Composições / Recipes

### 12.1 Template (13)
Definidos em `src/book/templates/index.ts`. Decidem o **esqueleto da página** (qual componente renderiza, se usa caixa de texto, quantas colunas por default, e quais variants são oferecidas). Três "registers": literario, referencia, abertura.

### 12.2 Variant (15)
Definido em `PageVariant` no `types.ts`. Decidem **arranjo dentro do template**. Comentário no tipo: "o editor escolhe, nunca a automação" — mas o materializador escolhe sim, via `compositionForSource` que retorna `{ template, variant, family }` baseado no `asset.family` e em `source.level`.

### 12.3 EditorialComposition (18)
Definido em `EditorialComposition` no `types.ts`. É o **rótulo editorial** (PART_HERO, IMAGE_TOP, MAP_SPREAD, BESTIARY_ENTRY, etc.). Não é renderizado em si; é persistido em `page.editorialComposition` e em `materialization.compositionFamily` para auditoria, e vira data-attribute `k-page--composition-<family>` para o CSS.

### 12.4 Recipe (BookRecipe)
Modelo completo em `types.ts:846-866`. Inclui `structure: RecipeBlockNode[]`, `slots: RecipeSlot[]`, `scope: "page" | "spread"`. **Não está em uso produtivo** no JSON canônico atual (verificado: `kallistis-manual-do_mundo_final_book.json` tem `recipes` opcional; o canônico tem `recipes: []` ou ausente). É a abstração mais sobreposta.

### 12.5 Análise de sobreposição

| Decisão | Template | Variant | Composition | Recipe |
| --- | --- | --- | --- | --- |
| Quero um Mapa em duas páginas | `full_art` | `full-page` | `MAP_SPREAD` | — |
| Quero abrir um Povo | `chapter_opening` ou `full_art` | `image-top`, `image-side`, `quadrant-image` | `POVO_OPENING` | — |
| Quero uma página de tabela longa | `table_page` ou `rules_2col` | `default` | `TEXT_FEATURE` | — |
| Quero abrir uma Parte | `part_opening` | `default` | `PART_HERO` | — |

`EditorialComposition` é efetivamente um **enum que serve de ponte entre o domínio (asset.family do planner) e a UI (data-attribute + métricas)**, sem render próprio. É o que tem mais risco de duplicação com `Template`+`Variant`.

`BookRecipe` é o que tem mais risco de **dead-code** no caminho produtivo. Existe o sistema de `RecipeDialog.tsx` (413 linhas) e `semanticRecipeFromPage` em `authoring.ts`, mas o materializador não consulta `BookRecipe[]`.

---

## 13. Persistência

### 13.1 Camadas

| Camada | Tecnologia | Conteúdo | Onde |
| --- | --- | --- | --- |
| Editor (auto-save) | `localStorage` chave `kallistis.book-builder.project.v2.<id>` | Book JSON sem binários | `src/lib/persistence/local.ts` |
| Editor (auto-save legacy) | `localStorage` chave `kallistis.book-builder.project.v1` | Book JSON (mantida como fallback) | idem |
| Editor (binary assets) | `IndexedDB` chave `localAssetKey(projectId, assetId)` | PNG/JPG binários | `src/lib/assets/local-store.ts` |
| Editor (work file) | File System Access API | "Save in place" opcional | `src/lib/persistence/work-file.ts` |
| Cloud (Worker) | D1 (project metadata) + R2 (snapshot JSON e assets binários) | projeto + revisões | `src/server-api.ts` |
| Cloud (auth) | Cookie `kallistis_owner_session` (HMAC-SHA256) | sessão de 30 dias | `src/server-api.ts:60-149` |
| External source (somente leitura) | `Tonyus-dev/kallistis_producao` @ `main` via GitHub API | assets `assets/...` | `src/server-api.ts:348-369` |
| Source of truth versionado | `book_maker/projects/kallistis-manual-do-mundo-reconstrucao.json` | Book JSON canônico | import default em `src/data/canonical-book.ts` |

### 13.2 Migração

- `bookSnapshot(book)` remove `data` inline de assets com `storage.kind in {local, r2}`. Mantém metadata.
- `migrateLegacyAssets(book, projectId)` extrai `data:image/...` para IndexedDB e seta `storage.kind: "local"`. Idempotente.
- `normalizeBook(input)` é tolerante: completa tokens com `DEFAULT_TOKENS`, normaliza tabelas V1→V2, normaliza recipes, normaliza sheets, marca cover canônico com `coverMode: "art-only"`.
- `loadLocalBook` faz fallback de v1 para v2 só no `projectId === "default"`.

### 13.3 Contrato de autosave

- `saveLocalBook` → remove v1 se for default. Em `QuotaExceededError` no v1 → remove v1 e tenta v2.
- **Limitação:** a quota de `localStorage` (~5 MB) é compartilhada entre chaves. Para 423 páginas, mesmo sem binários, o JSON canônico tem 5,9 MB. **O autosave local para o projeto canônico vai estourar quota em qualquer navegador padrão** — por isso existe a v2 e o `bookSnapshot`. Não é óbvio de imediato mas é o motivo de toda a ginástica de externalização.

---

## 14. Export

`scripts/export-pdf.mjs` (383 linhas):

1. `parseArgs(--in, --out, --url, --timeout, --force, --no-report)`
2. `book = JSON.parse(args.in)` se houver
3. `ensureServer(url, timeout)` — se 404, spawna `npx vite dev --port <port>`
4. `launchChromium` — usa `process.env.CHROMIUM_PATH` se setado, ou procura em `/opt/ms-playwright`
5. `context (1240×1754, pt-BR, UTC, light)`
6. `page.addInitScript({window.__KALLISTIS_BOOK__ = book})`
7. `page.goto(${url}/print)`
8. `waitForSelector("html[data-print-ready='true']")` + `'.k-page'`
9. `emulateMedia({media:"print"})`
10. `await document.fonts.load(...)` para `EB Garamond` 4 weights × 2 styles
11. `page.evaluate(() => window.__KALLISTIS_PREFLIGHT__ ?? null)` — se `errors > 0` e `!force` → aborta.
12. `size = getComputedStyle(.k-book).--page-width + --page-height` → 140mm × 210mm
13. `addStyleTag('@page { size: 140mm 210mm; margin: 0 }')`
14. **Se pages > 50:** chunks de 50, cada chunk faz `goto(/print)`, remove `.k-print-sheet` fora do range, `page.pdf({path, width:"140mm", height:"210mm", scale:1, margin:0, preferCSSPageSize:false})`. `pdfunite` junta. `gs -dPDFSETTINGS=/printer` recompacta. Idempotente (skip silencioso se `gs` ausente).
15. `recompressed = runGhostscriptRecompress(outPath, outPath)` — pula se `/usr/bin/gs` não acessível.

Pipeline **real**: Playwright (Chromium) → print CSS → PDF 1:1 → pdfunite → Ghostscript `/printer`. Sem dependência de headless custom.

**Limitação PDF conhecida** (documentada no README): Ghostscript `/printer` dropa o `ToUnicode` CMap em Type 3 glyphs (decisão documentada), então extração de texto fica parcial em alguns glifos EB Garamond. Trade-off aceito (~90% de redução de tamanho).

---

## 15. Testes

### 15.1 Matriz de testes

| Teste | Executa código real? | Usa fixture? | Usa artefato pré-gerado? | Pode ficar verde estando quebrado? |
| --- | --- | --- | --- | --- |
| `bun scripts/test-table-model.ts` | sim (lógica pura) | não | não | não (puro) |
| `bun scripts/test-authoring.ts` | sim (lógica pura) | não | não | não (puro) |
| `bun scripts/test-sheet.ts` | sim (fórmulas) | não | não | não (puro) |
| `bun scripts/test-image-production.ts` | sim (registry + persistência) | sim (Book inline) | não | não |
| `bun scripts/test-materializer.mjs` | **NÃO** | **SIM** — abre `projects/kallistis-materializado-historia-v5.report.json` | sim | **SIM — esse arquivo NÃO EXISTE no checkout** |
| `bun scripts/test-p001-p030-structure.mjs` | sim (lê JSONs) | sim — exige `/home/tonyus-dev/Downloads/KALLISTIS_HANDOFF_EDITORIAL_P001_P030_v1.md` e `kallistis_pages_001_030.json` | sim | sim — quebra fora da máquina original |
| `playwright test tests/e2e/free-canvas-mvp.spec.ts` | sim (dev server + browser) | não | não | não |
| `playwright test tests/e2e/production-smoke.spec.ts` | sim (dev server + browser + canonical book) | sim (canonical book) | não | não |

### 15.2 Audit de `test:materializer`

Comando:

```bash
$ cd book_maker && bun run test:materializer
$ bun scripts/test-materializer.mjs
ENOENT: no such file or directory, open '.../book_maker/projects/kallistis-materializado-historia-v5.report.json'
error: script "test:materializer" exited with code 1
```

**Achado:** o `test:materializer` **lê um arquivo JSON** que **não está no repositório**. Esse arquivo é o output do `materialize:historia` (script `bun run materialize:historia`), que por sua vez exige o manuscrito congelado v2 **fora do repositório** + catálogo externo **fora do repositório** + cover SHA hardcoded. Em um clone limpo:

1. `test:materializer` falha (arquivo ausente).
2. `materialize:historia` falharia (manuscrito ausente com SHA esperado).
3. `export:pdf` (sem `--in`) abriria o dev server, mas com o `canonicalBook` (que está no repo) renderiza normalmente.

### 15.3 Audit de `test:p001-p030-structure`

Lê de `/home/tonyus-dev/Downloads/...` — totalmente fora do repo. Em um clone limpo: quebra.

### 15.4 Audit do `export:pdf` em clone limpo

Em `/tmp` com cópia do `kallistis-manual-do-mundo-reconstrucao.json`:
- `node scripts/export-pdf.mjs --in <copy> --out <tmp.pdf>` precisa de Playwright Chromium instalado, `pdfunite` (poppler), `/usr/bin/gs` (ghostscript). Sem nenhum dos três, retorna erro explicativo, sem fallback silencioso.

### 15.5 Audit de `bun run test` em clone limpo

```
$ bun run test
table model PASS
authoring PASS
sheet model/formula smoke: ok
image production: ok
```

**PASS**. Quatro testes sintéticos sobre unidades puras. Nenhum deles prova que o motor de construção de livro funciona.

### 15.6 Audit de `bun run typecheck` em clone limpo

```
$ bun run typecheck
$ tsc --noEmit
$ (silêncio = exit 0)
```

**PASS**.

### 15.7 Audit de `bun run build` em clone limpo

```
✓ built in 1.12s
[nitro] ✔ You can preview this build using npx vite preview
[nitro] ✔ You can deploy this build using npx nitro deploy --prebuilt
```

**PASS**. Build do TanStack Start + Nitro + Cloudflare adapter.

### 15.8 Audit de `bun run dev` em clone limpo + `GET /print`

- Servidor Vite inicia em `http://localhost:8080/`
- `GET /` → 200
- `GET /print` → 200, 4 MB de HTML, 423 `.k-page[data-page-id]`, 9 templates distintos detectados (`chapter_opening`, `front_matter`, `full_art`, `map_page`, `narrative`, `part_opening`, `rules_2col`, `table_page`, `timeline_milestone`)
- `cover` e `toc` aparecem como JSON-tipo nas `TEMPLATES` mas não foram renderizados em /print nessa medição (são gerados pelo materializador, não pelo JSON canônico)
- **`quote_layout` e `profile` também não foram usados** — coerente com o relatório MVP que lista ambos como "POSSIBLE_ROUTING_GAP"

**Conclusão sobre testes:** **o materializador não tem teste que prove execução em clone limpo**. O único teste que toca o materializador (`test:materializer`) é um leitor de relatório. O materializador só roda se você tem o manuscrito v2 fora do repo, com o SHA exato.

---

## 16. Portabilidade

### 16.1 Resultados em clone limpo

| Comando | Resultado | Observação |
| --- | --- | --- |
| `bun install --frozen-lockfile` | PASS (447 pacotes em 1s) | — |
| `bun run typecheck` | PASS | — |
| `bun run test` | PASS (4/4 sintéticos) | não toca o materializador |
| `bun run test:materializer` | **FAIL** | ENOENT: `projects/kallistis-materializado-historia-v5.report.json` |
| `bun run build` | PASS | — |
| `bun run dev` + `GET /print` | PASS (423 páginas, 9 templates) | — |
| `bun run materialize:historia` | **NÃO TESTADO** (improvável PASS) | exige manuscrito + catálogo externos |
| `bun run export:pdf` (com `--in <canônico>`) | **NÃO TESTADO NESTE RUN** (precisa Playwright/Chromium) | ver §14 |

### 16.2 Hardcoded paths no código executável (não em artefatos/relatórios)

| Path | Arquivo | Categoria |
| --- | --- | --- |
| `/home/tonyus-dev/Downloads/KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md` (via `DEFAULT_CATALOG`) | `scripts/materialize-manuscript.mjs:32` | HARD_CODED_RUNTIME_DEPENDENCY |
| `/home/tonyus-dev/Downloads/CURADORIA_DE_CONTEUDO/agora_sim_producao/PRODUCAO/00_CATALOGO_MESTRE_PRODUCAO_KALLISTIS_REV1.md` (default) | `scripts/materialize-manuscript.mjs:32` | HARD_CODED_RUNTIME_DEPENDENCY |
| `/home/tonyus-dev/Downloads/KALLISTIS_HANDOFF_EDITORIAL_P001_P030_v1.md` | `scripts/test-p001-p030-structure.mjs:21` | HARD_CODED_RUNTIME_DEPENDENCY |
| `/home/tonyus-dev/Downloads/kallistis_pages_001_030.json` | `scripts/test-p001-p030-structure.mjs:22` | HARD_CODED_RUNTIME_DEPENDENCY |
| `/home/tonyus-dev/Downloads/CURADORIA_DE_CONTEUDO/.../MANUSCRITO_CONGELADO.md` | `scripts/finalize-v1-4-report.mjs:13` | HISTORICAL_ONLY |
| `/home/tonyus-dev/Downloads/KALLISTIS_MANUSCRITO_CONGELADO.md` | `scripts/audit-editorial-mvp.mjs:11`, `scripts/write-reconstruction-reports.mjs:97` | HISTORICAL_ONLY (e SHA diferente) |
| `/home/tonyus-dev/.bun/bin/bun` | `scripts/abrir-kallistis-book-maker.sh:7` | LOCAL_DEFAULT (env-overridable) |
| `/home/tonyus-dev/Portifolio/kallistis-book/...` | `KALLISTIS-Book-Maker.desktop` | LOCAL_DEFAULT |
| `/opt/ms-playwright` | `scripts/export-pdf.mjs:113` | LOCAL_DEFAULT (env-overridable) |
| `/home/tonyus-dev/Portifolio/kallistis-book/...` em `scripts/write-reconstruction-reports.mjs:148` | é `${ROOT}` interpolado, não hardcoded | PORTABLE |

### 16.3 Outras constantes físicas

- Trim `140mm × 210mm`: hardcoded em `src/book/styles/tokens.css:34-35`, `scripts/export-pdf.mjs:320-321`, `scripts/build-p001-p030.mjs:582`, `scripts/test-image-production.ts:46`, `scripts/test-p001-p030-structure.mjs:58-59` (asserções).
- Bleed `5mm`: hardcoded em `src/book/types.ts:894` (`DEFAULT_TOKENS.bleed`) e nos comentários de `pagination/adapter.ts:7` e `print.css:4`.
- Capa `cd8d9a1e…11`: hardcoded em `scripts/materialize-manuscript.mjs:56-57` (SHA-256).
- Manuscrito `5427818b…d83`: hardcoded em `scripts/materialize-manuscript.mjs:53-54` (SHA-256).
- `version = 7` em `materialize-manuscript.mjs:60`. Mas `MaterializationPageMetadata.materializationVersion: number` (sem constraint), e `MaterializationBlockMetadata.materializationVersion: 1` (literal). **CONTRACT_DRIFT: o `version` do motor é 7, mas o tipo do bloco diz `1`**. Ver §17.

---

## 17. Contratos divergentes

### 17.1 Paginação: `src/book/pagination/adapter.ts` vs `scripts/materialize-manuscript.mjs`

- O adapter declara três engines: `fixed` (ativo), `paged` (Paged.js, lança erro), `vivliostyle` (lança erro). É um stub extensível.
- O materializador não usa esse adapter. Ele opera como uma engine `measured` que não está no union. **CONTRACT_DRIFT / DUPLICATED_RESPONSIBILITY**.
- Severidade: P2 (não quebra; é dívida arquitetural).

### 17.2 PageVariant: comentário no tipo vs seleção automática

- `types.ts:38`: "/** Variantes de composição por template (o editor escolhe, nunca a automação). */"
- `materialize-manuscript.mjs` em `compositionForSource` e em `generatedImage` define `variant` automaticamente baseado em `asset.family` e `source.level`.
- **CONTRACT_DRIFT DOCUMENTED**: a documentação do tipo é falsa na presença do materializador. O variant é escolhido pela automação.
- Severidade: P2 (a frase é só comentário; o materializador funciona; o editor pode sobrescrever via `page.fixed = true`).

### 17.3 Materialization version

- `MaterializationPageMetadata.materializationVersion: number` (sem constraint) — `types.ts:628`.
- `MaterializationBlockMetadata.materializationVersion: 1` (literal) — `types.ts:112`.
- `materialize-manuscript.mjs:60`: `const VERSION = 7;`
- Runtime: `splash.materialization.materializationVersion = VERSION` (= 7) no `materialize-manuscript.mjs:3593`. Em outros lugares, é herdado do spread de `baseMaterialization` (que fixa `1`).
- **CONTRACT_DRIFT SEVERE: o motor diz ser versão 7, mas o tipo do bloco diz que é 1, e o JSON canônico tem ambos os valores misturados**. Auditores futuros não vão conseguir confiar em `materializationVersion` para nada.
- Severidade: P1 (afeta auditoria/reconciliação histórica; não quebra renderização).

### 17.4 Scope

- `MaterializationPageMetadata.scope: "HISTORIA" | "MUNDO" | "REGRAS" | "PARTES_I_IV" | "COMPLETO" | "ALL"` — `types.ts:629`.
- `MaterializationBlockMetadata.scope: "HISTORIA" | "MUNDO" | "REGRAS" | "ALL"` — `types.ts:113`. **PARTES_I_IV e COMPLETO não estão no tipo do bloco**.
- `materialize-manuscript.mjs` aceita `--scope HISTORIA | MUNDO | REGRAS | PARTES_I_IV | COMPLETO | ALL` (default `HISTORIA`).
- O `scope` aplicado em `baseMaterialization` é `scope` (qualquer string) — não há typecheck em runtime, mas o consumidor (`validateMaterialization`) só conhece os seis valores acima.
- **CONTRACT_DRIFT**: blocos dentro de `PARTES_I_IV` ou `COMPLETO` ganham scope `"PARTES_I_IV"` ou `"COMPLETO"`, mas o tipo do bloco só aceita quatro valores. Em runtime funciona; em typecheck o tipo mente.
- Severidade: P2 (não quebra).

### 17.5 Trims e bleed

- `DEFAULT_TOKENS.pageWidth: "140mm"`, `pageHeight: "210mm"`, `bleed: "5mm"` — `types.ts:892-894`.
- Comentário: "Edição Definitiva v1.3 — trim 140×210 mm + bleed 5 mm → PDF 150×220 mm."
- `tokens.css:34`: `--page-width: 140mm; --page-height: 210mm;`
- `print.css:4`: ".k-print-sheet é a FOLHA FÍSICA (trim + 2 x bleed = 150 x 220 mm)."
- `export-pdf.mjs:320-321`: `width: size?.width ?? "140mm"`, `height: size?.height ?? "210mm"` — força @page 140×210 para o PDF.
- `export-pdf.mjs:290-307`: lê `--page-width` e `--page-height` do `getComputedStyle`; se ausentes, cai nos defaults 140/210.
- `build-p001-p030.mjs:582-583`: redefine `pageWidth: "140mm"`, `pageHeight: "210mm"` ao gerar projeto novo.
- `test-p001-p030-structure.mjs:58-59`: asserções `140mm` e `210mm` literais.
- `test-image-production.ts:46`: `tokens: { ...DEFAULT_TOKENS, pageWidth: "140mm", pageHeight: "210mm", bleed: "5mm" }`.
- **Não há uma constante única `TRIM` exportada**. Há **6 locais** com `140mm` e 7 com `210mm` no código. **CONTRACT_DRIFT / DUPLICATED_RESPONSIBILITY**.
- Severidade: P2 (a constante é estável; mover para `TRIM`/`BLEED` em `types.ts` é refator de baixo risco).

### 17.6 Outras contradições menores

- `editorialComposition` no JSON canônico às vezes é `TEXT_FLOW` (não-exportado no union de `EditorialComposition`). Exemplo: `kallistis-manual-do-mundo-reconstrucao.json.productionPlan` tem `family: "TEXT_FLOW"`. Em `EditorialComposition`, o union tem 18 valores; `TEXT_FLOW` está lá (linha 73 do types). Mas `part_opening` no JSON canônico é `family: "PART_HERO"`, sim. Ok.
- `editorialFamily` em runtime pode ser `"TITLE_PAGE" | "COPYRIGHT_EXPEDIENTE" | "DEDICATION" | "INTRODUCTION" | "PART_OPENING" | "NARRATIVE"`. Mas `addBlock` no materializador usa `current.editorialFamily === "PART_OPENING"` mesmo quando `current` ainda está vazia. Possível null-safety hole, mas não-bloqueante porque o check só ativa se `current.blocks.length > 0`.
- `part` field é tipado como `string | undefined`, mas é usado em regex como `current.part ?? ""`. Inconsistência defensiva.
- `KALLISTIS_PAGE_REVIEW_QUEUE.tsv` tem `MVP_GOOD` como `status`. Não há tipo nem validador para esse status. Documento histórico, mas pode ser referenciado por gente futura.

---

## 18. Código genérico × KALLISTIS

| Camada | Classificação | Observação |
| --- | --- | --- |
| `src/book/pagination/adapter.ts` | GENERIC_ENGINE | stub genérico, três engines |
| `src/book/renderer/*` (PageRenderer, BookRoot, BlockRenderer) | GENERIC_ENGINE | zero string KALLISTIS (somente a partir de `book.meta.title` em runtime) |
| `src/book/types.ts` (types) | GENERIC_ENGINE | nome KALLISTIS aparece só nos comentários, não nos unions |
| `src/book/styles/*` | GENERIC_ENGINE | zero string KALLISTIS |
| `src/book/templates/*` | GENERIC_ENGINE | zero string KALLISTIS |
| `src/editor/*` | GENERIC_ENGINE | zero string KALLISTIS, exceto `routeTree.gen.ts` (gerado) |
| `src/lib/preflight/*` | GENERIC_ENGINE | EB Garamond / Liberation Sans em `REQUIRED_FONTS` é o **único** vínculo |
| `src/lib/assets/*` | GENERIC_ENGINE | `REQUIRED_FONTS` é o único vínculo |
| `src/server-api.ts` | GENERIC_ENGINE | REPOSITORY = "Tonyus-dev/kallistis_producao" é KALLISTIS_POLICY |
| `src/lib/persistence/*` | GENERIC_ENGINE | storage keys são `kallistis.*` (namespace) |
| `src/components/ui/*` | GENERIC_ENGINE | shadcn puro |
| `scripts/editorial-planner.mjs` | GENERIC_ENGINE | zero string KALLISTIS |
| `scripts/export-pdf.mjs` | GENERIC_ENGINE | zero string KALLISTIS (mas depende do `/print` route que renderiza qualquer Book) |
| `scripts/test-authoring.ts`, `test-table-model.ts`, `test-sheet.ts`, `test-image-production.ts` | GENERIC_ENGINE | — |
| `scripts/test-materializer.mjs` | KALLISTIS_PROJECT_POLICY | hardcoded `kallistis-materializado-historia-v5` |
| `scripts/test-p001-p030-structure.mjs` | KALLISTIS_PROJECT_POLICY | hardcoded `/home/tonyus-dev/Downloads/...` |
| `scripts/build-p001-p030.mjs` | KALLISTIS_PROJECT_POLICY | hardcoded manuscript v1 path |
| `scripts/audit-editorial-mvp.mjs` | KALLISTIS_PROJECT_POLICY | hardcoded manuscript v1 path |
| `scripts/finalize-v1-4-report.mjs` | HISTORICAL_PATCH | — |
| `scripts/generate-review-pages.mjs` | KALLISTIS_PROJECT_POLICY | depende de project paths |
| `scripts/freeze-v15-pages-001-087.mjs` | KALLISTIS_PROJECT_POLICY | — |
| `scripts/build-editorial-asset-manifest.mjs` | KALLISTIS_PROJECT_POLICY | depende de `KALLISTIS_RECONSTRUCAO_ASSETS.tsv` |
| `scripts/create-v1-4-manifest.mjs` | HISTORICAL_PATCH | — |
| `scripts/create-v1-4-contact-sheets.py` | HISTORICAL_PATCH | — |
| `scripts/crop-v1-4-prepress.py` | HISTORICAL_PATCH | — |
| `scripts/prepare-v1-4-prepress.py` | HISTORICAL_PATCH | — |
| `scripts/fix-v1-4-candidate-meta.py` | HISTORICAL_PATCH | — |
| `scripts/write-reconstruction-reports.mjs` | HISTORICAL_PATCH | — |
| `scripts/materialize-manuscript.mjs` | **MIXED** | genérico no pipeline (parseMarkdown, materialize, renderAndMeasure, validateMaterialization), **KALLISTIS-literal** em: SEMANTIC_ASSET_RULES (90+ regras), HISTORY_ASSETS (18), EXTRA_PRIMARY_CONTEXT_HEADINGS, REUSED_FINAL_ART_HEADINGS, REUSABLE_SEMANTIC_ART_HEADINGS, V2_CURATED_PRIMARY_ASSETS, EXTRA_ACERVO_RULES, EXTRA_ACERVO_OVERRIDES, EXTRA_FULL_ART_PLATE_RULES, APPROVED_COVER_*, EXPECTED_MANUSCRIPT_SHA256, DEFAULT_CATALOG, BOOKMAKER_CONTRACT_HEADING, BOOKMAKER_CONTRACT_MARKER, ENCOUNTER_SECTION, roleForPart, slug, lista `["Dedicatória", "Expediente", …]`, regex `^PARTE (V|VI|VII)\b`, regex `^MARCO\s+`, regex `^APÊNDICES\b` |
| `data/canonical-book.ts` | KALLISTIS_PROJECT_POLICY | `import project from "../../projects/kallistis-manual-do-mundo-reconstrucao.json"` |
| `data/demo-book.ts` | GENERIC_ENGINE | texto marcado como `[CONTEÚDO DE DEMONSTRAÇÃO]` |
| `public/editorial-asset-manifest.json` | KALLISTIS_PROJECT_POLICY | 177 assets, 288 pending; `inventory: ".../KALLISTIS_RECONSTRUCAO_ASSETS.tsv"` (path da máquina original) |
| `drive-image-inventory.json` | KALLISTIS_PROJECT_POLICY | 334 hashes, `sourceRoot: /home/tonyus-dev/...` (path absoluto legado) |
| `drive-image-disposition.csv` | KALLISTIS_PROJECT_POLICY | 288 entries; REVIEW_REQUIRED / USED |
| `KALLISTIS_*.{tsv,md,json,png,html}` (raiz) | HISTORICAL_PATCH | relatórios congelados |
| `_review/*` | HISTORICAL_PATCH | previews de auditorias anteriores |
| `contact-sheets/*` | HISTORICAL_PATCH | impressão v1.4 |
| `00_COMECE_AQUI/`, `01_FONTE_UNICA/`, `02_AUDITORIA/`, `03_OUTPUT_ESPERADO/` | KALLISTIS_POLICY | contratos da operação editorial |
| `MANIFESTO_SHA256.txt` | KALLISTIS_POLICY | SHA dos artefatos top-level |
| `migrations/0001_initial.sql` | GENERIC_ENGINE | schema D1 |
| `wrangler.jsonc` | GENERIC_ENGINE | binding D1/R2 |

---

## 19. Legado

- `_review/{completo-v1, completo-v1.3, completo-v1.3-final, historia-v4, historia-v5, partes-i-iv-v1}` + `INDEX.md`: snapshots de QA por fase.
- `contact-sheets/KALLISTIS_v1.4_pages_001-400.jpg`: 16 JPGs de revisão (400 páginas divididas em grupos de 25).
- `KALLISTIS_Manual_do_Mundo_v1.4_400p_CANDIDATO.*` (manifest/report/pdfs): candidato v1.4.
- `KALLISTIS_Manual_do_Mundo_v1.5_400p_CANDIDATO-56_1.png` e `…-57_1.png` (raiz): duas páginas candidatas soltas, órfãs, sem manifesto associado.
- `KALLISTIS_EDITORIAL_MVP_REPORT.md`, `KALLISTIS_EDITORIAL_COVERAGE.md`, `KALLISTIS_RECONSTRUCAO_*`: relatórios congelados.
- `KALLISTIS_EDITORIAL_ASSETS.tsv`: 278 B, stub praticamente vazio (`\t0\n`); não consumido.
- `01_FONTE_UNICA/`, `source/`, `03_OUTPUT_ESPERADO/`, `work/checkpoints/`: DOCX espelhados; manuais congelados.
- `02_AUDITORIA/AUDITORIA_PRE_EDICAO_KALLISTIS_CLAUDE_PRO_v1.0.md`: 5 KB, auditoria pré-edição.
- `book_maker/KALLISTIS-Book-Maker.desktop`: atalho Linux hardcoded para `/home/tonyus-dev/...`.
- `book_maker/scripts/abrir-kallistis-book-maker.sh`: launcher shell hardcoded.
- `KALLISTIS_PAGE_REVIEW_QUEUE.tsv`: queue de revisão página-a-página (97 KB).
- `KALLISTIS_SKILL_ESCRITA_AUTORAL/`: skill separado de escrita.

---

## 20. P0

(impedem construir, abrir, salvar, renderizar, exportar, preservar fonte, confiar no resultado)

**Nenhum P0 confirmado na auditoria atual**, sob as seguintes condições:

1. O usuário tem o manuscrito congelado v2 disponível no path esperado com o SHA esperado.
2. O usuário tem Playwright/Chromium e (opcionalmente) pdfunite/gs instalados.
3. O usuário entende que o `test:materializer` é um leitor de relatório pré-gerado e não uma prova de execução.

Justificativa: build, typecheck, unit tests sintáticos, dev server, e `/print` (com o projeto canônico) **PASS** em clone limpo. O materializador em si é um binário de 4 967 linhas que não tem teste de execução em clone limpo — **isso é P0 conceitual** (vide §16.1), mas não impede a renderização do livro canônico que já está materializado.

**P0 potencial não confirmado em clone limpo, mas admissível em produção:** se o materializador for executado em ambiente sem Playwright Chromium, aborta. **Não testei materializador em clone limpo** (faltam manuscrito + catálogo externos + cover hardcoded SHA). Esta é a única porta de risco real.

---

## 21. P1

(pode produzir livro errado, paginação errada, asset errado, estado não-reproduzível, falsa validação)

1. **CONTRACT_DRIFT em `materializationVersion`**: `version = 7` no motor, `1` no tipo do bloco, mistura de valores no JSON canônico. Impossível confiar no campo para auditoria. (17.3)
2. **`SOURCE_OF_TRUTH_AMBIGUOUS` para a fonte textual**: SHA-256 hardcoded do manuscrito v2, mas o SHA no `KALLISTIS_EDITORIAL_MVP_REPORT.md` é **diferente** (`da7bdf…ca` vs `5427818b…d83`). Dois manuscritos diferentes circulam com o mesmo nome. (4.1)
3. **`test:materializer` é um leitor de relatório**: pode ficar verde se alguém substituir o JSON lido por um hand-crafted. (15.2, 15.5)
4. **`page.variant` é escolhido pela automação apesar do comentário dizer o contrário**: política documentada e código divergem. (17.2)
5. **`MaterializationBlockMetadata.scope` não inclui `PARTES_I_IV` e `COMPLETO`**, embora o motor emita esses valores. (17.4)
6. **Dois motores de paginação convivem sem se tocar**: `pagination/adapter.ts` (stub) e `materialize-manuscript.mjs` (engine `measured` ad-hoc). (10.1)
7. **Política de capas hardcoded por SHA-256** (`APPROVED_COVER_SHA256`). Se a imagem for trocada intencionalmente, o materializador aborta. (16.3)

---

## 22. P2

(dívida arquitetural que não quebra o fluxo atual)

1. **Trim/bleed duplicado em 6+ locais** sem constante única. (17.5)
2. **`EditorialComposition` vs `Template`+`Variant`**: três abstrações que poderiam ser duas. `EditorialComposition` virou só rótulo/data-attribute. (12.5)
3. **`BookRecipe[]` é dead code no caminho produtivo** atual. (12.4)
4. **`kallistis-production-plan.json` (formato externo, 4.6 KB)** não consumido; coexiste com `Book.productionPlan`. (4.1)
5. **`canonical-book.ts` tem acoplamento forte a `kallistis-manual-do-mundo-reconstrucao.json`**: trocar o projeto canônico exige editar caminho. (13.3)
6. **`_review/`, `contact-sheets/`, `KALLISTIS_*` na raiz** = ~50 MB de relatórios congelados sem uso futuro óbvio. (19)
7. **`drive-image-inventory.json` e `drive-image-disposition.csv`** continuam com paths absolutos da máquina original mesmo no repo. (16.2)
8. **Nomes de arquivos longos tipo `KALLISTIS_Manual_do_Mundo_v1.5_400p_CANDIDATO-56_1.png`** órfãos na raiz.
9. **SHA-256 esperado do manuscrito v2** hardcoded em 1 local só; sem fallback se SHA mudar.
10. **`scripts/build-p001-p030.mjs`, `audit-editorial-mvp.mjs`, `finalize-v1-4-report.mjs`** são scripts históricos que usam paths `/home/tonyus-dev/...`; não quebram o app, mas dão ruído na auditoria.

---

## 23. P3

(limpeza, documentação, ergonomia)

1. Consolidação de constantes de trim/bleed em `types.ts` (`TRIM_MM = { width: 140, height: 210 }`, `BLEED_MM = 5`).
2. Remoção de `book_maker/KALLISTIS-Book-Maker.desktop` e `abrir-kallistis-book-maker.sh` (decisão de empacotamento, não de auditoria).
3. Documentar a separação **"Book Maker = UI + persistência + preflight + export"** vs **"Materializer = motor de medição real"** no README.
4. `routes/README.md` (70 linhas) já existe, mas o root do `book_maker/` não menciona o materializador.
5. `_review/` poderia ser `.gitignore`ado após mover para fora, ou comprimido.
6. `KALLISTIS_EDITORIAL_ASSETS.tsv` (stub 278 B) pode ser removido.

---

## 24. O que NÃO deve ser mexido

- **O fluxo de medição no DOM real**: `renderAndMeasure` no materializador e o `measureIssues` no preflight. Esse é o **ativo de maior valor** deste repositório: ele mede a página que vai para o PDF, não um proxy. Mexer nele sem motivo real é o caminho mais rápido para introduzir P0.
- **A página `/print`**: ela é o único renderizador usado por editor, preflight, export-pdf, e materializer. Mantê-la como single source of rendering truth é o que permite que o materializador meça o que será impresso.
- **A separação entre `Book` (modelo) e `PageRenderer` (renderer)**: o modelo é serializável, versionável e determinístico. O renderer é React+CSS. Misturar os dois quebraria o invariante mais importante: o JSON canônico deve poder ser renderizado por qualquer host que entenda os tokens.
- **O `expectedManuscriptSha256` como gate**: é a única trava que impede materializar um manuscrito errado. A auditoria confirma que **um único valor é melhor que zero**, mesmo que ele esteja fora do repo. Migrar para um SHA dentro do repo exigiria colocar o manuscrito no repo (decisão editorial, não técnica).
- **A lista de `BLOCKED_STATUSES` no planner**: impede que imagens não-aprovadas entrem automaticamente. É o que protege a curadoria humana.

---

## 25. Próxima ação mínima

Se a próxima missão for **"limpar"**, o menor conjunto de mudanças seguras é:

1. **Consolidar `140mm`/`210mm`/`5mm`** em uma constante `TRIM`/`BLEED` em `src/book/types.ts` e importar nos 6 locais. Verificar que `normalizeBook` continua tolerante.
2. **Dropar ou tornar tolerante o teste `test:materializer`**: ou (a) gerar o relatório dentro do próprio script, ou (b) marcar como `bun run test:materializer` somente após `bun run materialize:historia`, ou (c) deletá-lo.
3. **Dropar `scripts/test-p001-p030-structure.mjs`** se ninguém o executa mais; ele é totalmente fora do repo.
4. **Adicionar `kallistis-production-plan.json` em `.gitignore`** (formato morto) ou marcá-lo como `HISTORICAL_ONLY` no README.
5. **Mover `MANIFESTO_SHA256.txt` para incluir o SHA do manuscrito v2** explicitamente, com link para a versão esperada.

Nenhuma dessas ações toca o motor de medição, o renderer, o modelo, nem o materializador. **É a menor correção que torna os contratos verdadeiros** sem mudar comportamento.
