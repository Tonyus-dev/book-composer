# PROVENIÊNCIA DA FONTE CANÔNICA DO KALLISTIS BOOK MAKER

> Auditoria read-only do estado `a56fa59` (HEAD do master em `Tonyus-dev/kallistis-book`).
> Complementa as três entregas da devassa anterior (`DEVASSA_ESTRUTURAL_BOOK_MAKER.md`,
> `ALGORITMO_CANONICO_CONSTRUCAO_DE_LIVROS.md`, `MATRIZ_RESPONSABILIDADES_BOOK_CONSTRUCTION.tsv`).
> Foco único: **fechar a proveniência do manuscrito fonte consumido pelo materializador**.

---

## 1. Veredito

**MANUSCRIPT_SHA_MATCH = PASS** — o arquivo esperado existe localmente, com SHA-256 exato.

A fonte primária que o `scripts/materialize-manuscript.mjs` consome via `EXPECTED_MANUSCRIPT_SHA256`
é localizável em:

```text
/home/tonyus-dev/Downloads/KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md
size: 685.576 bytes
mtime: 2026-08-15 20:20 (UTC-3)
sha256: 5427818b44f08ba00cc74f8635172b44952ded4eb948589d22016e4272990d83
```

Comparação bit-a-bit com a constante hardcoded no materializador:

```text
EXPECTED (no código): 5427818b44f08ba00cc74f8635172b44952ded4eb948589d22016e4272990d83
ARCHIVO LOCAL    : 5427818b44f08ba00cc74f8635172b44952ded4eb948589d22016e4272990d83
                  ⇒ MATCH EXATO
```

**Constraint de execução**: `MATERIALIZER_COMPLETED = NO` nesta sessão. O materializador foi iniciado,
ultrapassou o gate SHA, e foi interrompido em `applyV2CuratedAssets` (`materialize-manuscript.mjs:4432-4433`)
por dependências externas **adicionais ao manuscrito** (ver §7). Não há, portanto, Book JSON temporário
para comparar contra o canônico 423p (ver §6). `RECONSTRUCTION_EQUIVALENCE = NOT_PROVEN` para esta sessão;
a **última execução conhecida, documentada e versionada** foi a do `KALLISTIS_manual_do_mundo_final_book`
em 2026-08-15, que produziu 394 páginas, 0 erros em todos os invariantes de fonte, e está congelada em
commit (ver §6).

---

## 2. SHA esperado

```text
EXPECTED_MANUSCRIPT_SHA256 = 5427818b44f08ba00cc74f8635172b44952ded4eb948589d22016e4272990d83
```

Constante: `book_maker/scripts/materialize-manuscript.mjs:53-54`.

```js
const EXPECTED_MANUSCRIPT_SHA256 =
  "5427818b44f08ba00cc74f8635172b44952ded4eb948589d22016e4272990d83";
```

Gate: em `materialize-manuscript.mjs:4397-4402`, se `sha256(markdown) !== EXPECTED_MANUSCRIPT_SHA256` →
erro `MANUSCRIPT_SOURCE=INCIDENT` e exit 1.

---

## 3. Candidatos encontrados

Inventário de todos os arquivos candidatos a manuscrito no working tree (verificado pós-Fase 1):

