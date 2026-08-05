# Relatório Definitivo de Auditoria e Cardinalidade de Conjuntos — Velarim v2.0

## 1. Síntese Executiva das Métricas e Equações de Conjunto
A auditoria final e o fechamento matemático do crosswalk entre o **Corpus Executável de Expansão (202 Registros)** e o **Dicionário Conversacional 2.0 (223 Verbetes Humanos)** foram concluídos com precisão:

- **Partição Exclusiva:** $\mathbf{223 \text{ verbetes humanos}} = \mathbf{200 \text{ expansion\_only}} + \mathbf{22 \text{ core\_only}} + \mathbf{1 \text{ derived\_expansion\_under\_core\_lemma}}$.
- **`human_used_by_expansion`:** **201 verbetes humanos** ($200 + 1$).
- **`human_used_by_core`:** **23 verbetes humanos** ($22 + 1$).
- **Interseção ($\text{human\_expansion} \cap \text{human\_core}$):** Exactly **1 verbete** (`{"les"}`).
- **União ($|\text{human\_expansion} \cup \text{human\_core}|$):** $201 + 23 - 1 = \mathbf{223 \text{ verbetes humanos}}$.
- **Cobertura Executável:** $\mathbf{202 \text{ registros executáveis}} \longrightarrow \mathbf{201 \text{ verbetes humanos utilizados pela expansão}}$.
- **Excesso Muitos-para-Um:** $202 - 201 = \mathbf{1 \text{ excesso}}$, representado pela lema `les` (Human Entry ID #106) que atrai `lesan` (Executable ID #109).
- **Testes Automáticos:** **24/24 PASS (EXIT 0)** em `work/qa/scripts/test_velarim_final_set_cardinality.py`.

---

## 2. Resumo da Partição e Conjuntos de Uso

| Categoria / Conjunto | Tamanho | Itens / Mapeamento |
|----------------------|---------|--------------------|
| `expansion_only` | **200** | Verbetes humanos exclusivos da expansão |
| `core_only` | **22** | Verbetes humanos exclusivos do Núcleo 1.0 (excluindo `les`) |
| `derived_expansion_under_core_lemma` | **1** | `les` (Human Entry ID #106, Core L793) |
| **PARTIÇÃO EXCLUSIVA TOTAL** | **223** | **Soma exata dos 223 verbetes humanos** |
| `human_used_by_expansion` | **201** | 200 expansion_only + 1 les |
| `human_used_by_core` | **23** | 22 core_only + 1 les |
| `intersection` | **1** | `{"les"}` (Human Entry ID #106) |
| `union` | **223** | $201 + 23 - 1 = 223$ |

---

## 3. Desbloqueio Editorial Definitivo
- **`VELARIM_AUDIT_PENDING`:** **TOTALMENTE ENCERADO E LIBERADO**.
- **Capítulo 15 (Velarim, Merge e Coro):** **LIBERADO PARA REVISÃO NO LOTE 14–16**.
- **Apêndice B (Velarim Conversacional v2.0):** **LIBERADO PARA REVISÃO NO LOTE DE APÊNDICES**.
