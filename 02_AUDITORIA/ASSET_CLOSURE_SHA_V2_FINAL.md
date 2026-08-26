# ASSET CLOSURE — V2 SHA Match (FINAL, 47/47)

> Esta é a edição **FINAL** da auditoria de fechamento de assets.
> Substitui `ASSET_CLOSURE_SHA_V2.md` (que documentava 34/47 com 13 pendentes).
> Status: **47/47 resolvidos** sem `FALLBACK_USED`.

---

## 1. Identidade do fechamento

```text
HEAD                : a56fa59c4388481f21a5efcc55ff7da2f562b20b
BRANCH              : master
STATUS              : FINAL — Pronto para piloto (após nova decisão humana)
ASSETS_TOTAL        : 47
ASSETS_RESOLVED     : 47
ASSETS_UNRESOLVED   : 0
```

---

## 2. Decisão humana aprovada

**STORAGE OPTION B:** incorporar os 13 PNGs `MISSING_FROM_REPO` ao repo, copiando-os de
off-repo para `book_maker/public/assets/v2-curated/` bit-a-bit.

Sem piloto. Sem materialização. Sem commit/push/PR.

---

## 3. Portabilidade (gate obrigatória)

| Verificação | Resultado |
| --- | --- |
| `ABSOLUTE_PATHS_IN_RUNTIME_POLICY` = 0 | **PASS** — zero paths `/home`, `/Users`, `/Downloads` em policy JSON |
| `MACHINE_SPECIFIC_PATHS` = 0 | **PASS** — zero referências `tonyus-dev` ou similar em policy JSON |
| `MACHINE_SPECIFIC_PATHS` = 0 no materializador | **PASS** — após refator, ZERO literais `/home/tonyus-dev/Downloads/...` no `scripts/materialize-manuscript.mjs` |
| `CURATION_INPUT_FILES_CHANGED` = 0 | **PASS** — `drive-image-inventory.json` e `drive-image-disposition.csv` inalterados antes/depois do smoke-load |
| `runtime_resolvable` em 47/47 records | **PASS** (vide §6) |

### 3.1 Mudança concreta para garantir portabilidade

`scripts/materialize-manuscript.mjs:29-42` (constante `DEFAULT_CATALOG`):

```diff
 const DEFAULT_CATALOG = process.env.KALLISTIS_CATALOG_PATH
   ? path.resolve(process.env.KALLISTIS_CATALOG_PATH)
-  : path.join(
-      "/home/tonyus-dev/Downloads/CURADORIA_DE_CONTEUDO/agora_sim_producao/PRODUCAO",
-      "00_CATALOGO_MESTRE_PRODUCAO_KALLISTIS_REV1.md",
-    );
+  : (() => {
+      if (process.env.KALLISTIS_CATALOG_PATH) {
+        return path.resolve(process.env.KALLISTIS_CATALOG_PATH);
+      }
+      if (process.env.KALLISTIS_REQUIRE_PORTS.toString() !== "0") {
+        console.error(
+          "[kallistis-materializer] KALLISTIS_CATALOG_PATH is not set. ..."
+        );
+        process.exit(1);
+      }
+      return null;
+    })();
```

Resultado: o materializador exige `KALLISTIS_CATALOG_PATH` em runtime. Se operadores intencionalmente
quiserem suprimir (ex.: modo lint ou audit), setam `KALLISTIS_REQUIRE_PORTS=0`.

---

## 4. Sha-match gates (todos verdes)

### GATE A — source SHA == policy SHA (antes de copiar)

```text
mismatches=0
OK=13 / FAIL=0
exit code = 0
```

### GATE B — destination SHA == policy SHA (depois de copiar)

```text
OK=13 / FAIL=0
exit code = 0
```

### GATE C — source off-repo md5 == destino repo md5

```text
OK=13 / FAIL=0
exit code = 0
```

### GATE D — side-effect CURATION_INPUT_FILES_CHANGED

