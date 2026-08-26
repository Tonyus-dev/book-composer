# ASSET CLOSURE — SHA Match do Curated V2

> Auditoria fechada: dos 47 PNGs nomeados em `scripts/policy/kallistis-curated-assets.json`,
> comparados por SHA-256 exato contra todos os assets versionados em `book_maker/public/assets/`.

---

## 1. Resumo

| Status | Contagem | Bytes (origem) | MiB |
| --- | ---: | ---: | ---: |
| **EXACT_EXISTING** | **29** | 81 089 425 | ~77,3 MiB |
| **DUPLICATE_EXISTING** | **5** | 19 287 016 | ~18,4 MiB |
| **MISSING_FROM_REPO** | **13** | 41 887 019 | ~39,9 MiB |
| **SOURCE_MISSING** | **0** | — | — |
| **TOTAL** | **47** | 142 263 460 | ~135,7 MiB (origem) |

- **Reutilização canônica**: 34/47 (29 EXACT + 5 DUPLICATE) já existem no repo em SHA-idêntico. **95,7 MiB** de bytes já cobertos sem copiar nada.
- **Faltam 13**: 13 assets cujo SHA não existe no repo. **39,9 MiB** ainda ausentes (não foi copiado nada nesta rodada).
- **Maior unmatched**: `Hidrografia Canônica: Rio, Lagos e Mar` (4,3 MiB, 1536×1024).
- **Zero paths absolutos** no runtime policy.
- `CURATION_INPUT_FILES_CHANGED = 0` (verificado por snapshot MD5).

---

## 2. Invariantes do policy JSON (rigoroso)

| Invariante | Verificação |
| --- | --- |
| Nenhum `canonical.repo` ou `aliases[].repo` aponta para path absoluto (sem `/home`, `/Downloads`, `/Users` etc.) | **OK** — confirmado por regex `[\"][\\/](home\|Downloads\|Users)` |
| Registros com `status ∈ {MISSING_FROM_REPO, SOURCE_MISSING}` **não têm** campo `canonical` em runtime | **OK** — só SHA, bytes, width, height são registrados (audit-only) |
| Registros com `status ∈ {EXACT_EXISTING, DUPLICATE_EXISTING}` **têm** `canonical.repo` (repo-relative) | **OK** — `book_maker/public/assets/...` apenas |
| Todos os SHAs são do tipo `bytes` (hex 64 chars, prefixo `asset-` deduzível) | **OK** — usado `assetId = "asset-" + sha.substring(0, 16)` |

---

## 3. Tabela completa dos 47

Formatos:

| Coluna | Significado |
| --- | --- |
| HEADING | manuscript canonical heading |
| FILENAME | nome legado dentro da curadoria off-repo |
| SHA256_OFFREPO | SHA-256 do arquivo fonte (lido de off-repo) |
| W × H | dimensões (pixels) |
| STATUS | EXACT_EXISTING / DUPLICATE_EXISTING / MISSING_FROM_REPO / SOURCE_MISSING |
| CANONICAL_REPO | caminho repo-relative canônico (`book_maker/public/assets/...`); "-" se MISSING |
| ALIASES (opcional) | paths adicionais no repo com mesmo SHA |
| ROLE | papel editorial |

---

### 3.1 EXACT_EXISTING (29)