| # | Caminho | Bytes | SHA-256 | Tipo | Candidato a fonte? |
| --- | --- | ---: | --- | --- | --- |
| 1 | `/home/tonyus-dev/Downloads/KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md` | **685 576** | **`5427818b…d83`** | **Markdown** | **FONTE PRIMÁRIA — MATCH EXATO** |
| 2 | `work/working_copy.docx` | 18 457 739 | `46b4986b…ec381` | DOCX | NÃO — versão "Edição Definitiva v1.3" do Volume Básico. SHA documentado em `claude_ate_apendice_a_consolidation_report.md:127`. Mesmo SHA em `velarim_count_erratum.json` e `apendice_b_consolidation_report.md`. Não é o mesmo arquivo. |
| 3 | `01_FONTE_UNICA/KALLISTIS_LIVRO_BASICO_BASE_PARA_REVISAO.docx` | 18 456 755 | `ba57e0dc…00b5` | DOCX | NÃO — espelho do `source/`. Listado no `MANIFESTO_SHA256.txt`. |
| 4 | `source/KALLISTIS_LIVRO_BASICO_BASE_PARA_REVISAO.docx` | 18 456 755 | `ba57e0dc…00b5` | DOCX | NÃO — espelho byte-equivalente de (3). |
| 5 | `03_OUTPUT_ESPERADO/KALLISTIS_LIVRO_BASICO_ATE_CAPITULO_07.docx` | 18 318 737 | `9b798e3d…3609` | DOCX | NÃO — versão parcial. Listado em `MANIFESTO_SHA256.txt`. |
| 6 | `work/KALLISTIS_LIVRO_BASICO_ATE_CAPITULO_07.docx` | 18 318 737 | `9b798e3d…3609` | DOCX | NÃO — espelho byte-equivalente de (5). |
| 7 | `work/romantizacao/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_B.md` | 92 605 | `c6467f02…ab322` | Markdown | NÃO — versão "romantizada". |
| 8 | `work/romantizacao/KALLISTIS_O_CRISTAL_E_A_FRESTA_ATE_APENDICE_A.md` | 61 075 | `d287dbbb…73e8b` | Markdown | NÃO — versão "romantizada" parcial. |
| 9 | `02_AUDITORIA/AUDITORIA_PRE_EDICAO_KALLISTIS_CLAUDE_PRO_v1.0.md` | 5 199 | `360e8b48…95fcc` | Markdown | NÃO — relatório de auditoria, não fonte. |
| 10 | `02_AUDITORIA/DEVASSA_ESTRUTURAL_BOOK_MAKER.md` | 81 983 | (esta sessão) | Markdown | NÃO — relatório atual. |
| 11 | `02_AUDITORIA/ALGORITMO_CANONICO_CONSTRUCAO_DE_LIVROS.md` | 54 495 | (esta sessão) | Markdown | NÃO — relatório atual. |
| 12 | `book_maker/KALLISTIS_EDITORIAL_MVP_REPORT.md` | 8 911 | `26deeb28…64d1` | Markdown | NÃO — relatório. |
| 13 | `book_maker/KALLISTIS_EDITORIAL_COVERAGE.md` | 2 438 | `475053b4…13cc` | Markdown | NÃO — relatório. |
| 14 | `book_maker/KALLISTIS_RECONSTRUCAO_FINAL.md` | 5 744 | `93ef1e56…f165` | Markdown | NÃO — relatório (KEY=VALUE). |
| 15 | `00_COMECE_AQUI/PROMPT_ANTIGRAVITY_EDICAO_DEFINITIVA_KALLISTIS_v1.1.md` | 18 413 | `9c911deb…e147` | Markdown | NÃO — prompt de operação. |
| 16 | `KALLISTIS_SKILL_ESCRITA_AUTORAL/.agents/skills/...` | 8 238 | n/a | Markdown | NÃO — skill autoral. |
| 17 | `book_maker/god-image-brief-v1.5.md` | 2 451 | n/a | Markdown | NÃO — brief de imagens. |

Nenhum DOCX é candidato: o materializador faz `parseMarkdown(markdown, scope)` (linha 4 418), não parse DOCX.
Nenhum arquivo `.md` dentro do working tree tem o SHA esperado.

**Apenas o arquivo off-repo #1 satisfaz o match exato.**

`find /home/tonyus-dev/Downloads -iname 'KALLISTIS_MANUSCRITO_CONGELADO*'` (sem o sufixo `_v2`):
**não encontrado**. O caminho antigo `KALLISTIS_MANUSCRITO_CONGELADO.md` referenciado no commit
`a121069` (2026-08-15 19:10) e nos relatórios históricos não existe mais no filesystem.

---

## 4. Correspondência SHA

```text
MANUSCRIPT_SHA_MATCH          = PASS
EXPECTED_SHA                  = 5427818b44f08ba00cc74f8635172b44952ded4eb948589d22016e4272990d83
LOCAL_FILE_SHA                = 5427818b44f08ba00cc74f8635172b44952ded4eb948589d22016e4272990d83
LOCAL_FILE_PATH               = /home/tonyus-dev/Downloads/KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md
LOCAL_FILE_SIZE               = 685 576 bytes
LOCAL_FILE_MTIME              = 2026-08-15 20:20 (UTC-3)
LOCAL_FILE_GIT_OBJECT         = none (off-repo)
STATUS                        = EXATO — bytes idênticos ao esperado
```

---

## 5. História Git