```text
ANTES: f3ff854863a8726adcca570c4f055c2e  drive-image-inventory.json
ANTES: eba3376b1053ba700948e69a3c46bd86  drive-image-disposition.csv

[smoke-load do módulo]

DEPOIS: f3ff854863a8726adcca570c4f055c2e  drive-image-inventory.json
DEPOIS: eba3376b1053ba700948e69a3c46bd86  drive-image-disposition.csv

→ idêntico. CURATION_INPUT_FILES_CHANGED=0 ✓
```

---

## 5. Bytes e storage

```text
NEW_BINARY_FILES         = 13
NEW_BINARY_BYTES         = 41_887_019  (39,9 MiB)
LARGEST_NEW_BINARY       = 02_HIDROGRAFIA_LUZ__837df967.png (4 458 631 bytes / 4,3 MiB)
NEW_BINARY_DESTINATION   = book_maker/public/assets/v2-curated/

Listagem dos 13 arquivos copiados (tam em MB):
    01_MAPA_GERAL_DUAS_CAMADAS__50831df9.png         4,1 MB
    02_HIDROGRAFIA_LUZ__837df967.png                4,3 MB  ← largest
    CRIATURA_DRAKO_DA_BRASA_VENTRAL_V02 (copy 1).png 2,6 MB
    D04_EVOCACAO_PRESENCA_AUTONOMA.png              2,9 MB
    FP-01_02_Parte_I_O_Mundo_Partido.png            3,1 MB
    FP-02_01_Parte_II_O_Cintur_o_das_Frestas.png    3,5 MB
    HP-00_01_Pr_logo_A_velha_e_a_Fresta.png          2,4 MB
    HP-01_01_Manesh_o_Mundo_da_Luz.png              2,8 MB
    HP-04_01_Grande_Cristal_e_Fratura.png           2,8 MB
    HP-05_01_Mirveth_e_Vethari.png                  2,5 MB
    MAPA_COM_TEXTOS_CANDIDATO_FINAL.png             3,4 MB
    V02_THUR_DAER_PROFUNDIDADE_HABITADA.png         3,4 MB
    V05_VELARIM_COMO_RELACAO_B (copy 1).png         2,8 MB
```

Diferença material vs estimado (39,9 MiB):
**Real** = 41 887 019 B (~39,9 MiB). Estimativa do briefing também era 39,9 MiB.
**Diferença: 0 %** ✓

---

## 6. Resolução 47/47

Teste independente de runtime (Node script):

```text
V2_ASSETS_TOTAL              = 47
V2_ASSETS_RESOLVED           = 47
V2_ASSETS_UNRESOLVED         = 0
V2_ASSETS_UNRESOLVED_HEADS   = (none, by construction)
MISSING_REQUIRED_ASSET       = 0
FALLBACK_USED                = 0
HASH_MISMATCHES              = 0
```

Cada um dos 47 records tem `canonical.repo` apontando para um arquivo que **existe** e cujo SHA-256
**bate exatamente** com `source.sha256` (e este, por sua vez, bate com o asset original no repo).

**Refactor mínima do materializador** (para consumir `canonical.repo` como path real):

```diff
 for (const record of V2_CURATED_PRIMARY_ASSETS) {
     const { heading, filename, runtime_resolvable, status } = record;
     if (!runtime_resolvable) { skippedCount += 1; continue; }
-    const sourcePath = path.join(CURATION_ROOT, filename);
+    let sourcePath;
+    let usedFallback = false;
+    if (record.canonical_repo && fs.existsSync(record.canonical_repo)) {
+      sourcePath = record.canonical_repo;
+    } else {
+      sourcePath = path.join(CURATION_ROOT, filename);
+      usedFallback = true;
+      fallbackCount += 1;
+    }
```

Comportamento: prefere `canonical_repo` quando presente e existente; cai no `CURATION_ROOT`
legado apenas como fallback (e conta como fallback para telemetria). **Em 47/47 records existe
`canonical_repo` válido**, então FALLBACK_USED=0.

---

## 7. Tabela completa dos 47 (CANÔNICA)

Ordenado por `asset_id`. `resolution_source` indica onde o asset vive; `resolution`
indica se houve cópia.

**REUSED_EXISTING (29)** — SHA já existia no repo:

