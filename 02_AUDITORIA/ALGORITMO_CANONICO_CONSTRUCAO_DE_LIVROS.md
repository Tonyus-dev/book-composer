# ALGORITMO CANÔNICO DE CONSTRUÇÃO DE LIVROS

> Extraído do caso KALLISTIS, com generalização para qualquer livro ilustrado de fluxo contínuo.
> Não descreve KALLISTIS. Descreve o motor geral escondido dentro da implementação KALLISTIS.
> Cada fase marca `GENERIC RULE | EDITORIAL POLICY | PROJECT OVERRIDE | HUMAN DECISION`.

---

## 0. Resumo

Construir um livro paginado determinístico a partir de uma fonte estruturada e um conjunto de assets editoriais é um pipeline de 19 fases. O resultado é um **Book JSON** que (a) preserva a fonte sem perda, (b) é renderizado em CSS sem re-flow, e (c) pode ser editado por humanos sem invalidar o pipeline.

A grande invenção do caso concreto que originou este algoritmo é: **medir o fitting no renderer real, não em simulação**. O resto é composição determinística com invariantes explícitas.

---

## 1. Modelo conceitual

### 1.1 Objetos primários

```text
Source          unidade imutável da fonte (heading, paragraph, list, table, divider, etc.)
Composition     papel editorial sugerido para uma sequência de sources
CandidatePage   página em construção (template + variant + composition + settings + blocks)
Measurement     { overflow: bool, fillRatio: float, usedHeight: float, tableRows: [...] }
Page            unidade imutável do livro final
Block           unidade interna da Page (heading, text, image, table, quote, box, ...)
Asset           imagem aprovada, com sha256, orientation, role, status
Spread          par left/right de páginas que compartilham uma arte horizontal
Book            schemaVersion + meta + tokens + nodes + pages + assets + spreads + productionPlan
Manifest        catálogo externo de assets aprovados
ProductionPlan  lista de assignments source→asset com proveniência
QAReport        diagnóstico estrutural + editorial
```

### 1.2 Token físico

```text
TRIM    = { width: 140, height: 210 }   // mm, do livro impresso
BLEED   = 5                             // mm, sangria
PAGE    = { w: TRIM.width + 2*BLEED, h: TRIM.height + 2*BLEED }   // folha física
```

### 1.3 Estados editoriais

```text
DRAFT         página com `fixed: false`, ainda passível de automação
FIXED         página com `fixed: true`, imune à automação (sobrescreve template/variant/composition)
PROVENANCE    metadata.materialization presente se a página foi gerada por materialização
```

---

## 2. Pipeline (19 fases)

```text
A. INGESTÃO
B. FINGERPRINT DA FONTE
C. PARSE SEMÂNTICO
D. ÁRVORE DOCUMENTAL
E. CLASSIFICAÇÃO EDITORIAL
F. PLANEJAMENTO VISUAL
G. ESCOLHA DA COMPOSIÇÃO
H. CONSTRUÇÃO DA PÁGINA CANDIDATA
I. MEDIÇÃO NO RENDERER REAL
J. FIT / SPLIT / REFLOW
K. REGRAS DE CONTINUIDADE
L. TABELAS
M. IMAGENS E SPREADS
N. REPARO GLOBAL
O. VALIDAÇÃO DE INTEGRIDADE
P. BOOK JSON
Q. EDIÇÃO HUMANA
R. PREFLIGHT
S. PDF
```

---

### Fase A. INGESTÃO

**INPUT**  : `manuscriptPath : Path`
**OUTPUT** : `raw : string` (utf-8)
**INVARIANTS** :
- O arquivo é lido byte-equivalente; quebras de linha são normalizadas só em `stripMarkdown`.
- Nenhuma decodificação destrutiva é aplicada ao texto bruto (proveniência precisa do byte).
**FAILURE CONDITIONS** :
- Arquivo ausente → `MANUSCRIPT_SOURCE_MISSING`.
- Encoding inválido → `MANUSCRIPT_SOURCE_INVALID_ENCODING`.
**GENERIC OR PROJECT-SPECIFIC** : `GENERIC RULE`.

Pseudocódigo:

```text
raw = readFile(manuscriptPath, "utf8")
```

---

### Fase B. FINGERPRINT DA FONTE

**INPUT**  : `raw : string`, `expectedSha256? : string`
**OUTPUT** : `sourceSha256 : string`, `accepted : bool`
**INVARIANTS** :
- Se `expectedSha256` foi declarado, o SHA-256 calculado deve ser igual; caso contrário abortar.
- Nenhum pipeline pode materializar um manuscrito cujo SHA diverge do declarado, exceto em modo `--allow-sha-mismatch` (que deve produzir `INCIDENTE`, não `PASS`).
**FAILURE CONDITIONS** :
- `SHA_MISMATCH` → aborta o pipeline.
**GENERIC OR PROJECT-SPECIFIC** : `GENERIC RULE` (a trava é genérica); o `expectedSha256` específico é `PROJECT OVERRIDE` (KALLISTIS: `5427818b…d83`).

Pseudocódigo:

```text
sourceSha256 = sha256(raw)
if expectedSha256 && sourceSha256 != expectedSha256:
    abort("MANUSCRIPT_SOURCE=INCIDENT", sourceSha256, expectedSha256)
```

---

### Fase C. PARSE SEMÂNTICO

**INPUT**  : `raw : string`, `scope : enum { HISTORIA, MUNDO, REGRAS, ALL, ... }`
**OUTPUT** : `sourceBlocks : SourceBlock[]`
**INVARIANTS** :
- Cada `SourceBlock` carrega: `id, type, raw, sourceStartLine, sourceEndLine, wordCount`.
- Tipos reconhecidos: `heading (1-5), paragraph, list, table, divider, quote`.
- Linhas originais são preservadas em `sourceStartLine`/`sourceEndLine` para round-trip.
- Tabelas em Markdown viram `SourceTableBlock` com `tableLines: string[]` (texto bruto) e `caption?: string`.
- Listas viram `SourceListBlock` com `items: string[]` (preservar bullet).
- Quotes viram `SourceQuoteBlock` com `text, attribution?`.
**FAILURE CONDITIONS** :
- Markdown malformado → parágrafo é mantido como `raw`; parser **não** levanta exceção (best-effort).
**GENERIC OR PROJECT-SPECIFIC** : `GENERIC RULE` (parser genérico) + `EDITORIAL POLICY` (lista de "linhas em branco entre seções" etc.).

Pseudocódigo:

```text
lines = raw.split(/\r?\n/)
sourceBlocks = []
in_table = false
current = null

for line, index in enumerate(lines):
    if isTableSeparator(line) and !in_table:
        # new table starts
    if headingMatch(line):
        commit(current); current = SourceHeadingBlock(level, text, line)
    elif in_table:
        ...
    elif isListLine(line):
        current = appendToList(current, line)
    else:
        current = appendToParagraph(current, line)
```

---

### Fase D. ÁRVORE DOCUMENTAL

**INPUT**  : `sourceBlocks : SourceBlock[]`
**OUTPUT** : `tree : DocumentTree` com `nodes: TreeNode[]`
**INVARIANTS** :
- `TreeNode { id, label, kind: front|part|chapter|appendix, childIds: string[], sourceBlockIds: string[] }`.
- `headingPath: HeadingNode[]` é calculado para cada bloco (caminho da raiz até ele).
- `sectionH1, sectionH2, sectionH3` são strings que descrevem o contexto.
- O caminho de heading é usado por `compositionForSource`, `assetForSource`, `validateMaterialization`, e por todos os keep rules.
**FAILURE CONDITIONS** : nenhum.
**GENERIC OR PROJECT-SPECIFIC** : `GENERIC RULE` (a estrutura é genérica) + `EDITORIAL POLICY` (a regra de "Parte I/II/.../VII" depende do livro).

Pseudocódigo:

```text
for block in sourceBlocks:
    if block.type == "heading":
        if block.level == 1: stack = [block]; sectionH1 = block.text
        elif block.level == 2: sectionH2 = block.text
        elif block.level == 3: sectionH3 = block.text
    block.headingPath = clone(stack)
    block.sectionH1 = sectionH1
    block.sectionH2 = sectionH2
    block.sectionH3 = sectionH3
```

---

### Fase E. CLASSIFICAÇÃO EDITORIAL

**INPUT**  : `sourceBlocks : SourceBlock[]`, `profile : "PUBLIC_BOOK" | "BOOKMAKER_CONTRACT" | "INTERNAL_PRODUCTION"`
**OUTPUT** : `scopedBlocks : SourceBlock[]`, `profile : Profile`
**INVARIANTS** :
- Filtro por `profile` (ex.: `PUBLIC_BOOK` remove blocos com `BOOKMAKER_CONTRACT`).
- Filtro por `scope` (ex.: `PARTES_I_IV` só passa blocos cujo `sectionH1` casa regex `^(PARTE II|PARTE III|PARTE IV)\b`).
- Blocos filtrados não são perdidos: continuam disponíveis em `allSourceBlocks` para auditoria.
**FAILURE CONDITIONS** :
- `profile` desconhecido → erro.
- `scope` desconhecido → erro.
**GENERIC OR PROJECT-SPECIFIC** : `EDITORIAL POLICY`.

---

### Fase F. PLANEJAMENTO VISUAL

**INPUT**  : `scopedBlocks : SourceBlock[]`, `manifest : Manifest`, `options : { reservedSrcs? }`
**OUTPUT** : `plan : EditorialPlan { assignments[], unusedApprovedAssets[], pendingAssets[] }`
**INVARIANTS** :
- Cada `assignment` mapeia **um heading** (L≤2) a **um asset**.
- Apenas assets com status aprovado (`APPROVED` / `USABLE` / `USED` / `COVERED_HIGH` / `USER_REQUESTED_FULL_ART`) são candidatos.
- Status bloqueados (`REVIEW_REQUIRED`, `REJECT`, `REFERENCE_ONLY`, `HUMAN_REVIEW`, `PENDING`) **nunca** entram automaticamente.
- Pontuação: `overlap * 10`, com bônus para `level==1 && family∈{PART_HERO, IMAGE_TOP}`, `type==table && family==TEXT_FEATURE`. Penalidades para reuso de hash (-30) e para overuse de família (-8).
- Threshold mínimo de score: 10.
- Respeita `maxRepetitions` do asset.
**FAILURE CONDITIONS** : nenhuma (silenciosamente deixa `assignments=[]`).
**GENERIC OR PROJECT-SPECIFIC** : `GENERIC RULE` (o algoritmo é genérico).

Pseudocódigo:

```text
eligible = manifest.assets
  .filter(isApprovedAsset)
  .filter(asset => !reservedSrcs.has(asset.src))
for source in scopedBlocks:
  if source.type != "heading" || source.level > 2: continue
  ranked = eligible
    .map(asset => (asset, scoreAsset(source, asset, usedHashes, usedFamilies)))
    .filter(match => match && match.score >= 10)
    .sort(byScoreDesc)
  selected = ranked.find(!usedHashes.has(hash)) ?? ranked[0]
  if !selected: continue
  assignments.push({sourceBlockId: source.id, ...})
  usedHashes.add(selected.match.hash)
  usedFamilies.incr(selected.match.family)
```

---

### Fase G. ESCOLHA DA COMPOSIÇÃO

**INPUT**  : `source : SourceBlock`, `asset : Asset | null`, `ordinal : int`, `policy : CompositionPolicy`
**OUTPUT** : `Composition { template: TemplateId, variant: PageVariant, family: EditorialComposition, columns: 1|2 }`
**INVARIANTS** :
- `compositionForSource` é a única função que mapeia `source + asset + ordinal → composition`.
- O retorno **é consultivo**, não definitivo: a página real pode absorver mudanças vindas do sparse-current, keep-with-next, ou regras de abertura.
- Composições independentes (MAP_SPREAD, PART_HERO full-bleed, BESTIARY_ENTRY) recebem `template: "full_art"` com `variant` específico.
- Se não há classificação explícita, retorna `TEXT_FLOW` (`template: "narrative"`, `variant: "default"`).
**FAILURE CONDITIONS** : nenhuma.
**GENERIC OR PROJECT-SPECIFIC** : `EDITORIAL POLICY` (a função é genérica, mas as regras literais "MAP_PAGE → map_page", "ofícios uppercase", "PARTE VII table → rules_2col 2-col" são `PROJECT OVERRIDE`).

Pseudocódigo:

```text
function compositionForSource(source, asset, ordinal):
  family = asset?.family ?? null
  if source.level == 1 and family in {PART_HERO, IMAGE_TOP}:
    return { template: "part_opening" | "chapter_opening", variant: "image-top", family: family, columns: 1 }
  if family == "MAP_SPREAD":
    return { template: "full_art", variant: "full-page", family, columns: 1 }
  if family in {POVO_OPENING, BESTIARY_ENTRY, OFICIO_CULTURAL_OPENING}:
    return { template: "chapter_opening", variant: "image-top"|"image-side"|"quadrant-image", family, columns: 1 }
  if family in {MAP_PAGE}:
    return { template: "map_page", variant: "default", family, columns: 1 }
  if source.type == "table":
    return { template: "table_page" | "rules_2col", variant: "default", family: "TEXT_FEATURE", columns: 2 }
  return { template: "narrative", variant: "default", family: "TEXT_FLOW", columns: 1 }
```

---

### Fase H. CONSTRUÇÃO DA PÁGINA CANDIDATA

**INPUT**  : `scope, ordinal, hint : SourceBlock | null`
**OUTPUT** : `currentPage : Page`
**INVARIANTS** :
- `currentPage = newPage(scope, ordinal, hint)` produz uma página vazia.
- A composição é atribuída **só quando entra o primeiro bloco** (com `absorbSparseAssetOpening`) ou quando o loop detecta uma `compositionBoundary` (H1, dedicação, front matter, etc.).
- `currentPage.part = hint?.sectionH1 ?? hint?.headingPath[0]?.text` (propagação de contexto).
- `currentPage.chapter = hint?.sectionH2 ?? hint?.sectionH3`.
**FAILURE CONDITIONS** : nenhuma.
**GENERIC OR PROJECT-SPECIFIC** : `GENERIC RULE`.

---

### Fase I. MEDIÇÃO NO RENDERER REAL

**INPUT**  : `book : Book`, `candidate : Page`, `browserPage : BrowserPage`
**OUTPUT** : `Measurement { overflow, fillRatio, usedHeight, clientHeight, clientWidth, scrollWidth, blockInfo, tableRows }`
**INVARIANTS** :
- O `browserPage` está em `/print` com o snapshot `__KALLISTIS_BOOK__` carregado.
- A medição usa `getBoundingClientRect()` no DOM real, não simulação.
- Critério de overflow (versão conservadora para livros de fluxo contínuo):
  - `blockOutOfBounds` = `block.top < -1 || block.bottom > clientHeight + 1` para qualquer bloco não-imagem
  - Para `template ∈ {cover, part_opening, full_art}`: arte pode sangrar; sem checagem de scroll
  - Para `hasFlowFloat` (`.k-figure--left` ou `.k-figure--right`): só checa eixo X
  - Caso contrário: `scrollHeight > clientHeight + 1 || scrollWidth > clientWidth + 1`