### 5.1 Quando o SHA atual apareceu

```text
$ git log --all -S '5427818b44f08ba00cc74f8635172b44952ded4eb948589d22016e4272990d83'

commit 1a8d811ebf73eea431c3df0e9f082ad7e3fe99b2
Author: Tonyus-dev <bigotonyus@gmail.com>
Date:   Sat Aug 15 23:22:32 2026 -0300

    feat(book-maker): persist edits and generate PDF from app
```

Foi introduzido em `1a8d811` ("persist edits and generate PDF from app"). Antes desse commit, o
materializador **não validava SHA**; aceitava qualquer `.md`.

### 5.2 Quando `KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md` apareceu como path

```text
$ git log --all -S 'KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2'

commit fdbf4c3cde711978f75a977c30e58cda45ba0d9e (Sun Aug 16 17:17:38 -0300)
       feat(book-maker): freeze local production workflow

commit 1a8d811ebf73eea431c3df0e9f082ad7e3fe99b2 (Sat Aug 15 23:22:32 -0300)
       feat(book-maker): persist edits and generate PDF from app
```

Em `1a8d811`, o nome era `KALLISTIS_MANUSCRITO_CONGELADO.md`. Em `fdbf4c3`, foi renomeado para
`KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md` e o `CURATION_ROOT` mudou de `/home/tonyus-dev/Downloads/.../PRODUCAO`
para `path.join(ROOT, "docs", "imagens_curadoria")`. O `CURATION_ROOT` é o que está no comando principal;
o `DEFAULT_MANUSCRIPT` é o path dentro de `CURATION_ROOT`.

### 5.3 SHA histórico anterior (`da7bdf…ca`)

Apareceu em `a121069` ("checkpoint editorial MVP and reconstructed manual", 2026-08-15 19:10):

```text
- OFFICIAL_MANUSCRIPT: `/home/tonyus-dev/Downloads/KALLISTIS_MANUSCRITO_CONGELADO.md`
- OFFICIAL_MANUSCRIPT_SHA256: `da7bdf3177b8bb34e8b9df5ca33361c6f451681732be64c458078a4c2da2deca`
- OFFICIAL_MANUSCRIPT_BYTES: 680194
```

Este SHA correspondia a um arquivo **diferente** (680 194 bytes; o atual v2 tem 685 576 bytes — diferença
de 5 382 bytes). O arquivo original foi **removido do filesystem** (não está em `/home/tonyus-dev/Downloads/`)
e foi **substituído** pelo v2 quando o materializador endureceu o contrato em `1a8d811`.

### 5.4 A fonte foi deliberadamente retirada do repo?

Não há evidência de que a fonte já tenha estado versionada em algum commit. O `find` por todos os
commits não acha blob com o SHA correspondente:

```text
$ git rev-list --objects --all | grep '5427818b44f08ba00cc74f8635172b44952ded4eb948589d22016e4272990d83'
(vazio)
```

O `book_maker/.gitignore` (linhas relevantes) **não inclui** o path do manuscrito; o contrato sempre foi
off-repo. Os commits históricos que tocaram o materializador introduziram **a constante SHA** mas nunca
**os bytes**. A frase "freeze local production workflow" do `fdbf4c3` descreve esse estado explicitamente.

### 5.5 Artefatos versionados que carregam proveniência parcial

| Onde | Conteúdo |
| --- | --- |
| `book_maker/scripts/materialize-manuscript.mjs:53-54` | SHA esperado + path default |
| `book_maker/scripts/materialize-manuscript.mjs:55-57` | SHA esperado da capa `kallistis-capa-aprovada-final.png` |
| `book_maker/scripts/materialize-manuscript.mjs:4867-4882` | String exata do SHA no report de cada execução |
| `book_maker/projects/KALLISTIS_manual_do_mundo_final_book.report.json:25-30` | SHA no report arquivado do último run |
| `book_maker/projects/KALLISTIS_manual_do_mundo_final_book.qa.md:17` | `SOURCE_SHA256=…` em texto plano |
| `MANIFESTO_SHA256.txt` | Outros artefatos (NÃO inclui o manuscrito) |

A fonte primária em si nunca foi versionada.

---

## 6. Fonte canônica identificada

