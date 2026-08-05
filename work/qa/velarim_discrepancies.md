# Relatório Definitivo de Fechamento de Consolidações — Velarim v2.0

## 1. Síntese Executiva das Consolidações da Expansão
O mapeamento integral dos **202 registros executáveis de expansão** aos **200 verbetes humanos da expansão** foi totalmente demonstrado e validado em [work/qa/velarim_executable_human_crosswalk.json](file:///home/tonyus-dev/Projetos/RPG/kallistis%20libro/KALLISTIS_PARA_ANTIGRAVITY/work/qa/velarim_executable_human_crosswalk.json).

- **Registros Executáveis Únicos:** **202** (`mapped_executable_ids_count = 202`, `orphan_executable_ids_count = 0`).
- **Verbetes Humanos da Expansão Únicos:** **200** (`human_entry_ids_used_by_expansion = 200`).
- **Equação Cardinal Executável -> Humano:** $\mathbf{202 \text{ registros executáveis}} - \mathbf{2 \text{ consolidações muitos-para-um}} = \mathbf{200 \text{ verbetes humanos da expansão}}$.

---

## 2. Grupos de Consolidação Muitos-para-Um Identificados Nominalmente

### 2.1. Grupo 1 — `ravun` (Human Entry ID #149)
- **`human_entry_id`:** `149` (`ravun`, Seção 17.4, Line 1226)
- **`executable_ids`:** `[129, 207]`
- **Formas Executáveis:** `ravun` (ID #129) e `ravun` (ID #207)
- **Classes:** `ferida, dano, perigo; ferido, perigoso` (ID #129) e `perigoso, ferido; dano, perigo` (ID #207)
- **Sentidos:** Dano, ferida, perigo (Seção 17.4) e Descritor de perigo e combate (Seção 17.5)
- **Motivo Documental:** Reocorrência do descritor de combate na Seção 17.5 após sua introdução nominal na Seção 17.4.
- **Textos Literais:**
  - `| ravun | ferida, dano, perigo; ferido, perigoso | rav + -un |` (SHA-256: `90987c2bf3398ae31eb543f05b4b1a415ff6adab291bfedb509ef48aebcfbebe`)
  - `| ravun | perigoso, ferido; dano, perigo |` (SHA-256: `a935a84061a94ebac21a3ddcc6c6df972dfec5bce3438a2eabdb564e9e43b177`)

### 2.2. Grupo 2 — `les` / `lesan` (Human Entry ID #103)
- **`human_entry_id`:** `103` (`les`, Seção 17.3, Line 1168)
- **`executable_ids`:** `[103, 195]`
- **Formas Executáveis:** `les` (ID #103) e `lesan` (ID #195)
- **Classes:** `TRANS` (ID #103) e `depende de les` (ID #195)
- **Sentidos:** Reconhecer, nomear com precisão (`les`, V1-PROV) e Testemunha, nomeador preciso (`lesan`, V1-PROV)
- **Motivo Documental:** Consolidação da forma derivada nominal `lesan` sob o verbete verbal primário `les` (Human Entry ID #103) no Dicionário Conversacional.
- **Textos Literais:**
  - `| les | TRANS | reconhecer, nomear com precisão | V1-PROV |` (SHA-256: `785d03bb5ae3bda19a9a3b684cb3aa71a0624bcbf8f47f2bebcfe8bbacfc1599`)
  - `| lesan | testemunha, nomeador preciso | depende de les; V1-PROV |` (SHA-256: `0efc8d0ed34e56fa2b0b680bd6e60b2eb10c9c72e382d61993437bb96e1b5f63`)

---

## 3. Registro Corrigido de `veth` e `vethari`

### 3.1. `veth`
- **`core_id`:** `779` | **`executable_id`:** `null` | **`human_entry_id`:** `87`
- **Classes:** `REL` (humano) vs `substantivo relacional` (núcleo)
- **Extensão Verbal:** `True`
- **`additional_sense_without_independent_record`:** **`True`**
- **Classificação:** **`maps_to_core_only`** (com extensão semântica/verbal documentada)

### 3.2. `vethari`
- **`core_id`:** `783` | **`executable_id`:** `null` | **`human_entry_id`:** `102`
- **Classes:** `REL` (humano) vs `substantivo/verbo relacional` (núcleo)
- **Extensão Verbal:** `False` (já incorporada na classe nominal/verbal original)
- **`additional_sense_without_independent_record`:** **`False`**
- **Classificação:** **`maps_to_core_only`**

---

## 4. Conclusão Definitiva
- **Mapeamento Executável -> Humano:** 202/202 (`0` órfãos, `0` não mapeados).
- **Verbetes Humanos da Expansão Mapeados:** 200/200.
- **Testes Automáticos de Consolidação:** **14/14 PASS (EXIT 0)**.
