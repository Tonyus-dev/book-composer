# Relatório Definitivo de Auditoria e Resolução de Sobreposição — Velarim v2.0

## 1. Síntese Executiva da Auditoria de Sobreposição de `les`
A auditoria e validação da sobreposição de `les` no crosswalk bidirecional foram concluídas com sucesso:
- **`les` (Núcleo 1.0, L793):** Classificado unicamente como `derived_expansion_under_core_lemma` (lema nuclear que hospeda a entrada derivada de expansão `lesan` Executable ID #109).
- **Natureza do ID 103:** Declarado como `raw_index` de linha de tabela na Seção 17.3; `les` não possui `executable_id` na expansão final (`executable_id_les = null`).
- **`lesan` (Expansão, ID #109):** Classificado unicamente como `expansion_only`.
- **Partição Humana Exata (223 Verbetes):** $200 \text{ expansion\_only} + 22 \text{ core\_only} + 1 \text{ derived\_expansion\_under\_core\_lemma} = \mathbf{223 \text{ verbetes humanos}}$.
- **Interseção Núcleo/Expansão:** `0` (nenhuma sobreposição não tratada).
- **Cobertura Executável (202 Registros):** $202/202$ mapeados (`0` órfãos).
- **Suíte de Testes:** **14/14 PASS (EXIT 0)**.

---

## 2. Partição Mutuamente Exclusiva dos 223 Verbetes Humanos

| Categoria | Verbetes | Descrição |
|-----------|----------|-----------|
| `expansion_only` | **200** | Exclusivos da camada de expansão v2.0 |
| `core_only` | **22** | Exclusivos do Núcleo 1.0 (excluindo `les`) |
| `derived_expansion_under_core_lemma` | **1** | `les` (Lema nuclear hospedando `lesan` #109) |
| `core_and_expansion` | **0** | Interseção tratada e zerada |
| `outras_categorias` | **0** | Nenhuma entrada não alocada |
| **TOTAL HUMANO** | **223** | **Soma exata dos 223 verbetes humanos** |

---

## 3. Desbloqueio Editorial Definitivo
- **`VELARIM_AUDIT_PENDING`:** **TOTALMENTE ENCERADO E LIBERADO**.
- **Capítulo 15 (Velarim, Merge e Coro):** **LIBERADO PARA REVISÃO NO LOTE 14–16**.
- **Apêndice B (Velarim Conversacional v2.0):** **LIBERADO PARA REVISÃO NO LOTE DE APÊNDICES**.