- `fillRatio = used / clientHeight`, onde `used = max(block.bottom)` para blocos não-imagem.
- `tableRows` é extraído de `[data-table-row-id]`; cada `tableRow.top` é considerado quebrado se `top < -1 || bottom > clientHeight + 1`.
- Tolerância: 1 px (subpixel noise). Para preflight, 1.5 px (`EPS`).
**FAILURE CONDITIONS** :
- `waitForSelector("html[data-print-ready='true']")` timeout → `MEASUREMENT_RENDER_TIMEOUT`.
- Fontes editoriais (EB Garamond, Liberation Sans) não carregadas → falso positivo; preflight captura.
**GENERIC OR PROJECT-SPECIFIC** : `GENERIC RULE`.

Pseudocódigo:

```text
async function renderAndMeasure(browserPage, book):
    await browserPage.goto('/print', {waitUntil:'domcontentloaded'})
    await browserPage.waitForSelector("html[data-print-ready='true']")
    return await browserPage.evaluate(() => {
        return [...document.querySelectorAll('.k-page')].map(root => {
            content = root.querySelector('.k-page__content') ?? root
            rect = content.getBoundingClientRect()
            specialCopy = root.querySelector("[data-full-art-copy='true']")
            hasFlowFloat = !!root.querySelector('.k-figure--left, .k-figure--right')
            blockInfo = [...content.querySelectorAll('[data-block-id]')].map(el => {
                r = el.getBoundingClientRect()
                return { id: el.dataset.blockId, height: r.height,
                         top: r.top - rect.top, bottom: r.bottom - rect.top,
                         isHeading: !!el.querySelector('.k-h1, .k-h2, .k-h3, .k-h4, .k-h5'),
                         isImage: !!el.querySelector('img, .k-image-placeholder') }
            })
            blockOutOfBounds = blockInfo.some(b => !b.isImage && (b.top < -1 || b.bottom > rect.height + 1))
            used = blockInfo.reduce((m, b) => b.isImage ? m : Math.max(m, b.bottom), 0)
            tableRows = [...content.querySelectorAll('[data-table-row-id]')].map(row => {
                r = row.getBoundingClientRect()
                return { top: r.top - rect.top, bottom: r.bottom - rect.top }
            })
            return {
                overflow:
                    blockOutOfBounds ||
                    (specialCopy ? (specialCopy.scrollHeight > specialCopy.clientHeight + 1 ||
                                    specialCopy.scrollWidth  > specialCopy.clientWidth  + 1) : false) ||
                    (!['cover', 'part_opening', 'full_art'].includes(root.dataset.template ?? '') &&
                     !hasFlowFloat &&
                     (content.scrollHeight > content.clientHeight + 1 ||
                      content.scrollWidth  > content.clientWidth  + 1)),
                fillRatio: content.clientHeight ? used / content.clientHeight : 0,
                usedHeight: used,
                clientHeight: content.clientHeight,
                clientWidth:  content.clientWidth,
                scrollWidth:  content.scrollWidth,
                blockInfo,
                tableRows
            }
        })
    })
```

---

### Fase J. FIT / SPLIT / REFLOW

**INPUT**  : `currentPage, block, browserPage, baseBook`
**OUTPUT** : `currentPage' (com block inserido) | (block.fragmentFirst, currentPage.commit, newPage, block.fragmentTail)`
**INVARIANTS** :
- Sempre tenta `addBlock(block)` simples primeiro. Só faz split se overflow.
- Split tem duas modalidades: `trySplitText` e `trySplitTable` (Fase L).
- Split usa **busca binária** sobre o número de peças (sentenças ou linhas de tabela) — `O(log n)` medições, não `O(n)`.
- Se a página atual já tem blocos e o bloco não cabe mesmo sozinho, fecha a página primeiro e tenta de novo.
- Se o bloco não cabe **sozinho** em uma página vazia, é `LAYOUT_INCIDENT` (abort).
**FAILURE CONDITIONS** :
- `LAYOUT_INCIDENT`: bloco indivisível maior que uma página. O pipeline aborta com `pageFillRatio` final e `blockInfo` para diagnóstico.
**GENERIC OR PROJECT-SPECIFIC** : `GENERIC RULE`.

Pseudocódigo:

```text
async function addBlock(block):
    if PARTE_VII_table && !currentPage.hasImage:
        currentPage = overrideRules2Col(currentPage)
    m = await renderAndMeasure(currentPage + [block])
    if !m.overflow:
        currentPage.blocks.push(block)
        return
    split = await trySplitText(block) ?? await trySplitTable(block)
    if split:
        currentPage.blocks.push(split[0])
        await finishCurrent()
        await addBlock(split[1])
        return
    if currentPage.blocks.length:
        await finishCurrent()
        await addBlock(block)
        return
    throw LAYOUT_INCIDENT(block, m)

async function trySplitText(block):
    if block.type != "text": return null
    pieces = (block.sourceType == "list") ? block.content.split("\n").filter(Boolean)
                                        : splitSentences(block.content)
    if pieces.length < 2: return null
    return binarySearchSplit(pieces, fragmentTextForText)

async function trySplitTable(block):
    if block.type != "table": return null
    bodyRows = block.rows.filter(r => r.kind != "header" && r.kind != "footer")
    if bodyRows.length < 2: return null
    return binarySearchSplit(bodyRows, fragmentTextForTable)

function binarySearchSplit(pieces, fragmenter):
    low=1; high=pieces.length-1; best=0
    while low <= high:
        middle = floor((low+high)/2)
        m = measure(currentPage + [fragmenter(pieces[:middle], 0, 2)])
        if !m.overflow: best=middle; low=middle+1
        else: high=middle-1
    if best == 0: return null
    return [fragmenter(pieces[:best], 0, 2),
            fragmenter(pieces[best:], 1, 2)]
```

---

### Fase K. REGRAS DE CONTINUIDADE (KEEP RULES)

**INPUT**  : `currentPage, source (heading), nextSource, image?, lookahead?`
**OUTPUT** : decisão `finishCurrent?`
**INVARIANTS** :
- Heading de abertura (H1) sempre força quebra antes se a página atual tem blocos.
- Heading H1 de "front matter" (lista literal) sempre força quebra antes.
- Heading H1 de Parte (kind: part) sempre força quebra.
- Heading de timeline (`/^MARCO\s+/`) força quebra, exceto se a página atual é só o título "A história em Marcos" (deixa a página monolítica).
- Heading H2 com lookahead: mede `current + [heading] + [image?] + [nextSource] + [lookahead?]`. Se overflow, fecha a página.
- Heading órfão no fim: mede mover heading para a próxima página; se ambos não tiverem overflow, swap.
- Tabela após heading em `rules_2col`: permite continuação na próxima coluna (não força quebra).
- Encontro L≥3 dentro de seção "SETENTA E DOIS ENCONTROS…": dois entries do encontro podem coabitar.
- Se a página atual é "sparse narrative" (≤ 100 palavras, sem image/tabela) e o próximo heading tem asset **não independente** (`POVO_OPENING | OFICIO_CULTURAL_OPENING | …`?), a composição do heading **absorve** a página sparse em vez de quebrar.
- `current.fixed == true` desabilita todas as keep rules (decisão humana).
**FAILURE CONDITIONS** : nenhuma (sempre há uma decisão).
**GENERIC OR PROJECT-SPECIFIC** :
- `GENERIC RULE`: a estrutura "heading força quebra, heading com lookahead mede, sparse-absorb é opcional".
- `EDITORIAL POLICY`: a lista de "front matter", a regex `^MARCO\s+`, "sparse narrative ≤ 100 palavras".
- `PROJECT OVERRIDE`: a string `SETENTA E DOIS ENCONTROS ENTRE HERANÇA E ESCOLHA` (KALLISTIS).

Pseudocódigo:

```text
if source.type == "heading":
    if source.level == 1 || dedicationBoundary || frontMatterBoundary || compositionBoundary:
        if currentPage.blocks.length && !absorbSparseAssetOpening:
            if transitionAsset_for(sparseCurrent):
                currentPage.blocks.push(transitionImage)
            await finishCurrent(source)
    elif source.level >= 2:
        headingM    = await measure(currentPage + [block])
        keepWithNext = await measure(currentPage + [block, image?, nextBlock?, lookahead?])
        if (headingM.overflow || keepWithNext.overflow) && !mayPairEncounterEntries:
            await finishCurrent(source)
```