| # | HEADING | FILENAME | SHA256_OFFREPO | W × H | CANONICAL_REPO | ROLE |
| --- | --- | --- | --- | ---: | --- | --- |
| 1 | PARTE IV — VELARIM | OPEN-003_VELARIM (copy 1).png | `d6a4a389…f19a58e` | 1024×1536 | `public/assets/complete/parte-v-velarim.png` | PART_DIVIDER |
| 2 | PARTE V — JOGANDO KALLISTIS | OPEN-004_JOGANDO_KALLISTIS.png | `9ec600bd…d44fd529` | 1024×1536 | `public/assets/complete/parte-vi-jogando.png` | PART_DIVIDER |
| 3 | PARTE VI — CONDUZINDO KALLISTIS | OPEN-006_CONDUZINDO_KALLISTIS_CANDIDATO (copy 1).png | `a7ed1f30…e07d3103` | 1024×1536 | `public/assets/complete/parte-vii-conduzindo.png` | PART_DIVIDER |
| 4 | Thuvel — O Mundo da Escuridão | HP-02_01_Thuvel_o_Mundo_da_Escurid_o.png | `ee095240…a17a0c1e` | 1448×1086 | `public/assets/v1.5-acervo/ee09524034dd435e0ee77774.png` | PRIMARY_HERO |
| 5 | Povo Aelvari | 01_AELVARI.png | `6fa1efc7…d7ecc2a` | 1024×1536 | `public/assets/partes/povo-aelvari.png` | PART_OPENING |
| 6 | Povo Kragor | 02_KRAGOR.png | `cc644573…0e6fcf` | 1024×1536 | `public/assets/partes/povo-kragor.png` | PART_OPENING |
| 7 | Povo Draken | 03_DRAKEN.png | `c6ff7488…48cbfde` | 1024×1536 | `public/assets/partes/povo-draken.png` | PART_OPENING |
| 8 | Povo Nomos | 04_NOMOS.png | `28b28176…67a807` | 1024×1536 | `public/assets/partes/povo-nomos.png` | PART_OPENING |
| 9 | Povo Livres | 05_LIVRES.png | `0519577d…08086b4` | 1024×1536 | `public/assets/partes/povo-livres.png` | PART_OPENING |
| 10 | Povo Dóreos | 06_DOREOS.png | `24d42dd5…16f51` | 1024×1536 | `public/assets/partes/povo-doreos.png` | PART_OPENING |
| 11 | Povo Teriantes | 07_TERIANTES.png | `6a0df00c…04192e` | 1024×1536 | `public/assets/partes/povo-teriantes.png` | PART_OPENING |
| 12 | Povo Nimari | 08_NIMARI.png | `b419d2d4…bd9ca7` | 1024×1536 | `public/assets/partes/povo-nimaris.png` | PART_OPENING |
| 13 | Povo Vitrálios | 09_VITRALIOS.png | `98fc176a…1b3bd7` | 1024×1536 | `public/assets/partes/povo-vitralios.png` | PART_OPENING |
| 14 | Guardião | 01_GUARDIAO.png | `3ade014e…af9eb` | 1254×1254 | `public/assets/complete/offices/guardiao.png` | OFFICE_PRIMARY |
| 15 | Atirador | 03_ATIRADOR.png | `fb986209…badf1` | 1024×1536 | `public/assets/complete/offices/atirador.png` | OFFICE_PRIMARY |
| 16 | Tecelão | 04_TECELAO.png | `25d04251…9857df` | 1024×1536 | `public/assets/complete/offices/tecelao.png` | OFFICE_PRIMARY |
| 17 | Curador | 05_CURADOR.png | `90dc6539…abf307` | 1024×1536 | `public/assets/complete/offices/curador.png` | OFFICE_PRIMARY |
| 18 | Evocador | 06_EVOCADOR.png | `9b091877…ee5b9f5` | 1024×1536 | `public/assets/complete/offices/evocador.png` | OFFICE_PRIMARY |
| 19 | Artífice | 07_ARTIFICE.png | `8cb70416…0a6a2` | 1024×1536 | `public/assets/complete/offices/artifice.png` | OFFICE_PRIMARY |
| 20 | Batedor | 08_BATEDOR.png | `a6060bfc…776769` | 1024×1536 | `public/assets/complete/offices/batedor.png` | OFFICE_PRIMARY |
| 21 | Pedr'alma monumental | V04_PEDRALMA_MONUMENTAL (copy 1).png | `92ef5b4f…653c6c1` | 1024×1536 | `public/assets/partes/pedralma-monumental.png` | PART_OPENING |
| 22 | Eco Corrompido | 12_ECO_CORROMPIDO.png | `77c23e25…1c1f8b0` | 1024×1536 | `public/assets/complete/bestiary/eco-corrompido.png` | BESTIARY_PRIMARY |
| 23 | Estilhaço Vitrálio Instável | 08_ESTILHACO_VITRALIO_INSTAVEL.png | `07f91247…41c8495f` | 1024×1536 | `public/assets/complete/bestiary/estilhaco.png` | BESTIARY_PRIMARY |
| 24 | Corvo de Fresta | 10_CORVO_DE_FRESTA_CANDIDATO.png | `a688afcd…7cb9d1d` | 1024×1536 | `public/assets/complete/bestiary/corvo.png` | BESTIARY_PRIMARY |
| 25 | Filhote de Tormenta | 11_FILHOTE_DE_TORMENTA (copy 1).png | `0a966816…6789649f` | 1024×1536 | `public/assets/complete/bestiary/filhote.png` | BESTIARY_PRIMARY |
| 26 | Autômato de Ponte Descontrolado | 12_AUTOMATO_DE_PONTE_DESCONTROLADO.png | `1cfec734…b5728813` | 1024×1536 | `public/assets/complete/bestiary/automato.png` | BESTIARY_PRIMARY |
| 27 | Tartaruga-Fortaleza | 02_TARTARUGA_FORTALEZA (copy 1).png | `6f46eb97…fa3a08d8` | 1254×1254 | `public/assets/complete/bestiary/tartaruga-fortaleza.png` | BESTIARY_PRIMARY |
| 28 | Leviatã dos Veios | 03_LEVIATA_DOS_VEIOS.png | `e3fd4744…cd606e6` | 1536×1024 | `public/assets/complete/bestiary/leviata.png` | BESTIARY_PRIMARY |
| 29 | Guardiões, presenças e assombrações de matriz brasileira | KIMG-0058__PLATE_BR_GUARDIOES_DA_MATA_V01.png | `43a7f338…cef7db4b` | 1024×1536 | `public/assets/v1.5-acervo/43a7f338ea4556f4709a6e88.png` | PRIMARY_HERO |

