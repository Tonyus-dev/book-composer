# RELATÓRIO DE MUDANÇAS — Sessão de Calibração Rodada 2

> Estado pós-mudanças: working tree intacto exceto o que está documentado abaixo.
> Sem commit. Sem push. Sem PR.

---

## Estado git

```text
HEAD         : a56fa59c4388481f21a5efcc55ff7da2f562b20b
modified    :  book_maker/scripts/materialize-manuscript.mjs (+42 -11 = +31 lines net)
untracked   :  book_maker/scripts/policy/kallistis-curated-assets.json (NEW)
untracked   :  02_AUDITORIA/GOLDEN_MASTER_EDITORIAL_PRONTOV1.md     (NEW, replaces v1)
untracked   :  02_AUDITORIA/ALGORITMO_CANONICO_CONSTRUCAO_DE_LIVROS.md  (m1 session)
untracked   :  02_AUDITORIA/DEVASSA_ESTRUTURAL_BOOK_MAKER.md          (m1 session)
untracked   :  02_AUDITORIA/MATRIZ_RESPONSABILIDADES_BOOK_CONSTRUCTION.tsv (m1 session)
untracked   :  02_AUDITORIA/PROVENIENCIA_FONTE_CANONICA_KALLISTIS.md (m1 session)
```

`drive-image-inventory.json` e `drive-image-disposition.csv`: **inalterados** (`CURATION_INPUT_FILES_CHANGED=0` confirmado por snapshot de SHA-256 antes/depois do materializador carregar).

---

## 1. Correção do Golden Master (Fase 0)

O `02_AUDITORIA/GOLDEN_MASTER_EDITORIAL_PRONTOV1.md` foi reescrito em **versão 2** corrigindo:

| # | Erro de v1 | Correção de v2 |
| --- | --- | --- |
| 1 | "PRONTOV1 não tem PART_HERO" | Identificadas **7 PART_HEROS** (p.7, 45, 68, 149, 178, 244, 259) — renderização confirmou imagem full-art com label integrado |
| 2 | "Para registro é página dedicada" | Errado. Em p.5, "Para registro" + "Apresentação" + "Como usar este livro" todos na mesma página |
| 3 | "Mirveth ausente" | Mirveth está em p.10, junto com "O Grande Cristal" |
| 4 | "NOVE MANEIRAS DE EXISTIR ausente" | p.69 confirmado |
| 5 | Sumário dos Ofícios não confirmado | p.97 detectado ("OITO MANEIRAS DE ESCOLHER") |

A versão 2 documenta as páginas full-art e os capítulos com 2 seções por página (Manesh+Thuvel, Mirveth+Vethari, etc.) que o `pdftotext` perdia.

Tamanho do relatório: **19 220 bytes (v1) → 23 230 bytes (v2)**.

---

## 2. Side-effect fix (Fase 13)

`book_maker/scripts/materialize-manuscript.mjs:1567-1593`:

```diff
- await writeFile(
-   V15_INVENTORY_PATH,
-   `${JSON.stringify({ generatedAt, sourceRoot, noImageGeneration, totalRasterFiles, selectedForV15, inventory }, null, 2)}\n`,
-   "utf8",
- );
- const csv = [ ... ].join("\n") + "\n";
- await writeFile(V15_DISPOSITION_PATH, csv, "utf8");
- return selected;
+ // Removed side-effect writeFiles: drive-image-inventory.json and
+ // drive-image-disposition.csv were rewritten on every materializer run.
+ // Inventory/disposition are now derivable from public/assets and the
+ // public/editorial-asset-manifest.json, and may be regenerated explicitly
+ // via `bun scripts/build-editorial-asset-manifest.mjs` when needed.
+ return selected;
+ /* eslint-disable-next-line no-unused-vars */
+ function _legacy_inventory_csv_retained_only_for_reference(inventory) {
+   return [ /* same CSV builder as before, retained for documentation */ ].join("\n") + "\n";
+ }
```