---

### Fase L. TABELAS

**INPUT**  : `source : SourceTableBlock`, `currentPage`
**OUTPUT** : tabela quebrada em fragmentos com `continuationOf`, `continuationIndex`, `continuationHeader`
**INVARIANTS** :
- Header é separado do body e do footer.
- `repeatHeader: true` (default V2) injeta `continuationHeader` em cada continuação.
- Continuações compartilham `columns[]` e `style`.
- Cada continuação tem `id = <orig>-continuation-<timestamp>`.
- A proveniência é preservada via `materialization.sourceBlockId` no bloco.
- Tabelas com `allowPageBreak: false` viram `LAYOUT_INCIDENT` se overflow.
- A primeira linha de tabela em PARTE VII (regra) força `template = rules_2col`, 2 colunas.
**FAILURE CONDITIONS** :
- Tabela com `allowPageBreak: false` que não cabe → `LAYOUT_INCIDENT`.
**GENERIC OR PROJECT-SPECIFIC** : `GENERIC RULE` (split, header, continuation); `PROJECT OVERRIDE` (regra PARTE VII).

Pseudocódigo:

```text
function splitTable(table, afterRowIndex, inIdx, fragCnt):
    splitAt = clamp(afterRowIndex + 1, 0, table.rows.length - 1)
    firstRows = table.rows[:splitAt]
    remainingRows = table.rows[splitAt:]
    headers = tableHeaderRows(table)
    continuation = {
        ...table,
        id: `${table.id}-continuation-${now()}`,
        rows: remainingRows,
        continuationOf: table.id,
        continuationIndex: (table.continuationIndex ?? 0) + 1
    }
    if table.repeatHeader && headers.length:
        continuation.continuationHeader = headers.map(cloneRow)
    return { first: {...table, rows: firstRows}, continuation }
```

---

### Fase M. IMAGENS E SPREADS

**INPUT**  : `source : SourceBlock`, `asset : Asset | null`, `currentPage, imageCadence, semanticRules`
**OUTPUT** : `image : ImageBlock | null`, possivelmente `spread : Spread`
**INVARIANTS** :
- Uma imagem entra na página se:
  1. `source` tem asset atribuído (plan + bind), AND
  2. Asset ainda não foi usado (a menos que `semanticPairId` ou `family ∈ {POVO, OFICIO, BESTIARY}` autorize repetição), AND
  3. `semanticCompositionRecommended` (heading + page vazia OU absorbSparseAssetOpening OU plannerAsset), AND
  4. `firstPriority || cadenceReached || hasAsset`.
- `imageCadence` é cadência visual, não regra de página cheia:
  - `targetInterval = 4` (média entre imagens)
  - `minimumInterval = 3` (nunca encadear imagens a menos de 3 páginas)
  - `maximumInterval = 5` (nunca passar de 5 páginas sem imagem)
  - `SOFT_MAX_TEXT_RUN = 5` (warning)
  - `HARD_MAX_TEXT_RUN = 7` (gate de qualidade)
- `semanticPairId` permite uma imagem ser reusada para um par de páginas (ex.: P008-P009 compartilhando uma arte horizontal).
- `MAP_SPREAD` é uma página inteira por lado (left/right) com a mesma imagem atravessando o gutter via `spreadSide: "left"|"right"` e CSS `width: 200%; left: -100%`.
- `visualDebt` cresce quando uma página termina sem imagem. Decresce quando há imagem.
- A política produz **composição** (a página muda de template/variant) **e** previne longos trechos sem imagem. **Não é só preenchimento**: uma página semanticamente completa pode ganhar uma imagem se a cadência pedir.
**FAILURE CONDITIONS** :
- Asset `semanticStatus == "INVALID"` no `validateMaterialization` → `INVALID_IMAGE_PLACEMENT` (gate).
**GENERIC OR PROJECT-SPECIFIC** :
- `GENERIC RULE`: o loop "decide se entra imagem" e a cadência numérica.
- `EDITORIAL POLICY`: `SOFT_MAX_TEXT_RUN = 5` e `HARD_MAX_TEXT_RUN = 7` (política editorial do livro).
- `PROJECT OVERRIDE`: 18 HISTORY_ASSETS literais, 90+ SEMANTIC_ASSET_RULES literais, 9 Povos hardcoded como `POVO_OPENING`, 8 Ofícios hardcoded, 10+ criaturas hardcoded como `BESTIARY_ENTRY`.

Pseudocódigo:

```text
function tryImage(source, asset, currentPage, pagesSoFar, visualDebt, lastImagePage, textRun):
    if !asset: return null
    if usedAssetShas.has(asset.sha) && !canReusePair(asset, source): return null
    if currentPage.hasImage: return null
    firstPriority = source.type == "heading" && (source.text.startsWith("Prólogo") || source.level == 1)
    cadenceReached = visualDebt >= IMAGE_CADENCE.targetInterval
                  || textRun >= SOFT_MAX_TEXT_RUN
                  || (pagesSoFar - lastImagePage) >= IMAGE_CADENCE.targetInterval
    if !(firstPriority || cadenceReached || hasAsset): return null
    return generatedImage(source, asset, sizeFor(source), pairCount)
```

---

### Fase N. REPARO GLOBAL

**INPUT**  : `pages : Page[]`, `browserPage, baseBook, sourceById`
**OUTPUT** : `pages' : Page[]`
**INVARIANTS** :
- **Pass 1 (trailing-heading repair)**: se a última página termina com heading, tenta mover o heading para a próxima página; mede ambos; se nenhum overflow, commita.
- **Pass 2 (merge vizinhas)**: páginas vizinhas com mesmo `part`, mesmo `template`, mesmo `settings.columns`, sem image, sem H1, sem `PART_OPENING`, e com primeira da vizinha **não sendo** H1, podem ser fundidas se `renderAndMeasure` confirmar que cabem juntas.
- **Pass 3 (re-medir caudas)**: páginas com overflow ou com `OFICIO_CULTURAL_OPENING` são recandidatadas; tenta `repairMeasuredTailOverflow`.
- **Pass 4 (drop vazias)**: páginas sem blocks são removidas; isso afeta o folio e o `materialization.pageFillRatio`.
- **Pass 5 (renumerar)**: páginas recebem `id = ${scope.toLowerCase()}-page-NNNN`.
- **Pass 6 (orphan repair)**: `repairOrphanHeadings` deleta páginas cuja última block é heading (residual após Pass 1).
**FAILURE CONDITIONS** : nenhuma; o objetivo é melhorar, não falhar.
**GENERIC OR PROJECT-SPECIFIC** : `GENERIC RULE`.

---

### Fase O. VALIDAÇÃO DE INTEGRIDADE

**INPUT**  : `book : Book`, `sourceBlocks : SourceBlock[]`, `originalHash : string`, `finalMeasurements : Measurement[]`
**OUTPUT** : `invariants : { ... }`  (diagnóstico)
**INVARIANTS** :

```text
SOURCE_TEXT_LOST = 0                    # word-level diff contra source
SOURCE_TEXT_ADDED = 0
SOURCE_BLOCKS_LOST = 0
SOURCE_BLOCKS_DUPLICATED = 0            # mesmo sourceBlockId em mais de uma página
FRAGMENT_SEQUENCE_ERRORS = 0            # fragmentos fora de ordem ou faltando índice
SOURCE_ORDER_CHANGED = 0
PAGE_OVERFLOW = 0
ORPHAN_HEADINGS = 0
BROKEN_TABLE_ROWS = 0
INVALID_IMAGE_PLACEMENTS = 0
UNAPPROVED_ASSET_AUTO_USED = 0
ASSET_SEMANTIC_WINDOW_VIOLATION = 0
CANONICAL_SOURCE_MODIFIED = 0           # SHA do manuscrito bate
CANONICAL_PROJECT_OVERWRITTEN = 0       # book.json de saída não é o canônico
ASSETS_MODIFIED = 0                     # SHA dos assets não mudou durante o run
MANUSCRIPT_TEXT_CHANGED = 0             # agrega mismatches
```

