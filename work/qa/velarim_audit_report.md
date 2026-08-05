# Relatório Definitivo de Auditoria e Consolidações do Crosswalk — Velarim v2.0

## 1. Síntese Executiva das Consolidações e Cardinalidades
A auditoria final e o fechamento do crosswalk entre o **Corpus Executável de Expansão (202 Registros)** e o **Dicionário Conversacional 2.0 (223 Verbetes Humanos)** foram concluídos:
- **Total de `executable_id` Únicos:** **202** (100% mapeados, `0` órfãos).
- **Verbetes Humanos da Expansão Mapeados:** **200** (`human_entry_ids_used_by_expansion = 200`).
- **Grupos de Consolidação Muitos-para-Um (2 grupos):**
  1. `ravun` (Executable IDs #129 e #207 -> Human Entry ID #149).
  2. `les` / `lesan` (Executable IDs #103 e #195 -> Human Entry ID #103).
- **Registro Corrigido de `veth`:** `additional_sense_without_independent_record = True`, `executable_id = null`, `classificação = maps_to_core_only`.
- **Registro de `vethari`:** `additional_sense_without_independent_record = False`, `executable_id = null`, `classificação = maps_to_core_only`.
- **Partição Humana (223 Verbetes):** $200 \text{ expansão} + 23 \text{ núcleo} = \mathbf{223 \text{ verbetes humanos}}$.
- **Testes Automáticos de Consolidação:** **14/14 PASS (EXIT 0)**.

---

## 2. Tabela de Cobertura dos 202 Registros Executáveis

| Métrica / Relação | Valor | Demonstração Documental | Status |
|-------------------|-------|-------------------------|--------|
| `total_executable_records` | **202** | Formas únicas da Seção 17 | `VERIFICADO` |
| `mapped_executable_ids_count` | **202** | Mapeamento 100% no crosswalk | `VERIFICADO` |
| `orphan_executable_ids_count` | **0** | Nenhum registro desconectado | `VERIFICADO` |
| `human_entry_ids_used_by_expansion` | **200** | Verbetes humanos únicos da expansão | `VERIFICADO` |
| `consolidation_groups_count` | **2** | Grupos `ravun` (#149, #207) e `les` (#103, #195) | `VERIFICADO` |
| `veth_additional_sense` | **True** | Extensão verbal sem registro executável próprio | `VERIFICADO` |

---

## 3. Desbloqueio Editorial Definitivo
Com a aprovação nos 14 testes automatizados da suíte de consolidações:
- **`VELARIM_AUDIT_PENDING`:** **TOTALMENTE ENCERADO E LIBERADO**.
- **Capítulo 15 (Velarim, Merge e Coro):** **LIBERADO PARA REVISÃO NO LOTE 14–16**.
- **Apêndice B (Velarim Conversacional v2.0):** **LIBERADO PARA REVISÃO NO LOTE DE APÊNDICES**.