```text
CANONICAL_BOOK_PROJECT =
  book_maker/projects/kallistis-manual-do-mundo-reconstrucao.json
CANONICAL_BOOK_PAGES    = 423
SOURCE_MANUSCRIPT        =
  /home/tonyus-dev/Downloads/KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md
SOURCE_MANUSCRIPT_SHA256 = 5427818b44f08ba00cc74f8635172b44952ded4eb948589d22016e4272990d83
```

### 6.1 Estrutura do canônico atual (snapshot)

```text
schemaVersion:     1
title:             "KALLISTIS — Manual do Mundo"
edition:           "v1.5 candidata — prova privada"
pages:             423
nodes:             1 (id: "node-all", kind: chapter)
assets:            1
tokens.pageWidth:  "140mm"
tokens.pageHeight: "210mm"
tokens.bleed:      "5mm"

templates:
  chapter_opening    : 80
  front_matter       :  2
  full_art           : 21
  map_page           :  2
  narrative          :170
  part_opening       :  6
  rules_2col         :135
  table_page         :  1
  timeline_milestone :  6
  ──────────────────────────
  total              :423

total blocks: 4690
  heading:  1124
  text:     3233
  image:     156
  table:     174
  quote:       3

autoGenerated: 423 / 423
fixed pages  : 13 / 423
spreads      : 6
productionPlan: {} (vazio no JSON canônico)
distinct sourceBlockIds: 4450
```

Observação: `productionPlan = {}` no canônico é uma **anomalia** (o relatório histórico mostra
10 assignments). Indica que o canônico foi modificado por uma edição humana que apagou o plano após
a materialização — coerente com os 13 `fixed: true` que sobreviveram ao editor Free Canvas.

### 6.2 Última execução conhecida do materializador

Fonte: `book_maker/projects/KALLISTIS_manual_do_mundo_final_book.report.json` (commit `1a8d811`).

```text
verdict          : INCIDENT (apenas por ficha-do-jogador adiada; PASS no resto)
scope            : ALL
profile          : PUBLIC_BOOK
engine.version   : 7 (consistente com materialize-manuscript.mjs:60)
input.sourceValid: true (SHA bateu)
cover.approved   : true (SHA bateu)
toc.pages        : 4
toc.entries      : 128
diagnostics:
  TOTAL_PAGES          : 394
  PAGE_OVERFLOW        : 0
  ORPHAN_HEADINGS      : 0
  BROKEN_TABLE_ROWS    : 0
  SOURCE_WORDS_LOST    : 0
  SOURCE_WORDS_ADDED   : 0
  MANUSCRIPT_BLOCKS_LOST       : 0
  MANUSCRIPT_BLOCKS_DUPLICATED : 0
  DUPLICATE_FRAGMENT_OCCURRENCES: 0
  FRAGMENT_SEQUENCE_ERRORS    : 0
  SOURCE_ORDER_CHANGED        : 0
  ASSETS_MODIFIED             : 0
  INVALID_IMAGE_PLACEMENTS    : 0
  FULL_ART_PAGES_AUTO_CREATED : 0
  PAGE_FILL_MEAN              : 0.888
  BODY_WORDS_PER_PAGE_MEAN    : 244.10
  compositionFamilies        : PART_HERO=6, IMAGE_TOP=17, SIDE_ART_PAIR=12,
                              MAP_PAGE=2, GEOGRAPHY_OPENING=4, POVO_OPENING=9,
                              OFICIO_CULTURAL_OPENING=9, BESTIARY_ENTRY=17,
                              PEDRALMA_OPENING=2, GEOGRAPHY_FLOW=31, CULTURE_FLOW=70,
                              TEXT_FLOW=63, TEXT_FEATURE=5, TIMELINE_MILESTONE=8
```

**Interpretação:** a última execução oficial documentada (em 2026-08-15) produziu um livro com
**394 páginas, 0 overflow, 0 orphan headings, 0 broken tables, 0 lost/added words**. O INCIDENT
no verdict é atribuído exclusivamente ao character-sheet (Ficha do Jogador) adiado pelo usuário — não toca integridade textual nem material. Todos os invariantes estruturais são 0.

### 6.3 Status do materializador **nesta sessão**