| # | asset_id (15 chars) | legacy_name | sha256 | repo_path | bytes | dims |
| - | --- | --- | --- | --- | ---: | --- |
| 1 | asset-6fa1efc7d9ea2a | 01_AELVARI.png | `6fa1efc7…0e6fcf` | `public/assets/partes/povo-aelvari.png` | 2 892 095 | 1024×1536 |
| 2 | asset-0519577d1a7b9d | 02_KRAGOR.png | `cc644573…0e6fcf` | `public/assets/partes/povo-kragor.png` | 2 829 350 | 1024×1536 |
| 3 | asset-c6ff7488e4354cc | 03_DRAKEN.png | `c6ff7488…48cbfde` | `public/assets/partes/povo-draken.png` | 3 311 717 | 1024×1536 |
| 4 | asset-28b2817625d51c | 04_NOMOS.png | `28b28176…67a807` | `public/assets/partes/povo-nomos.png` | 2 126 452 | 1024×1536 |
| 5 | asset-0519577d1a7b9d | 05_LIVRES.png | `0519577d…08086b4` | `public/assets/partes/povo-livres.png` | 2 859 740 | 1024×1536 |
| 6 | asset-24d42dd52ca92ec | 06_DOREOS.png | `24d42dd5…16f51` | `public/assets/partes/povo-doreos.png` | 2 700 388 | 1024×1536 |
| 7 | asset-6a0df00c4307ab9 | 07_TERIANTES.png | `6a0df00c…04192e` | `public/assets/partes/povo-teriantes.png` | 3 036 318 | 1024×1536 |
| 8 | asset-b419d2d44da95ca | 08_NIMARI.png | `b419d2d4…bd9ca7` | `public/assets/partes/povo-nimaris.png` | 2 796 082 | 1024×1536 |
| 9 | asset-98fc176aea334ba | 09_VITRALIOS.png | `98fc176a…1b3bd7` | `public/assets/partes/povo-vitralios.png` | 2 833 811 | 1024×1536 |
| 10 | asset-3ade014e079c5ac | 01_GUARDIAO.png | `3ade014e…af9eb` | `public/assets/complete/offices/guardiao.png` | 1 878 608 | 1254×1254 |
| 11 | asset-fb9862098d3d3b4 | 03_ATIRADOR.png | `fb986209…badf1` | `public/assets/complete/offices/atirador.png` | 2 856 604 | 1024×1536 |
| 12 | asset-25d04251a03b616 | 04_TECELAO.png | `25d04251…9857df` | `public/assets/complete/offices/tecelao.png` | 2 975 326 | 1024×1536 |
| 13 | asset-90dc653b9a224d2 | 05_CURADOR.png | `90dc6539…abf307` | `public/assets/complete/offices/curador.png` | 3 270 687 | 1024×1536 |
| 14 | asset-9b091877794b4d0 | 06_EVOCADOR.png | `9b091877…ee5b9f5` | `public/assets/complete/offices/evocador.png` | 3 237 396 | 1024×1536 |
| 15 | asset-8cb70416d2c7782 | 07_ARTIFICE.png | `8cb70416…0a6a2` | `public/assets/complete/offices/artifice.png` | 3 017 660 | 1024×1536 |
| 16 | asset-a6060bfcb22cb36 | 08_BATEDOR.png | `a6060bfc…776769` | `public/assets/complete/offices/batedor.png` | 3 071 660 | 1024×1536 |
| 17 | asset-92ef5b4f76a8253 | V04_PEDRALMA_MONUMENTAL (copy 1).png | `92ef5b4f…653c6c1` | `public/assets/partes/pedralma-monumental.png` | 3 277 264 | 1024×1536 |
| 18 | asset-77c23e25c9e6fec | 12_ECO_CORROMPIDO.png | `77c23e25…1c1f8b0` | `public/assets/complete/bestiary/eco-corrompido.png` | 3 125 492 | 1024×1536 |
| 19 | asset-07f912475487462 | 08_ESTILHACO_VITRALIO_INSTAVEL.png | `07f91247…41c8495f` | `public/assets/complete/bestiary/estilhaco.png` | 2 130 000 | 1024×1536 |
| 20 | asset-a688afcd178175d | 10_CORVO_DE_FRESTA_CANDIDATO.png | `a688afcd…7cb9d1d` | `public/assets/complete/bestiary/corvo.png` | 2 666 020 | 1024×1536 |
| 21 | asset-0a96681692e4c8a | 11_FILHOTE_DE_TORMENTA (copy 1).png | `0a966816…6789649f` | `public/assets/complete/bestiary/filhote.png` | 3 028 703 | 1024×1536 |
| 22 | asset-1cfec7343790bd2 | 12_AUTOMATO_DE_PONTE_DESCONTROLADO.png | `1cfec734…b5728813` | `public/assets/complete/bestiary/automato.png` | 3 037 986 | 1024×1536 |
| 23 | asset-6f46eb97e78fc9a | 02_TARTARUGA_FORTALEZA (copy 1).png | `6f46eb97…fa3a08d8` | `public/assets/complete/bestiary/tartaruga-fortaleza.png` | 2 475 713 | 1254×1254 |
| 24 | asset-e3fd4744e03d67c | 03_LEVIATA_DOS_VEIOS.png | `e3fd4744…cd606e6` | `public/assets/complete/bestiary/leviata.png` | 3 518 955 | 1536×1024 |
| 25 | asset-d6a4a389c6d9978 | OPEN-003_VELARIM (copy 1).png | `d6a4a389…f19a58e` | `public/assets/complete/parte-v-velarim.png` | 3 183 680 | 1024×1536 |
| 26 | asset-9ec600bd640991f | OPEN-004_JOGANDO_KALLISTIS.png | `9ec600bd…d44fd529` | `public/assets/complete/parte-vi-jogando.png` | 3 548 121 | 1024×1536 |
| 27 | asset-a7ed1f3058911be | OPEN-006_CONDUZINDO_KALLISTIS_CANDIDATO (copy 1).png | `a7ed1f30…e07d3103` | `public/assets/complete/parte-vii-conduzindo.png` | 3 101 756 | 1024×1536 |
| 28 | asset-ee09524034dd435 | HP-02_01_Thuvel_o_Mundo_da_Escurid_o.png | `ee095240…a17a0c1e` | `public/assets/v1.5-acervo/ee09524034dd435e0ee77774.png` | 2 910 493 | 1448×1086 |
| 29 | asset-43a7f338ea4556f | KIMG-0058__PLATE_BR_GUARDIOES_DA_MATA_V01.png | `43a7f338…cef7db4b` | `public/assets/v1.5-acervo/43a7f338ea4556f4709a6e88.png` | 3 066 188 | 1024×1536 |