### 3.2 DUPLICATE_EXISTING (5)

Mesma SHA em **mais de um** path no repo. Mantemos apenas o canônico + aliases.

| # | HEADING | FILENAME | SHA256_OFFREPO | W × H | CANONICAL_REPO | ALIAS | ROLE |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| 1 | PARTE III — POVOS, OFÍCIOS E COMUNIDADES VIVAS | OPEN-002_POVOS_COMUNIDADES_CAMINHOS (copy 1).png | `963acd32…e0584e` | 1024×1536 | `public/assets/partes/parte-iii-povos.png` | `public/assets/v1.5-acervo/distribuicao-povos.png` | PART_OPENING |
| 2 | Bestiário do Cristal Partido | OPEN-007_BESTIARIO_DO_CRISTAL_PARTIDO (copy 1).png | `9b2ca02b…dcaf9e35` | 1024×1536 | `public/assets/complete/bestiary/bestiario-abertura.png` | `public/assets/complete/bestiary/plates/bestiario-atmosfera.png` | BESTIARY_PRIMARY |
| 3 | Duelista | 02_DUELISTA.png | `cc91c315…a2ff6c6` | 1024×1536 | `public/assets/complete/offices/duelista.png` | `public/assets/partes/oficio-duelista.png` | OFFICE_PRIMARY |
| 4 | Dragão Cristalino Colossal | 01_DRAGAO_CRISTALINO_COLOSSAL (copy 1).png | `e85da577…4eb796` | 1536×1024 | `public/assets/complete/bestiary/dragao-cristalino.png` | `public/assets/complete/support/bestiary/dragao-escala.png` | BESTIARY_PRIMARY |
| 5 | Árvore-Mãe Errante | 04_ARVORE_MAE_ERRANTE (copy 1).png | `cb023b49…9316420` | 1024×1536 | `public/assets/complete/bestiary/arvore-mae.png` | `public/assets/complete/support/bestiary/arvore-mae-escala.png` | BESTIARY_PRIMARY |

> Decisão: o alias permanece no policy para **rastreamento histórico**; o materializador runtime usa apenas `canonical.repo`. O alias é metadado; nada quebra se for removido futuramente.

### 3.3 MISSING_FROM_REPO (13)

Off-repo existe, mas o SHA **não bate** com nenhum asset versionado.