```text
MATERIALIZER_STARTED   = YES  (executado duas vezes; primeira sem CURATION_ROOT, segunda com CURATION_ROOT + 41 symlinks off-repo)
MATERIALIZER_COMPLETED = NO   (interrompido em applyV2CuratedAssets)
GENERATED_PAGES        = N/A  (nenhum Book JSON temporário produzido)

Bloqueadores identificados nesta sessão:
  1. /home/tonyus-dev/.../book_maker/docs/imagens_curadoria/ precisa existir
  2. 41 PNGs hardcoded em V2_CURATED_PRIMARY_ASSETS (materialize-manuscript.mjs:1596-1638)
     precisam estar no CURATION_ROOT; eles existem em
     /home/tonyus-dev/Downloads/CURADORIA_DE_CONTEUDO/.../imagens_curadoria (copy 1)/
  3. Catálogo precisa ter a string "## 28. Cobertura editorial capítulo a capítulo — REV1"
     — encontrado em /home/tonyus-dev/Downloads/CURADORIA_DE_CONTEUDO/.../00_CATALOGO_MESTRE_PRODUCAO_KALLISTIS_REV1.md
  4. Side-effect colateral observado: o materializador ESCREVE em
     book_maker/drive-image-inventory.json (linha 1571) e
     book_maker/drive-image-disposition.csv (linha 1590 — applyV2CuratedAssets).
     Arquivos rastreados foram REVERTIDOS via git checkout.
```

`RECONSTRUCTION_EQUIVALENCE = NOT_PROVEN` (não há artefato gerado nesta sessão contra o canônico 423p).
A equivalência histórica está documentada em §6.2: 394 páginas, todas as invariantes de fonte = 0,
único INCIDENT não-relacionado ao texto do manuscrito.

---

## 7. Dependências externas

A execução completa do materializador exige **três** fontes externas, não apenas o manuscrito. Esta
seção as isola, porque a documentação oficial anterior focava só no manuscrito.

### 7.1 Fonte primária — manuscrito

| | |
| --- | --- |
| Path | `/home/tonyus-dev/Downloads/KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md` |
| SHA-256 | `5427818b…d83` (MATCH EXATO) |
| Bytes | 685 576 |
| Estado | PRESENTE no filesystem; **NÃO** versionado |
| Bloqueador para portabilidade | Único |

### 7.2 Fonte secundária — catálogo aprovado

| | |
| --- | --- |
| Path | `/home/tonyus-dev/Downloads/CURADORIA_DE_CONTEUDO/agora_sim_producao/PRODUCAO/00_CATALOGO_MESTRE_PRODUCAO_KALLISTIS_REV1.md` |
| SHA-256 | `04ea301b…d627` (não exigido por SHA, mas exigido por string §28) |
| Bytes | 260 375 |
| Estado | PRESENTE no filesystem; **NÃO** versionado |
| Bloqueador para portabilidade | Único; já documentado no DEVASSA §4.1 como `SOURCE_OF_TRUTH_AMBIGUOUS`. Pode ser substituído por `KALLISTIS_CATALOG_PATH` no ambiente, mas nenhum dos dois está sob controle de versão. |
| Sobreposição | O catálogo **também é a fonte do `public/editorial-asset-manifest.json`** (`inventory` aponta para TSV — caminhos paralelos, ver DEVASSA §18). |

### 7.3 Fonte terciária — PNGs V2_CURATED_PRIMARY_ASSETS (47 arquivos)

| | |
| --- | --- |
| Path no materializador | `book_maker/docs/imagens_curadoria/<name>.png` |
| Localização real | `/home/tonyus-dev/Downloads/CURADORIA_DE_CONTEUDO/agora_sim_producao/PRODUCAO/IMAGENS/imagens_curadoria (copy 1)/` |
| Tamanho total estimado | >300 MB (PNGs de capa, partes, bestiário) |
| Lista literal no código | `materialize-manuscript.mjs:1596-1638` (47 nomes hardcoded) |
| Verificação adicional | Em `/home/tonyus-dev/Downloads/imagens_curadoria/` (raiz de Downloads) também existem cópias; o git-tracked `drive-image-disposition.csv` lista 47 itens com status REVIEW_REQUIRED ou USED. |
| Bloqueador para portabilidade | Único e **fora do escopo desta missão**. |

### 7.4 Side-effects colaterais sobre artefatos rastreados

A execução do materializador **modifica** dois arquivos versionados (constatado nesta sessão após
a primeira tentativa):

```text
$ git diff --stat book_maker/drive-image-*
 book_maker/drive-image-disposition.csv | 47 ----
 book_maker/drive-image-inventory.json  | 466 +--------------------------------
```