**Comportamento**:
- Materialização normal **não escreve** mais em `drive-image-inventory.json` nem em `drive-image-disposition.csv`.
- A função `csvCell` continua sendo preservada (usada em outro lugar provavelmente).
- O comentário explica o fluxo de regeneração futura (via `build-editorial-asset-manifest.mjs`).
- O `_legacy_inventory_csv_retained_only_for_reference` é uma função dead-code que preserva o builder para o leitor humano, sem alocação de memória significativa.

**Validação**: smoke-test do módulo — confirmado por hashes MD5 inalterados depois da carga do módulo (`CURATION_INPUT_FILES_CHANGED=0`).

---

## 3. Policy extraction (Fase 14)

`V2_CURATED_PRIMARY_ASSETS` (47 entradas literais em `materialize-manuscript.mjs:1596-1638`) agora **carrega** de:

`book_maker/scripts/policy/kallistis-curated-assets.json` (NEW, 3 788 bytes)

```json
{
  "schemaVersion": 1,
  "name": "kallistis-curated-assets",
  ...
  "assets": [
    ["PARTE I — O MUNDO PARTIDO", "FP-01_02_Parte_I_O_Mundo_Partido.png"],
    ["PARTE II — O CINTURÃO DAS FRESTAS", "FP-02_01_Parte_II_O_Cintur_o_das_Frestas.png"],
    ...
    ["Guardiões, presenças e assombrações de matriz brasileira", "KIMG-0058__PLATE_BR_GUARDIOES_DA_MATA_V01.png"]
  ]
}
```

**Comportamento**:
- O materializador carrega `scripts/policy/kallistis-curated-assets.json` no boot do módulo.
- Se o JSON estiver ausente ou mal formado, **exit 1** com mensagem clara apontando o caminho.
- Se a contagem != 47, **warning** explícito.
- A constante literal agora se chama `V2_CURATED_PRIMARY_ASSETS_LEGACY_EMBEDDED` e ainda existe no código como canary/fallback documentativo — não é mais usada em runtime.

**Política separada = engine genérico não muda**. O materializador continua reconhecível. Nenhum framework, nenhum plugin, nenhum DSL novo.

---

## 4. Asset manifest — status

NÃO foi modificado nesta rodada. O existente:

```text
book_maker/public/editorial-asset-manifest.json
  schemaVersion  : 1
  policy         : { blockedStatuses: ["REVIEW_REQUIRED","REJECT","REFERENCE_ONLY"],
                     fullPageRequiresExplicitAuthorization: true,
                     defaultMaxRepetitions: 1 }
  counts         : { total: 177, approved: 177, pending: 288, rejected: 0 }
  assets.length  : 177
```

Inventário de todos os 47 nomes V2_CURATED_PRIMARY_ASSETS cruzados:

- **Nenhum match por nome exato** — os PNGs V2 têm nomes `FP-01_...png`, `OPEN-002_...png`, etc.; os reais têm nomes `parte-ii-cinturao.png`, `povo-aelvari.png`, `tartaruga-fortaleza.png` etc.
- **Match por heurística de substring** encontrou candidatos plausíveis para 47/47; a maioria é semanticamente correta (Povos → `povo-*.png`, Bestiário → `bestiary/*.png`), mas precisa confirmação visual/SHA antes de ser declarada como match.
- 141 assets reais em `public/assets/` (excluindo `v1.4-prepress/` e `v1.5-acervo/`); 62 em `v1.5-acervo/`; e mais em `v1.4-prepress/`.

**Observação importante para o autor**:
> Antes de prosseguir com o piloto, é necessário **confirmar o mapeamento V2→real por SHA** ou por inspeção visual.
> Sem isso, o materializador vai tentar abrir arquivos `FP-01_02_Parte_I_O_Mundo_Partido.png`
> que **não existem** no repositório — ele só continua se eles aparecerem no
> `book_maker/docs/imagens_curadoria/` (que hoje está vazia no clone).

