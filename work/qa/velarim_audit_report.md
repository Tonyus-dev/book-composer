# Relatório Definitivo de Auditoria de Agrupamento Executável-Humano — Velarim v2.0

## 1. Síntese Executiva da Auditoria do Agrupamento Executável-Humano
A auditoria mecânica do agrupamento dos **202 registros executáveis** pelo `human_entry_id` confirmou o **CASO B**:

- **Total de Registros Executáveis (`distinct_executable_ids`):** **202**.
- **Registros Mapeados (`mapped_executable_ids`):** **202** (`0` órfãos, `0` unresolved).
- **Verbetes Humanos Distintos Utilizados (`distinct_human_entry_ids`):** **202**.
- **Grupos Muitos-para-Um (`distinct_executable_count > 1`):** **0**.
- **Excesso Relacional Total (`total_relational_excess`):** **0**.
- **Equação Cardinal:**
  $$\mathbf{202 \text{ distinct\_executable\_ids}} - \mathbf{202 \text{ distinct\_human\_entry\_ids}} = \mathbf{0 \text{ total\_relational\_excess}}$$
- **Testes Automáticos:** **16/16 PASS (EXIT 0)** em `work/qa/scripts/test_velarim_executable_human_grouping.py`.

---

## 2. Resumo da Distribuição do Agrupamento (CASO B)

| Métrica | Valor | Validação |
|---------|-------|-----------|
| `distinct_executable_ids` | **202** | 100% dos registros executáveis da expansão |
| `mapped_executable_ids` | **202** | Todos os registros possuem mapeamento |
| `orphan_executable_ids` | **0** | Nenhum registro desconectado |
| `unresolved_executable_ids` | **0** | Nenhum registro pendente |
| `distinct_human_entry_ids` | **202** | Verbetes humanos mapeados 1:1 |
| `many_to_one_groups_count` | **0** | Nenhum grupo com >1 executável |
| `total_relational_excess` | **0** | Diferença $202 - 202 = 0$ |
| `caso_declarado` | **CASO B** | Mapeamento 1:1 integral |

---

## 3. Desbloqueio Editorial Definitivo
- **`VELARIM_AUDIT_PENDING`:** **TOTALMENTE ENCERADO E LIBERADO**.
- **Capítulo 15 (Velarim, Merge e Coro):** **LIBERADO PARA REVISÃO NO LOTE 14–16**.
- **Apêndice B (Velarim Conversacional v2.0):** **LIBERADO PARA REVISÃO NO LOTE DE APÊNDICES**.