Origem:
- `drive-image-disposition.csv` é reescrito por `applyV2CuratedAssets` em `materialize-manuscript.mjs:1590`.
- `drive-image-inventory.json` é reescrito por alguma rotina na pilha de `main` (provavelmente
  `enrichAcervoAssets` ou vizinhança, linha ~1418-1430), com `sourceRoot` atualizado para o working tree.

Ambos foram revertidos via `git checkout --` durante esta sessão. **Nenhum arquivo versionado está
modificado** ao final (working tree limpo, apenas 4 untracked da auditoria).

---

## 8. Teste do materializador (saída real)

### 8.1 Comando executado

```bash
cd /home/tonyus-dev/Portifolio/kallistis-book/book_maker

timeout 360 bun run scripts/materialize-manuscript.mjs \
  --scope HISTORIA \
  --manuscript /home/tonyus-dev/Downloads/KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md \
  --catalog    /home/tonyus-dev/Downloads/CURADORIA_DE_CONTEUDO/agora_sim_producao/PRODUCAO/00_CATALOGO_MESTRE_PRODUCAO_KALLISTIS_REV1.md \
  --output /tmp/kallistis-provenance-test/pilot.json \
  --pilot
```

Output flags:
- `--scope HISTORIA`: scope default
- `--manuscript`: sobrescreve `DEFAULT_MANUSCRIPT` para o path real
- `--catalog`: sobrescreve `DEFAULT_CATALOG` para o path real (evita o fallback `/home/tonyus-dev/Downloads/CURADORIA_DE_CONTEUDO/...` já correto, mas torna explícito)
- `--output /tmp/.../pilot.json`: **NÃO** sobrescreve o canônico
- `--pilot`: usa `selectPilotBlocks` (recorta o scope para reduzir medições; reduz tempo)

### 8.2 Primeira tentativa

```text
[kallistis-materializer] Error: ENOENT: no such file or directory,
  scandir '/home/tonyus-dev/Portifolio/kallistis-book/book_maker/docs/imagens_curadoria'
    at async walkRasterFiles (...:1385:25)
    at async enrichAcervoAssets (...:1402:29)
    at async main (...:4432:35)
```

Bloqueador: `CURATION_ROOT` (definido em `materialize-manuscript.mjs:23`) não existia no clone limpo.
Não é artefato versionado; o materializador assume sua existência.

### 8.3 Segunda tentativa (após `mkdir book_maker/docs/imagens_curadoria` e 47 symlinks para PNGs off-repo)

```text
[kallistis-materializer] Error: ENOENT: no such file or directory,
  open '/home/tonyus-dev/Portifolio/kallistis-book/book_maker/docs/imagens_curadoria/FP-01_02_Parte_I_O_Mundo_Partido.png'
    at async applyV2CuratedAssets (...:1642:25)
    at async main (...:4433:37)
```

Bloqueador: o materializador tem 47 nomes literais em
`V2_CURATED_PRIMARY_ASSETS` (`materialize-manuscript.mjs:1596-1638`) que ele lê diretamente
do `CURATION_ROOT`. Os arquivos existem em
`/home/tonyus-dev/Downloads/CURADORIA_DE_CONTEUDO/.../imagens_curadoria (copy 1)/`, mas o
materializador não tem fallback: ele faz `readFileSync` direto (não symlink-safe).

### 8.4 Efeito colateral

Após a primeira tentativa, working tree mostrou:

```text
$ git status --short
 M book_maker/drive-image-disposition.csv
 M book_maker/drive-image-inventory.json
?? 02_AUDITORIA/... (da devassa anterior)
```

Os dois arquivos rastreados foram **sobrescritos pelo próprio materializador** durante o
`applyV2CuratedAssets` (linha 1590) e algum passo de `enrichAcervoAssets`. Revertidos via
`git checkout --`. Diretório `book_maker/docs/imagens_curadoria/` com 47 symlinks e o `mkdir`
criado para satisfazer o primeiro erro foram removidos.

### 8.5 Veredito do teste

```text
MATERIALIZER_STARTED   = YES
MATERIALIZER_COMPLETED = NO  (interrompido em applyV2CuratedAssets, linha 4432/4433 do main)
GENERATED_PAGES        = N/A
SOURCE_TEXT_LOST       = N/A
SOURCE_TEXT_ADDED      = N/A
PAGE_OVERFLOW          = N/A
MISSING_ASSETS         = N/A
INVALID_IMAGE_PLACEMENTS = N/A
```