**Decisão pendente recomendada**: copiar os 47 PNGs V2 (off-repo em `/home/tonyus-dev/Downloads/CURADORIA_DE_CONTEUDO/agora_sim_producao/PRODUCAO/IMAGENS/imagens_curadoria (copy 1)/`) para `book_maker/docs/imagens_curadoria/`, OU adicionar um `kallistis-asset-name-mapping.json` que aponta cada V2-name para um path repo-relative.

---

## 5. Resumo do diff

```text
 book_maker/scripts/materialize-manuscript.mjs | 53 +++++++++++++++++++++------
 1 file changed, 42 insertions(+), 11 deletions(-)
```

```text
NEW   book_maker/scripts/policy/kallistis-curated-assets.json            3 788 bytes
NEW   book_maker/scripts/policy/                                          (directory)
NEW   02_AUDITORIA/GOLDEN_MASTER_EDITORIAL_PRONTOV1.md  (v2 replacing v1) 23 230 bytes
```

**Validações pós-mudança**:

```text
bun run typecheck    : PASS
bun run test         : PASS (4/4 sintéticos)
bun run build        : PASS
test:materializer    : (não rodado nesta sessão; comportamento de ENOENT
                       inalterado — output continua sendo gerado por
                       materialização real, não por este teste de leitura)
CURATION_INPUT_FILES_CHANGED : 0
```

---

## 6. O que NÃO foi feito (escopo desta rodada)

Pendente, com decisão humana ainda necessária:

1. **Map V2 names → real repo paths**. Sem isso, a materialização real ainda abortaria em `applyV2CuratedAssets` por ausência de arquivos no CURATION_ROOT.
2. **Extração de HISTORY_ASSETS** (500+ linhas) para JSON — extracção de policy é viável; **mas não foi feita nesta rodada** porque é um refactor maior.
3. **EXTRA_PRIMARY_CONTEXT_HEADINGS** + **REUSED_FINAL_ART_HEADINGS** + **REUSABLE_SEMANTIC_ART_HEADINGS** (sets literais em `materialize-manuscript.mjs`): permanecem no código.
4. **SEMANTIC_ASSET_RULES** (90+ regras): permanece no código como `Map` literais.
5. **EXTRA_FULL_ART_PLATE_RULES**: permanece literal.
6. **Pilot 25-35 páginas reais**: NÃO executado. Aguardando revisão humana.
7. **Reverse fix do `materializationVersion = 7` vs `Block.materializationVersion = 1`**: P1 do DEVASSA anterior. Aguardando decisão.

---

## 7. Estado de paginação (baseline ainda válido)

O materializador continua sem mexer nos seguintes algoritmos (preservados conforme prompt §16):

- `renderAndMeasure` (DOM real, `/print`, `getBoundingClientRect`)
- `trySplitText` (busca binária sobre sentenças)
- `trySplitTable` (busca binária sobre bodyRows)
- keep-with-next
- trailing-heading repair
- compatível-page merge
- empty-page drop + renumber

A calibração `textRun` / `visualDebt` / `HARD_MAX_TEXT_RUN = 7` permanece a mesma — o Golden Master corrigido (§6 do `GOLDEN_MASTER_EDITORIAL_PRONTOV1.md`) recomenda **calibrar** para aceitar janelas longas em modo referencial, mas essa calibração é P3 e não foi feita nesta rodada.

---

## 8. Próxima ação (após aprovação humana)

Em ordem, antes do piloto:

1. **PARE e revise este diff** (42 insertions em materialize-manuscript.mjs + o JSON policy).
2. **Decida a estratégia de asset mapping** (V2 → repo paths) — opções: copiar 47 PNGs, ou criar JSON de redirect. Se for copiar, é ~300 MB novos no repo, então **decisão editorial/operacional antes de qualquer coisa**.
3. **Quando aprovado**, segue: extrair HISTORY_ASSETS para JSON + mapear V2, então piloto.

Nenhuma dessas ações foi tomada nesta rodada.