Cada invariante é contado, não binário: `MANUSCRIPT_TEXT_CHANGED = 1` se qualquer um dos sub-contadores for > 0.
**FAILURE CONDITIONS** : todos esses = 0 é requisito para `verdict = PASS`.
**GENERIC OR PROJECT-SPECIFIC** : `GENERIC RULE`.

Pseudocódigo:

```text
function validateMaterialization(book, sourceBlocks, originalHash, outputPath, finalMeasurements, assetHashes):
    occurrences = collectMaterializedSourceOccurrences(book)
    for source in sourceBlocks:
        records = occurrences.get(source.id, [])
        expected = validationTextForSource(source)
        actual   = concatenateByFragmentIndex(records)
        if normalized(expected) != normalized(actual): sourceBlockTextMismatches++
        delta = wordDelta(expected, actual)
        sourceWordsLost   += delta.lost
        sourceWordsAdded  += delta.added
        if duplicateFragmentIndex(records): duplicateFragmentOccurrences += records.length - 1
        if fragmentSequenceBroken(records): fragmentSequenceErrors++
    return {
        SOURCE_BLOCK_TEXT_MISMATCHES: ...,
        SOURCE_WORDS_LOST: ...,
        SOURCE_WORDS_ADDED: ...,
        DUPLICATE_FRAGMENT_OCCURRENCES: ...,
        FRAGMENT_SEQUENCE_ERRORS: ...,
        PAGE_OVERFLOW: countMeasurementsWith(overflow),
        ORPHAN_HEADINGS: countPagesWith(lastBlockIsHeading),
        BROKEN_TABLE_ROWS: countRowsWhere(top < -1 || bottom > clientHeight + 1),
        INVALID_IMAGE_PLACEMENTS: countPlacementsWith(semanticStatus == "INVALID"),
        ASSETS_MODIFIED: anyAssetShaChanged,
        ORIGINAL_PROJECT_OVERWRITTEN: outputPath == canonicalProject,
        ...
    }
```

---

### Fase P. BOOK JSON

**INPUT**  : `baseBook, generatedPages, coverPage, tocPages, productionPlan, nodes, spreads`
**OUTPUT** : `book : Book` serializado em UTF-8 com 2-space indent
**INVARIANTS** :
- Schema version 1, meta, tokens (de baseBook), nodes (de baseBook ∪ generated), pages (cover + toc + generated, OU baseBook + generated em continuação), spreads, productionPlan.
- `pages[].materialization.autoGenerated = true` para cada página gerada.
- `pages[].materialization.pageFillRatio` é atualizado com a medição final.
- `book.assets` é o catálogo do manifest aprovado + binários localmente disponíveis; nunca inventado.
- Persistência: o JSON é gravado em `args.output` (default = `projects/kallistis-materializado-historia-v5.json`); o relatório em `args.output.replace(/\.json$/, ".report.json")`.
- Proveniência preservada: cada `block.materialization.sourceBlockId` é gravado; a validação (Fase O) confirma round-trip.
**FAILURE CONDITIONS** : serialização circular ou `JSON.stringify` falhando → `BOOK_SERIALIZE_FAILED`.
**GENERIC OR PROJECT-SPECIFIC** : `GENERIC RULE` (estrutura) + `PROJECT OVERRIDE` (`meta.title`, `meta.author`, `meta.imprint`).

---

### Fase Q. EDIÇÃO HUMANA

**INPUT**  : `book : Book` (de P), interação humana no editor
**OUTPUT** : `book' : Book` com `pages[].fixed = true` onde o humano sobrescreveu
**INVARIANTS** :
- O humano edita **um subconjunto** de páginas. Páginas com `fixed = true` são imunes à re-automação.
- A edição **não altera o modelo serializável** (apenas `materialization` é read-only).
- Persistência: `localStorage` autosave + IndexedDB para binários + opcional File System Access API.
- Toda edição é round-trippable: `book → save → load → render` produz o mesmo PDF.
**FAILURE CONDITIONS** : quota de `localStorage` excedida → fallback para IndexedDB-only.
**GENERIC OR PROJECT-SPECIFIC** : `GENERIC RULE` (a UI é genérica). `HUMAN DECISION` em cada clique.

---

### Fase R. PREFLIGHT

**INPUT**  : `book : Book` carregado em `/print`
**OUTPUT** : `report : { summary: { errors, warnings, infos }, issues: PreflightIssue[] }`
**INVARIANTS** :
- O preflight tem duas camadas:
  1. **Estático** (`static-rules.ts`): regras offline aplicadas ao JSON, antes de render.
  2. **Medido** (`measure.ts`): medições no DOM real, depois de render.
- Severidades: `error`, `warning`, `info`.
- Regras medidas incluem: `text-overflow`, `hidden-content`, `element-outside-trim`, `content-outside-safe-area`, `full-bleed-insufficient-bleed`, `table-overflow`, `table-cell-overflow`, `widow-orphan`, `low-contrast`, `font-substitution`.
- EPS de medição: 1.5 px (subpixel noise).
- SAFE_INSET_MM: 5 mm.
- `widow-orphan` é detectado geometricamente comparando `top` da última palavra vs. penúltima no último `<p>`.
- `low-contrast` usa WCAG luminance + threshold 4.5:1 (texto normal) ou 3:1 (≥ 18.66 px bold, ou ≥ 24 px).
- O relatório é publicado em `window.__KALLISTIS_PREFLIGHT__` para o exportador auditar antes do PDF.
- O exportador aborta se `errors > 0 && !--force`.
**FAILURE CONDITIONS** : nenhuma (o preflight nunca aborta; ele só reporta).
**GENERIC OR PROJECT-SPECIFIC** : `GENERIC RULE` (as regras são genéricas para livros impressos).

---

### Fase S. PDF

**INPUT**  : `book : Book`, `args : { in, out, url, timeout, force, report }`
**OUTPUT** : `book.pdf : Buffer` em `args.out`
**INVARIANTS** :
- Pipeline: Chromium Playwright → `page.pdf({width, height, margin: 0, preferCSSPageSize: false})` → `pdfunite` (concatena chunks) → Ghostscript `/printer` (recompacta).
- Chunks de 50 páginas: 423 páginas = 9 chunks. Cada chunk é renderizado em `/print` com `.k-print-sheet` fora do range removido.
- `width` e `height` vêm de `--page-width` e `--page-height` (trim 140×210, **não** 150×220 — a folha física completa é interna; o PDF é o trim).
- Margens do PDF: 0 (a margem é interna à página via CSS `margin-inner`/`margin-outer`).
- `pdfunite` (poppler) é o concat. `gs -dPDFSETTINGS=/printer` recompacta (drop Type 3 ToUnicode CMap, ~90% size reduction).
- Idempotente: se `gs` ausente, pula silenciosamente; se `pdfunite` ausente, aborta.
- `printBackground: true` (imagens de sangria e fundo precisam sair).
- `tagged: false` (PDF não-acessível, decisão de produção).
- `reducedMotion: reduce`, `locale: pt-BR`, `timezoneId: UTC`, `colorScheme: light` (determinismo).
- Fontes são pré-carregadas com `document.fonts.load(...)` antes do `page.pdf`.
- Se preflight report tem errors > 0 && !force → aborta.
**FAILURE CONDITIONS** :
- Playwright/Chromium ausente → export_pdf falha com mensagem clara.
- pdfunite ausente → falha.
- gs ausente → pula recompactação (warning).
- PDF page size 0 → `PDF_SIZE_ZERO`.
**GENERIC OR PROJECT-SPECIFIC** : `GENERIC RULE` (o pipeline Playwright+pdfunite+gs é genérico para qualquer livro CSS-printable).