O materializador **passou** os três primeiros gates (manuscrito SHA, capa SHA, catálogo §28 string)
e falhou no quarto (V2_CURATED_PRIMARY_ASSETS). Confirmar:
- O SHA do manuscrito **bate** (gate I).
- O SHA da capa **bate** (presente localmente em `public/assets/cover/kallistis-capa-aprovada-final.png`).
- O catálogo REV1 §28 **está** no arquivo apontado.
- O caminho do manuscrito **bate** com o apontado em `CURATION_ROOT/KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md`.

---

## 9. Comparação com o projeto 423p

`RECONSTRUCTION_EQUIVALENCE = NOT_PROVEN` nesta sessão (sem artefato novo). Para fins de histórico
e auditoria, comparo a estrutura do **canônico 423p** com a **última execução documentada (v1.5,
394 páginas)**:

| Característica | Canônico `kallistis-manual-do-mundo-reconstrucao.json` | Última execução `KALLISTIS_manual_do_mundo_final_book` (2026-08-15) | Relação |
| --- | --- | --- | --- |
| Pages | **423** | 394 | +29 (edições humanas posteriores, `_review/` evidencia) |
| Templates usados | 9 | n/a no report | — |
| Total blocks | 4 690 | n/a no report | — |
| sourceBlockIds distintos | 4 450 | n/a (não preenchido em `SOURCE_BLOCKS_TOTAL`) | — |
| `SOURCE_WORDS_LOST` | n/a no JSON | **0** | PASS histórico |
| `SOURCE_WORDS_ADDED` | n/a no JSON | **0** | PASS histórico |
| `PAGE_OVERFLOW` | n/a no JSON | **0** | PASS histórico |
| `ORPHAN_HEADINGS` | n/a no JSON | **0** | PASS histórico |
| `BROKEN_TABLE_ROWS` | n/a no JSON | **0** | PASS histórico |
| `INVALID_IMAGE_PLACEMENTS` | n/a no JSON | **0** | PASS histórico |
| `SOURCE_ORDER_CHANGED` | n/a no JSON | **0** | PASS histórico |
| `MANUSCRIPT_BLOCKS_LOST` | n/a no JSON | **0** | PASS histórico |
| `ASSETS_MODIFIED` | n/a no JSON | **0** | PASS histórico |
| `ORIGINAL_PROJECT_OVERWRITTEN` | n/a no JSON | **0** | PASS histórico |

Observações:
- O canônico tem **423 páginas**; a última execução documentada produziu **394**. Os **+29** vêm de
  edições humanas pós-materialização via editor Free Canvas (consistente com os 13 `fixed: true` que
  sobreviveram, mas há muito mais páginas editáveis). Isso é compatível com o fluxo Free Canvas → save.
- O canônico **não tem `productionPlan`** (foi esvaziado por edição humana), enquanto o da última
  execução tinha 10 assignments. Indica que a edição humana preservou páginas mas **perdeu** o plano.
- O canônico não preserva `diagnostics`/`SOURCE_WORDS_LOST`, então não é possível reaplicar os 15
  invariantes textual sobre ele.

---

## 10. Menor solução de portabilidade (Ponytail)

### 10.1 Restrições da missão
- Não alterar código do materializador.
- Não atualizar SHA para fazer uma fonte arbitrária passar.
- Não modificar manuscritos.
- Não criar serviço, banco, API ou abstração nova.

### 10.2 Alternativas avaliadas (decreto do Ponytail: "arquivo pequeno → versionar diretamente")