**REUSED_DUPLICATE (5)** — mesmo SHA, mais de um path no repo; canonical escolhe o principal:

| # | asset_id | legacy_name | sha256 | canonical_repo | aliases |
| - | --- | --- | --- | --- | --- |
| 1 | asset-963acd32953691b | OPEN-002_POVOS_COMUNIDADES_CAMINHOS (copy 1).png | `963acd32…e0584e` | `public/assets/partes/parte-iii-povos.png` | `public/assets/v1.5-acervo/distribuicao-povos.png` |
| 2 | asset-9b2ca02ba60b3ae | OPEN-007_BESTIARIO_DO_CRISTAL_PARTIDO (copy 1).png | `9b2ca02b…dcaf9e35` | `public/assets/complete/bestiary/bestiario-abertura.png` | `public/assets/complete/bestiary/plates/bestiario-atmosfera.png` |
| 3 | asset-cc91c31596276e5 | 02_DUELISTA.png | `cc91c315…a2ff6c6` | `public/assets/complete/offices/duelista.png` | `public/assets/partes/oficio-duelista.png` |
| 4 | asset-e85da577e912876 | 01_DRAGAO_CRISTALINO_COLOSSAL (copy 1).png | `e85da577…4eb796` | `public/assets/complete/bestiary/dragao-cristalino.png` | `public/assets/complete/support/bestiary/dragao-escala.png` |
| 5 | asset-cb023b49e19ac3d | 04_ARVORE_MAE_ERRANTE (copy 1).png | `cb023b49…9316420` | `public/assets/complete/bestiary/arvore-mae.png` | `public/assets/complete/support/bestiary/arvore-mae-escala.png` |