---

## 3. Pseudocódigo consolidado

```text
# === FASE A: INGESTÃO ===
raw = readFile(MANUSCRIPT_PATH, "utf8")

# === FASE B: FINGERPRINT ===
if EXPECTED_SHA256 && sha256(raw) != EXPECTED_SHA256:
    abort("MANUSCRIPT_SOURCE=INCIDENT")

# === FASE C: PARSE SEMÂNTICO ===
sourceBlocks = parseMarkdown(raw, scope)

# === FASE D: ÁRVORE DOCUMENTAL ===
annotateHeadingPaths(sourceBlocks)

# === FASE E: CLASSIFICAÇÃO EDITORIAL ===
scopedBlocks = filterBlocksForProfile(sourceBlocks, profile)
scopedBlocks = filterByScope(scopedBlocks, scope)

# === FASE F: PLANEJAMENTO VISUAL ===
plan = planEditorialAssets(scopedBlocks, manifest, { reservedSrcs })

# === FASE G+H: ESCOLHA DE COMPOSIÇÃO + NOVA PÁGINA ===
# (escolha é feita inline durante o loop)

# === FASE I: STARTUP DO RENDERER REAL ===
server  = ensureServer("http://127.0.0.1:4185")
browser = launchChromium()
context = browser.newContext({ viewport:{1240,1754}, reducedMotion:"reduce", locale:"pt-BR", timezoneId:"UTC", colorScheme:"light" })
page    = context.newPage()
page.goto("http://127.0.0.1:4185/print")
page.waitForSelector("html[data-print-ready='true']")

# === LOOP PRINCIPAL (FASES G, H, I, J, K, L, M) ===
pages = []
current = newPage(scope, 0, sourceBlocks[0])
visualDebt = 0; lastImagePage = -100; textRun = 0
usedAssetShas = new Set(); usedSemanticPairs = new Map()

for source in sourceBlocks:
    asset         = assetForSource(source)
    supportAssets = supportAssetsForSource(source)

    if MAP_SPREAD_trigger(source, asset) && current.blocks.length == 0:
        for side in ["left", "right"]:
            splash = makeMapSplashPage(side)
            pages.append(splash); current = newPage(scope, pages.length, source)

    image = decideImage(source, asset, current, pages, visualDebt, textRun, lastImagePage)

    if source.type == "heading" && (source.level == 1 || isFrontMatter(source) || compositionBoundary(source, asset)):
        if current.blocks.length:
            await finishCurrentWithTransitionAsset(current, source)
    if source.type == "heading" && source.level >= 2 && current.blocks.length:
        if await overflowAheadOfKeepWithNext(current, source, image, sourceBlocks[index+1]):
            await finishCurrent(source)

    await addBlock(current, sourceToBlock(source))
    if image:        await addBlock(current, image)
    if supportAssets: for sa in supportAssets: await addBlock(current, supportImage(source, sa))
    if fullArtPlates: for plate in fullArtPlates: pages.append(makeFullArtPlatePage(plate))

await finishCurrent()

# === FASE N: REPARO GLOBAL ===
# pass 1: trailing-heading repair
for i in 0..len(pages)-2:
    if pages[i].blocks.last.type == "heading":
        moved = tryMoveLastToNext(pages, i)
        if measureBothFit(pages, i, i+1): commit(moved)

# pass 2: merge vizinhas compatíveis
for i in 0..len(pages)-1:
    if compatible(pages[i], pages[i+1]):
        merged = merge(pages[i], pages[i+1])
        if measure(merged) fits: pages.replace(i, 2, merged)

# pass 3: drop empty + renumber
pages = [p for p in pages if p.blocks.length > 0]
for i, p in enumerate(pages): p.id = f"{scope.lower()}-page-{i+1:04d}"

# === FASE O: VALIDAÇÃO ===
finalMeasurements = renderAndMeasure(page, book)
invariants = validateMaterialization(book, sourceBlocks, originalHash, args.output, finalMeasurements, assetHashes)

# === FASE P: BOOK JSON ===
book = assembleBook(baseBook, coverPage, tocPages, pages, plan, spreads)
writeFile(args.output, JSON.stringify(book, indent=2))
writeFile(args.output.replace(".json", ".report.json"), JSON.stringify(report, indent=2))

# === FASE S: PDF (separado, por export-pdf.mjs) ===
# O exportador recebe `book` via POST /api/export-from-snapshot
# ou via --in <book.json>, e produz o PDF em /tmp/dist/export/<book>.pdf
```

---

## 4. Algoritmo de fitting (revisado)

```text
input:  candidate = page + [...blocks]
output: { overflow: bool, fillRatio: float, brokenTableRows: int[] }

function fit(candidate):
    measurement = renderAndMeasure(candidate)
    if measurement.overflow:        return FAIL
    if measurement.brokenTableRows: return FAIL
    return PASS
```

**Por que medir no renderer real e não simular?**

1. CSS é a verdade. Simular `overflow: hidden` ou `column-gap` é impossível sem o layout engine do navegador.
2. Fontes (especialmente EB Garamond) determinam a mancha de texto. Subpixel rendering muda entre simulação e realidade.
3. Imagens bleed. Suas bounding boxes são maiores que o trim; só o navegador sabe o que vai pra fora.
4. Tabelas com `border-collapse` têm larguras que dependem de quem chegar primeiro no layout. Não dá pra prever.

**Por que o overhead é aceitável?** Cada `renderAndMeasure` é uma chamada `page.evaluate` com `getBoundingClientRect`. Para 4 454 blocos + 423 páginas + binary search, são ~10 000 medições, ~5 minutos em um laptop médio. Aceitável para um batch de produção.

---

## 5. Algoritmo de split de texto

```text
function splitSentences(text):
    # Naive: split por [.!?…] seguido de whitespace.
    # Se um livro tem abreviações ou números decimais, refinar.
    return re.split(r'(?<=[.!?…])\s+', text.strip())

function trySplitText(block, currentPage, measure):
    if block.type != "text": return null
    pieces = (block.sourceType == "list") ? block.content.split("\n").filter(Boolean)
                                        : splitSentences(block.content)
    if pieces.length < 2: return null
    return binarySearchSplit(pieces, (sub, i, c) => fragmentText(block, sub, i, c), measure)
```

**Propriedades:**
- O(n log n) medições, não O(n²). Para 50 sentenças, são 6 medições em vez de 50.
- A proveniência é preservada: `block.materialization.sourceBlockId` e `sourceFragmentIndex` são setados em `fragmentText`.
- O `restart` (pegar a "primeira metade que cabe") é necessário porque binary search sozinho retorna o **maior** índice que cabe, mas para "split into pages" queremos o **primeiro** que cabe (evitar primeira página gigante).
- **Edge case:** se `best == 0` (nenhuma peça cabe), tenta como `LAYOUT_INCIDENT` ou reflowa.

---

## 6. Algoritmo de split de tabela

```text
function trySplitTable(block, currentPage, measure):
    if block.type != "table": return null
    bodyRows = block.rows.filter(r => r.kind != "header" && r.kind != "footer")
    if bodyRows.length < 2: return null
    return binarySearchSplit(bodyRows,
        (subRows, i, c) => splitTable(block, subRows, i, c),
        measure)

function splitTable(origTable, afterRowIndex, inIdx, fragCnt):
    splitAt = clamp(afterRowIndex + 1, 0, origTable.rows.length - 1)
    firstRows = origTable.rows[:splitAt]
    remainingRows = origTable.rows[splitAt:]
    headers = origTable.rows.filter(r => r.kind == "header")
    continuation = {
        ...origTable,
        id: `${origTable.id}-continuation-${now()}`,
        rows: remainingRows,
        continuationOf: origTable.id,
        continuationIndex: (origTable.continuationIndex ?? 0) + 1
    }
    if origTable.repeatHeader && headers.length:
        continuation.continuationHeader = headers.map(cloneRow)
    return {
        first: {...origTable, rows: firstRows},
        continuation
    }
```