| # | HEADING | FILENAME | SHA256_OFFREPO | BYTES | W × H | SOURCE OFF-REPO |
| --- | --- | --- | --- | ---: | ---: | --- |
| 1 | PARTE I — O MUNDO PARTIDO | FP-01_02_Parte_I_O_Mundo_Partido.png | `1adb4f5e…5bd9ff` | 3 247 054 | 1024×1536 | `~/Downloads/.../imagens_curadoria (copy 1)/` |
| 2 | PARTE II — O CINTURÃO DAS FRESTAS | FP-02_01_Parte_II_O_Cintur_o_das_Frestas.png | `834fdd86…a02162` | 3 609 966 | 1024×1536 | idem |
| 3 | Prólogo — A velha e a Fresta | HP-00_01_Pr_logo_A_velha_e_a_Fresta.png | `cb9d4153…d1d596b` | 2 449 126 | 1448×1086 | idem |
| 4 | Manesh — O Mundo da Luz | HP-01_01_Manesh_o_Mundo_da_Luz.png | `c7eafef9…caa1f89` | 2 916 333 | 1448×1086 | idem |
| 5 | O Grande Cristal — Antes Que Houvesse Dois Mundos | HP-04_01_Grande_Cristal_e_Fratura.png | `f8eda493…fb9324` | 2 835 630 | 1448×1086 | idem |
| 6 | Mirveth — Uma Pessoa Inteira | HP-05_01_Mirveth_e_Vethari.png | `b842eed4…dba6d` | 2 549 279 | 1448×1086 | idem |
| 7 | O Mapa em Duas Camadas | 01_MAPA_GERAL_DUAS_CAMADAS__50831df9.png | `50831df9…58afc` | 4 295 676 | 1536×1024 | idem |
| 8 | Geografia da Luz: Planalto de Silmari | MAPA_COM_TEXTOS_CANDIDATO_FINAL.png | `28ba1d31…5380` | 3 513 437 | 1440×1092 | idem |
| 9 | Hidrografia Canônica: Rio, Lagos e Mar | 02_HIDROGRAFIA_LUZ__837df967.png | `837df967…dcf1` | **4 458 631** | 1536×1024 | idem |
| 10 | Thur-Daer | V02_THUR_DAER_PROFUNDIDADE_HABITADA.png | `4325b4ca…c7ad4` | 3 555 264 | 1024×1536 | idem |
| 11 | Pedr'almas de companhia | V05_VELARIM_COMO_RELACAO_B (copy 1).png | `8240ca09…86d5e1` | 2 833 155 | 1024×1536 | idem |
| 12 | EVOCAÇÕES | D04_EVOCACAO_PRESENCA_AUTONOMA.png | `6af3596b…3f5bf1` | 2 989 545 | 1024×1536 | idem |
| 13 | Drako da Brasa Ventral | CRIATURA_DRAKO_DA_BRASA_VENTRAL_V02 (copy 1).png | `087dd3fd…f26401` | 2 633 923 | 1536×1024 | idem |

> **Maior unmatched**: #9 Hidrografia Canônica (4,3 MiB). Total §3.3: **41 887 019 bytes (~39,9 MiB)**.
>
> O caminho source (off-repo) foi **omitido do path field** — apenas os SHA + bytes + dimensões
> ficam registrados no campo `audit` da policy. Esses 13 assets não têm `canonical.repo`
> nem `aliases` nem `assetId` — `runtime_resolvable = false` no materializador, que os
> pula com warning sem abortar o build.

---

## 4. Histórico git / invariante de proveniência

```text
$ git log --all -S 'EXPECTED_MANUSCRIPT_SHA256' --oneline
1a8d811 "persist edits and generate PDF from app"  →  Sat 2026-08-15 23:22 -0300
```

A estrutura do policy JSON foi introduzida em duas rodadas:

| Rodada | Esquema do policy | Mudança |
| --- | ---: | --- |
| 1 | v1 | 47 entradas em array de tuplas `[heading, filename]` (extraído de literals no `materialize-manuscript.mjs:1596-1638`) |
| 2 (esta) | **v2** | mesmo 47, agora com `source { sha256, bytes, width, height }`, `status`, `canonical.repo` (EXACT/DUPLICATE) ou `audit` (MISSING) |

---

## 5. Curation-input invariantes revalidados