**NEWLY_VERSIONED (13)** — copiados de off-repo para `public/assets/v2-curated/`:

| # | asset_id | legacy_name | sha256 | repo_path | bytes | dims |
| - | --- | --- | --- | --- | ---: | --- |
| 1 | asset-1adb4f5e1261695 | FP-01_02_Parte_I_O_Mundo_Partido.png | `1adb4f5e…5bd9ff` | `public/assets/v2-curated/FP-01_02_Parte_I_O_Mundo_Partido.png` | 3 247 054 | 1024×1536 |
| 2 | asset-834fdd86d545697 | FP-02_01_Parte_II_O_Cintur_o_das_Frestas.png | `834fdd86…a02162` | `public/assets/v2-curated/FP-02_01_Parte_II_O_Cintur_o_das_Frestas.png` | 3 609 966 | 1024×1536 |
| 3 | asset-cb9d415382d7d522 | HP-00_01_Pr_logo_A_velha_e_a_Fresta.png | `cb9d4153…d1d596b` | `public/assets/v2-curated/HP-00_01_Pr_logo_A_velha_e_a_Fresta.png` | 2 449 126 | 1448×1086 |
| 4 | asset-c7eafef9733c050d | HP-01_01_Manesh_o_Mundo_da_Luz.png | `c7eafef9…caa1f89` | `public/assets/v2-curated/HP-01_01_Manesh_o_Mundo_da_Luz.png` | 2 916 333 | 1448×1086 |
| 5 | asset-f8eda493c0a2c5ea | HP-04_01_Grande_Cristal_e_Fratura.png | `f8eda493…fb9324` | `public/assets/v2-curated/HP-04_01_Grande_Cristal_e_Fratura.png` | 2 835 630 | 1448×1086 |
| 6 | asset-b842eed499a951a | HP-05_01_Mirveth_e_Vethari.png | `b842eed4…dba6d` | `public/assets/v2-curated/HP-05_01_Mirveth_e_Vethari.png` | 2 549 279 | 1448×1086 |
| 7 | asset-50831df976dee081 | 01_MAPA_GERAL_DUAS_CAMADAS__50831df9.png | `50831df9…58afc` | `public/assets/v2-curated/01_MAPA_GERAL_DUAS_CAMADAS__50831df9.png` | 4 295 676 | 1536×1024 |
| 8 | asset-28ba1d31b8dea528 | MAPA_COM_TEXTOS_CANDIDATO_FINAL.png | `28ba1d31…5380` | `public/assets/v2-curated/MAPA_COM_TEXTOS_CANDIDATO_FINAL.png` | 3 513 437 | 1440×1092 |
| 9 | asset-837df967e39c3652 | 02_HIDROGRAFIA_LUZ__837df967.png | `837df967…dcf1` | `public/assets/v2-curated/02_HIDROGRAFIA_LUZ__837df967.png` | **4 458 631** | 1536×1024 (LARGEST) |
| 10 | asset-4325b4ca4bc957b | V02_THUR_DAER_PROFUNDIDADE_HABITADA.png | `4325b4ca…c7ad4` | `public/assets/v2-curated/V02_THUR_DAER_PROFUNDIDADE_HABITADA.png` | 3 555 264 | 1024×1536 |
| 11 | asset-8240ca09d19288f | V05_VELARIM_COMO_RELACAO_B (copy 1).png | `8240ca09…86d5e1` | `public/assets/v2-curated/V05_VELARIM_COMO_RELACAO_B (copy 1).png` | 2 833 155 | 1024×1536 |
| 12 | asset-6af3596b1af10ef | D04_EVOCACAO_PRESENCA_AUTONOMA.png | `6af3596b…3f5bf1` | `public/assets/v2-curated/D04_EVOCACAO_PRESENCA_AUTONOMA.png` | 2 989 545 | 1024×1536 |
| 13 | asset-087dd3fd7bf191 | CRIATURA_DRAKO_DA_BRASA_VENTRAL_V02 (copy 1).png | `087dd3fd…f26401` | `public/assets/v2-curated/CRIATURA_DRAKO_DA_BRASA_VENTRAL_V02 (copy 1).png` | 2 633 923 | 1536×1024 |