**Propriedades:**
- Header **nunca** é fragmentado; é o header da primeira página, e vira `continuationHeader` em cada continuação (se `repeatHeader: true`).
- Footer (kind = "footer") também fica junto com a última página (não fragmentado, sempre embaixo).
- `continuationHeader` é clonado com novos IDs, mas mantém `style` e `cells`.
- O cabeçalho visual (`<thead>`) **não** é duplicado: a tabela no DOM é uma só; o renderizador sabe que `continuationHeader` vira `<thead>` quando `repeatHeader`.
- A proveniência é compartilhada: `sourceBlockId` em todas as continuações.

---

## 7. Keep rules (regras de continuidade)

```text
HARD BREAK (sempre fecha antes):
  - H1 com current.blocks.length
  - Heading de front matter (lista literal)
  - Heading de dedicatória
  - Heading H1 que tem compositionBoundary (asset, supportAsset não-extraContext, PART_OPENING, timeline-boundary)
  - forcedTensionContinuationBreak (heading textual específico)
  - forcedChavesBreak (heading textual específico)

SOFT BREAK (mede, decide):
  - H2/H3: mede keepWithNext = current + [heading] + [image?] + [next] + [lookahead?]
    se overflow && !mayPairEncounterEntries: fecha
  - Tabela após heading em rules_2col: allowTableContinuation, deixa trySplitTable cuidar

ABSORÇÃO (em vez de quebrar, absorve a página sparse):
  - current é sparse (≤ N palavras, sem image/tabela)
  - source é heading com asset
  - asset.family não é "independent opening" (POVO/BESTIARY/OFICIO/MAP_SPREAD etc)
  - current.editorialFamily == composition of asset

ORPHAN PROTECTION:
  - repairOrphanHeadings: trailing heading → tentar mover pra próxima página
  - mayPairEncounterEntries: dois headings L≥3 do mesmo "encontro" coabitam
```

---

## 8. Tratamento de imagens

```text
DECISÃO:
  1. source tem asset (plan + bindSemanticAssets)?
  2. asset ainda não foi usado (ou canReusePair)?
  3. semanticCompositionRecommended (heading + page vazia OU absorb)?
  4. firstPriority (Prólogo ou H1) || cadenceReached || hasAsset?

CADÊNCIA:
  visualDebt += 1 por página sem imagem
  visualDebt = 0  quando entra imagem
  textRun    += 1 por página sem imagem
  textRun     = 0 quando entra imagem
  cadenceReached = visualDebt >= targetInterval
                || textRun    >= SOFT_MAX_TEXT_RUN
                || (pagesSoFar - lastImagePage) >= targetInterval

PARES:
  semanticPairId (ex.: p008-p009) autoriza reuso
  family in {POVO_OPENING, OFICIO_CULTURAL_OPENING, BESTIARY_ENTRY} autoriza reuso
  REUSED_FINAL_ART_HEADINGS (set literal) autoriza reuso
  REUSABLE_SEMANTIC_ART_HEADINGS (set literal) autoriza reuso

SPREAD:
  MAP_SPREAD só para "O Mapa em Duas Camadas" (ou equivalente)
  Duas páginas: left (spreadSide="left") e right (spreadSide="right")
  A imagem tem width: 200% e left: -100% no lado direito
  Spread registrado em Book.spreads[]

PLANNER ASSET:
  asset.plannerAssignment == true (vindo de planEditorialAssets)
  Imagem é sugestão, não obrigatória: se remainingRatio < 0.3 ou overflow, descarta
  usedAssetShas.delete(asset.sha) se descartada
```

---

## 9. Spreads

**O que é um spread?** Um par left/right de páginas que **compartilham** uma arte horizontal. Não altera a paginação física (são duas páginas normais); apenas fornece um metadata para revisão visual.

**Quando um spread é criado:**

- Pelo materializador, em casos específicos (atualmente: MAP_SPREAD para "O Mapa em Duas Camadas").
- Manualmente, via editor (panel de propriedades do `page`).

**Como o spread é renderizado:**

- A imagem tem `spreadSide: "left"` ou `"right"`.
- CSS: `position: absolute; left: 0 (ou -100%); width: 200%; height: 100%; object-fit: cover`.
- O `.k-bleed` da página esquerda é o mesmo `.k-bleed` da direita, mas com offset.

**Propriedades:**

- O spread é somente leitura em runtime: o editor não regenera, apenas exibe.
- A remoção de um spread é edição manual.

---

## 10. QA estrutural vs QA editorial

**QA estrutural** (foco: invariantes não-violadas):

```text
SOURCE_BLOCK_TEXT_MISMATCHES = 0
SOURCE_WORDS_LOST = 0
SOURCE_WORDS_ADDED = 0
SOURCE_BLOCKS_LOST = 0
SOURCE_BLOCKS_DUPLICATED = 0
FRAGMENT_SEQUENCE_ERRORS = 0
PAGE_OVERFLOW = 0
ORPHAN_HEADINGS = 0
BROKEN_TABLE_ROWS = 0
INVALID_IMAGE_PLACEMENTS = 0
SOURCE_ORDER_CHANGED = 0
CANONICAL_SOURCE_MODIFIED = 0
CANONICAL_PROJECT_OVERWRITTEN = 0
ASSETS_MODIFIED = 0
```

Se qualquer um > 0 → `verdict = FAIL`.

**QA editorial** (foco: legibilidade, ritmo, completude):

```text
SOFT_MAX_TEXT_RUN exceeded?      warning
HARD_MAX_TEXT_RUN exceeded?      warning + provavelmente FAIL
compositionFamiliesUsed < 3?     warning (política editorial: variedade mínima)
INSUFFICIENT_COMPOSITION_FAMILIES? warning
PAGE_COUNT_WARNING?              warning (se targetBookPages)
UNAUTHORIZED_FULL_ART?           warning (se auto-criou full_art sem plano)
BOOKMAKER_CONTRACT_IN_PUBLIC_BOOK? warning (se contrato vazou para livro público)
INVALID_IMAGE_PLACEMENTS?        gate
FULL_ART_PAGES_AUTO_CREATED?     gate
CHARACTER_SHEET_DEFERRED?        INCIDENT (não é gate, é estado explícito)
```

**Gates necessários:**

1. `verdict = PASS` se todos os estruturais = 0 E visuais = 0 E `visualGate.passed`.
2. `verdict = INCIDENT` se algum estrutural > 0 (mesmo com visualGate passed).
3. `verdict = FAIL` se estruturais > 0 OU visuais > 0.

---

## 11. Pontos de intervenção humana

| Fase | Onde | Tipo | Efeito |
| --- | --- | --- | --- |
| A-C | leitura do manuscrito | decisão editorial | troca de fonte |
| E | profile/scope | decisão editorial | muda cobertura |
| F | manifest de assets | decisão editorial | muda pool de imagens |
| G | compositionForSource | decisão editorial | muda roteamento |
| H | template default | HUMAN DECISION (UI) | pode escolher outro template |
| H | variant | HUMAN DECISION (UI) | pode escolher outro variant |
| H | settings.columns | HUMAN DECISION (UI) | 1 ou 2 colunas |
| H | settings.background | HUMAN DECISION (UI) | paper ou obsidian |
| H | coverMode | HUMAN DECISION (UI) | art-only ou overlay |
| H | fixed | HUMAN DECISION (UI) | protege página de automação |
| Q | edição no canvas | HUMAN DECISION (UI) | move, redimensiona, edita texto, troca assets, ajusta crop |
| Q | recipes | HUMAN DECISION (UI) | define templates reutilizáveis |
| Q | productionPlan | HUMAN DECISION (UI) | override do plano automático |
| R | preflight | HUMAN DECISION (UI) | corrige erros reportados |
| S | PDF | HUMAN DECISION (CLI) | `--force` para ignorar preflight errors |