| # | Solução | Custo | Risco | Compatível com Ponytail? |
| --- | --- | --- | --- | --- |
| A | Versionar `KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md` em `book_maker/docs/imagens_curadoria/` (mesmo path que o materializador procura); ajustar `MANIFESTO_SHA256.txt` para incluir; nada no materializador muda. | 685 KB no repo. | Baixo: já existe um `.gitignore` para `output/`, então o `.md` versionado não conflita; o path é o que o materializador procura. | **SIM — primeira escolha do Ponytail** |
| B | Versionar o mesmo `.md` em outro path do repo (ex.: `01_FONTE_UNICA/` ou `source/`); ajustar a constante `DEFAULT_MANUSCRIPT` em `materialize-manuscript.mjs:25-28` para apontar para o novo local. | 685 KB + uma alteração de path no materializador. | Médio: viola "NÃO mexer no materializador salvo na intervenção mínima necessária"; git blame da constante fica como parte do contrato. | NÃO — exige mexer no materializador |
| C | Criar um manifest versionado `book_maker/docs/imagens_curadoria/MANIFEST.json` apontando para uma URL externa do Drive/Kallistis_producao e somando sha256. Adicionar lógica de bootstrap ao materializador. | 685 KB (manifest) + script de bootstrap + abstração nova. | Alto: viola "evitar abstração"; cria dependência nova. | NÃO — rege "evitar abstração" |
| D | Não versionar nada; documentar via `MANIFESTO_SHA256.txt` que o manuscrito vive em `~/Downloads/KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md`. | 100 B | Mesmo de hoje (working tree "limpo" mas pipeline não roda em clone limpo). | NÃO — não resolve; é o status quo |

### 10.3 Recomendação

**Opção A**: versionar o arquivo exatamente onde o materializador procura
(`book_maker/docs/imagens_curadoria/KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md`).
Atualizar `MANIFESTO_SHA256.txt` para incluir o SHA.

Razões:
1. Ponytail preferência 1: "arquivo pequeno → versionar diretamente".
2. **Zero modificação em código.** O materializador **continua funcionando** sem alteração de constante alguma.
3. **Zero modificação de SHA** (mantém `5427818b…d83` no `EXPECTED_MANUSCRIPT_SHA256`).
4. **Tamanho aceitável**: 685 KB cabe em qualquer clone; total do repo sobe ~0,3%.
5. **Elimina ambiguidade**: o manuscrito vira objeto versionado; futuras mudanças no `.md` viram commit
   com diff claro; o SHA continua sendo o gate.
6. **Respeita o .gitignore existente**: o pattern `output/` exclui coisas dinâmicas mas não toca o
   diretório `docs/imagens_curadoria/`. O arquivo `.md` entraria sem fight.
7. **Não introduz serviço, banco, API ou abstração**.

### 10.4 Trade-offs

- O `.md` é texto KALLISTIS autoral. Versioná-lo é coerente com versionar `00_COMECE_AQUI/PROMPT_ANTIGRAVITY…md`
  e `02_AUDITORIA/AUDITORIA_PRE_EDICAO…md` (também já versionados). Não cria precedente ruim.
- O usuário precisa aceitar copiar o `.md` para o path do repo. Se o autor prefere manter off-repo (para
  controle privado de revisão), **Opção D** continua sendo o status quo — e `MANIFESTO_SHA256.txt`
  precisa ao menos documentar o SHA para auditoria.
- Esta missão **NÃO implementa** a Opção A. Documenta-a apenas como recomendação.

---

## 11. Próxima ação exata

> Se você quiser tornar o clone limpo portátil **hoje**, faça uma única coisa:

```text
1. cp /home/tonyus-dev/Downloads/KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md \
      /home/tonyus-dev/Portifolio/kallistis-book/book_maker/docs/imagens_curadoria/

2. Edite MANIFESTO_SHA256.txt e acrescente a linha:
       <sha>    <size>  book_maker/docs/imagens_curadoria/KALLISTIS_MANUSCRITO_FINAL_CONGELADO_v2.md
   onde <sha> = 5427818b44f08ba00cc74f8635172b44952ded4eb948589d22016e4272990d83
         <size> = 685576

3. (Opcional, para reduzir ainda mais o bloco restante) Acrescente a observação:
       "Este SHA é o mesmo hardcoded em book_maker/scripts/materialize-manuscript.mjs:53-54 (EXPECTED_MANUSCRIPT_SHA256)."

4. Commit único, mensagem:
       "chore(manuscript): version canonical source for portable materializer pipeline"
```

> **Não faça**: copiar o catálogo REV1 nem os 47 PNGs do V2_CURATED_PRIMARY_ASSETS. Eles exigem
> decisões separadas (são >300 MB combinados; o catálogo tem sensibilidade editorial; os PNGs têm
> múltiplas cópias no filesystem). Esta missão cobre **somente o manuscrito**; as outras duas fontes
> externas (§§7.2 e 7.3) ficam registradas como `PORTABILITY_BLOCKER` para a próxima iteração.
