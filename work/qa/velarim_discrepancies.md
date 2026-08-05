# Relatório Definitivo de Fechamento Matemático dos Conjuntos — Velarim v2.0

## 1. Fechamento das Métricas e Equações de Conjunto

### 1.1. Partição Mutuamente Exclusiva dos 223 Verbetes Humanos
$$\mathbf{223 \text{ verbetes humanos}} = \mathbf{200 \text{ expansion\_only}} + \mathbf{22 \text{ core\_only}} + \mathbf{1 \text{ derived\_expansion\_under\_core\_lemma}}$$

- `expansion_only`: **200 verbetes**
- `core_only`: **22 verbetes**
- `derived_expansion_under_core_lemma`: **1 verbete** (`les`, Human Entry ID #106, Core L793)
- Soma = $200 + 22 + 1 = \mathbf{223 \text{ verbetes humanos}}$.

### 1.2. Conjuntos de Uso
- **`human_used_by_expansion`:** $200 \text{ (expansion\_only)} + 1 \text{ (les \#106)} = \mathbf{201 \text{ verbetes humanos usados pela expansão}}$.
- **`human_used_by_core`:** $22 \text{ (core\_only)} + 1 \text{ (les \#106)} = \mathbf{23 \text{ verbetes humanos usados pelo núcleo}}$.
- **Interseção ($\text{human\_expansion} \cap \text{human\_core}$):** Exactly **1 verbete**: `{"les"}` (Human Entry ID #106).
- **União ($|\text{human\_expansion} \cup \text{human\_core}|$):**
  $$201 + 23 - 1 = \mathbf{223 \text{ verbetes humanos únicos}}$$.

---

## 2. Cobertura dos Registros Executáveis ($202 \rightarrow 201$)

- **Total de Registros Executáveis:** **202** (`mapped_executable_ids_count = 202`, `orphan_executable_ids_count = 0`).
- **Verbetes Humanos da Expansão Mapeados:** **201** (`human_entry_ids_used_by_expansion = 201`).
- **Diferença Relacional Muitos-para-Um:** $202 - 201 = \mathbf{1 \text{ excesso muitos-para-um}}$.

### 2.1. Único Grupo Muitos-para-Um Final
- **`human_entry_id`:** `106` (`les`, Human Entry ID #106)
- **`human_entry_forma`:** `les`
- **Forma Nuclear:** `les` (Core L793, `verbo transitivo`, `reconhecer; nomear com precisão`, status `PROV`).
- **`executable_ids` Mapeados:** `[109]` (`lesan`, Executable ID #109, `testemunha, nomeador preciso`, `depende de les; V1-PROV`, status `HUMAN_APPROVED`).
- **Excesso Muitos-para-Um:** `1`
- **Razão Documental:** `lesan` (Executable ID #109) é uma forma derivada nominal que depende e se consolida sob o verbete verbal nuclear `les` (Core L793 / Human Entry ID #106) no Dicionário Conversacional.

---

## 3. Preservação de `ravun`, `les` e `lesan`

- **`les`:** Core L793 | `executable_id = null` | `human_entry_id = 106` | Classificação: `derived_expansion_under_core_lemma` (Pertence tanto a `human_used_by_core` quanto a `human_used_by_expansion`).
- **`lesan`:** Executable ID #109 | `core_id = null` | Mapeado ao `human_entry_id = 106` (`les`) | Classificação: `expansion_only`.
- **`ravun`:** Executable ID #129 | 1 registro executável final (`expansion_index` #129) consolida as 2 ocorrências brutas da Seção 17 (Lines 1226 e 1299) e mapeia ao `human_entry_id = 149`.

---

## 4. Conclusão e Testes
- **Testes Automáticos de Cardinalidade Final:** **24/24 PASS (EXIT 0)** em `work/qa/scripts/test_velarim_final_set_cardinality.py`.
- **DOCX:** 100% intocado (`366da81fd81a4c0ef5a2518da7bb90bb3db1c22a737f4df4df53644f6e5197f9`).