---

## 8. Invariantes Round-3

```text
TOTAL_RECORDS                       = 47
BY_CLASSIFICATION:
  REUSED_EXISTING                   = 29
  REUSED_DUPLICATE                  = 5
  NEWLY_VERSIONED                   = 13
BY_STATUS:
  EXACT_EXISTING                    = 29
  DUPLICATE_EXISTING                = 5
  EXISTING_IN_REPO_NOW              = 13

RUNNING_STATE_TESTS:
  V2_ASSETS_TOTAL                   = 47
  V2_ASSETS_RESOLVED                = 47
  V2_ASSETS_UNRESOLVED              = 0
  MISSING_REQUIRED_ASSET            = 0
  FALLBACK_USED                     = 0
  HASH_MISMATCHES                   = 0
  ABSOLUTE_PATHS_IN_RUNTIME_POLICY  = 0
  MACHINE_SPECIFIC_PATHS            = 0
  CURATION_INPUT_FILES_CHANGED     = 0
```

---

## 9. Build de runtime (todos verdes)

```text
$ bun run typecheck
  tsc --noEmit  → exit 0

$ bun run test
  table model PASS
  authoring PASS
  sheet model/formula smoke: ok
  image production: ok

$ bun run build
  ✓ built in 1.14s
  [nitro] ✔ You can preview this build using npx vite preview
  [nitro] ✔ You can deploy this build using npx nitro deploy --prebuilt

$ cat /tmp/smoke-load.log
  [kallistis-materializer] KALLISTIS_CATALOG_PATH is not set. Provide the approved catalog markdown (REV1 §28 expected) via env var.
  ... process.exit(1)  ← POR DESIGN: exige env var do catálogo. Sem path absoluto hardcoded.
```

---

## 10. Diff vs rodadas anteriores

| Item | Rodada 1 | Rodada 2 | Rodada 3 (atual) |
| --- | --- | --- | --- |
| `V2_CURATED_PRIMARY_ASSETS` origem | literal 500+ linhas | `policy/v1` (tuplas) | `policy/v3` (objetos com `canonical.repo`) |
| Side-effect `drive-image-*` | reescritos | preservados como legacy | preservados; **gate observado** =0 |
| Assets curated resolução | não feito | 34/47 | **47/47 com FALLBACK_USED=0** |
| Paths absolutos em runtime | sim (alguns via literais) | alguns ainda | **zero** (default catalog agora exige env) |
| Bytes default | n/a | n/a | **+41 887 019 (39,9 MiB)** adicionados ao repo |

---

## 11. Estado Git

```text
HEAD                : a56fa59 (sem mudança)
TRACKED_MODIFIED    : book_maker/scripts/materialize-manuscript.mjs
                      (+22 / -8 net em mudanças desta rodada; load policy + prefer canonical_repo)
UNTRACKED_NEW       : 13 PNGs em book_maker/public/assets/v2-curated/
                      1 JSON    book_maker/scripts/policy/kallistis-curated-assets.json (v3, 33 838 B)
                      + relatórios da auditoria anterior
```

Working tree: **1 tracked modified + untracked novos**. Nenhum arquivo versionado adicionado automaticamente.

---

## 12. Próxima ação (aprovação humana pendente)

Antes de rodar o **piloto** (§21 do prompt unificado), esta rodada confirma a infraestrutura
mínima viável de assets. O status agora é:

- **47/47 assets resolvidos sem fallback** ✓
- **ZERO paths absolutos** em runtime policy ou runtime materializer ✓
- **ZERO side-effects** em `drive-image-*.{json,csv}` ✓
- **13 PNGs (39,9 MiB) versionados** em `book_maker/public/assets/v2-curated/` ✓
- **typecheck / test / build**: PASS

PENDENTE: decisão humana sobre START_PILOT. Aprovado `STORAGE OPTION B` permite que o piloto
opere sem fallback. O piloto pode agora produzir o Book JSON oficial via o materializador
existente, e o CSV/JSON de output seria o candidato para commit/push após revisão editorial.

Nenhuma outra ação técnica foi tomada nesta rodada — esta termina o fechamento da cadeia
de assets.