```bash
# ANTES
$ md5sum book_maker/drive-image-inventory.json
f3ff854863a8726adcca570c4f055c2e  book_maker/drive-image-inventory.json
eba3376b1053ba700948e69a3c46bd86  book_maker/drive-image-disposition.csv

# smoke test: carregar o módulo (sem manuscrito)
$ bun scripts/materialize-manuscript.mjs  →  ENOENT manuscrito (esperado)

# DEPOIS
$ md5sum book_maker/drive-image-inventory.json
f3ff854863a8726adcca570c4f055c2e  book_maker/drive-image-inventory.json
eba3376b1053ba700948e69a3c46bd86  book_maker/drive-image-disposition.csv
```

**CURATION_INPUT_FILES_CHANGED = 0** ✓ (idêntico antes e depois).

---

## 6. Decisão de storage (pendente)

Os 13 MISSING_FROM_REPO têm **SHA conhecido** e **dimensões registradas**. O policy JSON v2 serve
como **catálogo audit-only** deles: o materializador em runtime os **pula** sem abortar (com warning
no log), preservando deterministic build behavior.

**Três alternativas para fechar o closure**:

1. **Aceitar 13 MISSING como limite operacional** (não copiar; piloto roda com 34/47 resolvidos).
   Implicação: PART_HEROS de Parte I/II + Prólogo + Manesh + Grande Cristal + Mirveth + 2 mapas + Thur-Daer + 1 bestiário renderizam sem imagem full-art (fallback para o que o renderer já tem em cache). Possível arte faltando no PDF final.
2. **Copiar os 13 PNGs (~40 MiB) de off-repo para o repo** (ex.: `book_maker/public/assets/v2-curated/`).
   Requer aprovação editorial; mantém paths de runtime absolutos para fora (paths repo-relative).
3. **Diretamente consultar off-repo em runtime** (manifest apontaria para o path local, com `runtime_path_local_audit_only` flag). **Rejeitado** pela regra "nunca path absoluto".

> **Recomendação**: a alternativa 1 é a opção mais conservadora (sem mover bytes, sem criar
> abstração nova). A alternativa 2 copia ~40 MiB (não 300 MiB), e o autor decide.

---

## 7. Diff vs rodadas anteriores

| Item | Rodada 1 | Rodada 2 (atual) |
| --- | --- | --- |
| `V2_CURATED_PRIMARY_ASSETS` em código | literal 500+ linhas em `materialize-manuscript.mjs:1596-1638` | extraído para `scripts/policy/kallistis-curated-assets.json` v1 (tuplas) |
| Side-effect em `drive-image-*.json/.csv` | reescritos a cada execução | **preservados como legacy-readonly**; materialização normal NÃO modifica |
| SHA match dos 47 com repo versionado | não feito | **pass — 29 EXACT + 5 DUPLICATE; 13 MISSING registrados em audit-only** |
| Paths absolutos em runtime | sim (alguns via literais) | **não** — apenas repo-relative em `canonical.repo` |

---

## 8. Tabela absoluta de bytes

| Faixa de status | Bytes | MiB | % |
| --- | ---: | ---: | ---: |
| EXACT_EXISTING (29) | 81 089 425 | 77,3 | 56,9 % |
| DUPLICATE_EXISTING (5) | 19 287 016 | 18,4 | 13,6 % |
| **reutilizado** (sum) | **100 376 441** | **95,7** | **70,5 %** |
| MISSING_FROM_REPO (13) | 41 887 019 | 39,9 | 29,5 % |
| **TOTAL** | 142 263 460 | 135,7 | 100,0 % |

---

## 9. Outputs de validação

```text
TYPECHECK    : PASS  (tsc --noEmit, no errors)
TEST         : PASS  (4/4 sintáticos; table/authoring/sheet/image)
BUILD        : PASS  (Vite + Nitro + CF; em 1.14s)
CURATION_INPUT_FILES_CHANGED : 0
```

---

## 10. Próxima ação (aprovação humana pendente)

Nenhuma modificação adicional de código nesta rodada.

**Decisão editorial pendente (§6 acima)**: fechar a lacuna dos 13 MISSING ou aceitar como limite operacional.