---

## 12. Determinismo

**O que precisa ser determinístico para reproduzir o mesmo PDF:**

1. **Manuscrito com SHA-256 fixo** (Fase B). Se o SHA muda, abortar.
2. **Catálogo de assets com SHA-256 fixo por asset** (Fase F). Se um asset muda, abortar.
3. **Cover com SHA-256 fixo** (validação de `APPROVED_COVER_SHA256`).
4. **Versão do motor (`materializationVersion`)**. Mas vide §17 do DEVASSA: hoje há drift entre 1 e 7.
5. **Versão do schema (`schemaVersion: 1`)**.
6. **Versão do Chromium (Playwright)**. Mudanças no layout engine mudam o `getBoundingClientRect`. É o ponto mais frágil de determinismo.
7. **Versão do EB Garamond / Liberation Sans**. Fontes embutidas no JSON mitigam parcialmente; mudanças de hinting mudam kerning.
8. **Versão do `npm install`** (lockfile obrigatório). Mudanças em `react` ou `vite` podem mudar CSS injetado.
9. **Versão de Ghostscript**. A recompactação é idempotente para a mesma versão, mas `-dPDFSETTINGS=/printer` evolui.

**O que é reproduzível no nível de JSON:**
- O mesmo manuscrito + mesmo catálogo + mesmo motor (versão fixa) produzem o mesmo Book JSON (com pequenas variações em `id` derivados de `Date.now()`).
- Recomendação: usar `id` baseado em hash do conteúdo, não em timestamp. Hoje o código usa `Date.now().toString(36)`.

---

## 13. Reproductibilidade (CI gate)

```text
CI STEPS:
  1. checkout (commit exato)
  2. bun install --frozen-lockfile
  3. bun run typecheck
  4. bun run test
  5. bun run build
  6. bunx playwright install --with-deps chromium
  7. (se tiver manuscrito e catálogo) bun run materialize:historia
  8. bun run test:materializer
  9. (se for CI de produção) bun run export:pdf -- --in projects/<canonical>.json
 10. (PDF) sha256(pdf) é comparado com hash conhecido
```

**Status atual no repositório:** passos 1-6 PASS, 7-9 não comprovados em clone limpo por dependências externas.

---

## 14. Separação conceitual (mapa de responsabilidade)

```text
CORE MODEL            src/book/types.ts, src/book/authoring.ts, src/book/tableModel.ts, src/book/sheetModel.ts
                      Book, Page, Block, Asset, Spread, Recipe, Sheet — JSON puro

RENDERER              src/book/renderer/, src/book/templates/, src/book/styles/, src/book/components/
                      BookRoot, PageRenderer, BlockRenderer, 13 templates, CSS tokens
                      Conhece DOM/CSS. Não conhece fonte, não conhece assets externos.

MEASUREMENT           src/lib/preflight/measure.ts
                      measureIssues(root, book) — DOM real, getBoundingClientRect
                      Reutilizado por preflight (R) e por materializer (I)

PAGINATION ENGINE     scripts/materialize-manuscript.mjs (Fases I, J, K, L, M, N)
                      Não existe em src/. Existe só como script.
                      src/book/pagination/adapter.ts é stub.

EDITORIAL POLICY      scripts/editorial-planner.mjs (Fase F) + o que está no Book JSON (meta, tokens, page.settings, page.fixed)
                      Genérico no script, específico nas instâncias do JSON

PROJECT POLICY        scripts/materialize-manuscript.mjs:
                        - SEMANTIC_ASSET_RULES (90+ literais)
                        - HISTORY_ASSETS (18 literais)
                        - ROLE_FOR_PART (regex PARTE V/VI/VII)
                        - ENCOUNTER_SECTION
                        - BOOKMAKER_CONTRACT_HEADING
                        - list "frontMatterBoundary"
                        - list "independentOpening"
                        - IMAGE_CADENCE, SOFT/HARD_MAX_TEXT_RUN
                      Tudo hardcoded. NÃO está no JSON canônico.

ASSET POLICY          public/editorial-asset-manifest.json + drive-image-inventory.json + drive-image-disposition.csv
                      Status filter (BLOCKED_STATUSES), family mapping, score thresholds
                      Hoje vive em 3 arquivos paralelos.

EXPORT PIPELINE       scripts/export-pdf.mjs
                      Playwright + pdfunite + Ghostscript
                      Genérico. Não conhece KALLISTIS.

QA                    src/lib/preflight/ + Fase O
                      static-rules + measure + report
```

A separação `CORE MODEL ≠ RENDERER ≠ MEASUREMENT ≠ PAGINATION ENGINE ≠ EDITORIAL POLICY ≠ PROJECT POLICY ≠ EXPORT PIPELINE ≠ QA` **NÃO está materializada em pastas separadas no código**. Hoje:

- `src/` contém CORE MODEL + RENDERER + MEASUREMENT (parcial) + EDITOR + PERSISTENCE + UI.
- `scripts/` contém PAGINATION ENGINE (misturado com PROJECT POLICY) + EXPORT PIPELINE + QA manual.

A separação `EDITORIAL POLICY ≠ PROJECT POLICY` é a mais grave: as duas políticas estão **literalmente misturadas em uma única função** (`materialize()`), com regras literais (KALLISTIS) e regras genéricas (planner, renderAndMeasure) intercaladas.

---

## 15. Próxima pergunta a fazer antes de qualquer refatoração

Resposta do `Ponytail Gate`:

1. **Isso realmente precisa mudar?** O motor funciona. Build verde, typecheck verde, 4 unit tests verdes, /print renderiza 423 páginas, e o materializador (quando tem o manuscrito e o catálogo) produz PASS com 0 errors. A separação conceitual é desejável, mas não é bloqueante.
2. **O comportamento atual funciona?** Sim, no caminho feliz. Não funciona em clone limpo para o materializador (manuscrito fora do repo).
3. **O problema é código ou apenas documentação?** A maior parte dos "problemas" identificados no DEVASSA é documental:
   - O comentário "o editor escolhe, nunca a automação" no tipo `PageVariant` (P2).
   - O union `MaterializationBlockMetadata.scope` que não inclui `PARTES_I_IV` (P2).
   - A constante `TRIM` que não existe como export (P2).
4. **Podemos documentar em vez de abstrair?** Sim:
   - Documentar que `PageVariant` é escolhido pelo materializador apesar do comentário.
   - Documentar o `TRIM`/`BLEED` em um único lugar e linkar.
   - Documentar a separação conceitual.
5. **Podemos remover uma camada?** Possíveis remoções:
   - `BookRecipe[]` (dead code no caminho produtivo) — remover ou documentar como opcional.
   - `kallistis-production-plan.json` (formato morto) — remover.
6. **Existe implementação duplicada?** Sim:
   - `Pagination` existe em dois lugares (adapter stub + materializador ad-hoc).
   - `EditorialComposition` é hoje só um rótulo; pode ser fundido com `Template`+`Variant` se removido o data-attribute.
7. **Qual é a menor mudança que tornaria o contrato verdadeiro?** (do DEVASSA §25)
   - Consolidar `140mm`/`210mm`/`5mm` em `TRIM`/`BLEED` em `types.ts`.
   - Dropar ou condicionar `test:materializer`.
   - Documentar a separação conceitual no README.
   - Mover `MANIFESTO_SHA256.txt` para incluir o SHA do manuscrito v2.

**Recomendação:** nenhuma refatoração ampla antes de responder a essas 7 perguntas. A próxima ação mínima está no DEVASSA §25.
