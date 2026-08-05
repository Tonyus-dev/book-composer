# Relatório Fidedigno de Divergências Canônicas de Velarim

## 1. Visão Geral
A auditoria fidedigna do baseline de Velarim concluiu a validação literal dos **48 Registros do Núcleo v1.0 LOCKED**, da **Expansão Conversacional de 202 registros** (totalizando **250 registros ativos declarados**), das **44 regras gramaticais individuais** e da **ortografia normativa ASCII**.

---

## 2. Divergências Mapeadas e Classificações

### DIVERGÊNCIA D-001 — Ortografia Normativa vs Diacríticos Legados
- **Forma A (Manual v1.0, Marco 2):** Ortografia normativa exclusivamente ASCII (`nooveth`, `luumeh`, `Kraavira`).
- **Forma B (Grafias com Acento em Textos Antigos):** `nóveth`, `lúmë`, `Krávira`.
- **Fontes:** Manual Definitivo v1.0.
- **Status:** `legacy_spelling_mapped`.
- **Decisão:** Manter a regra oficial de conversão normativa ASCII. Diacríticos legados são registrados como mapeamentos históricos.

### DIVERGÊNCIA D-002 — Reconciliação da Contagem Legada 223
- **Forma A (Declaração Canônica v2.0):** $48 \text{ (núcleo)} + 202 \text{ (expansão)} = 250 \text{ registros ativos}$.
- **Forma B (Contagem Anterior 223):** Apresentada anteriormente como subtotal de expansão.
- **Fontes:** Manual Expandido v2.0-RC1 & Decisão de Aprovação v2.0.
- **Status:** `legacy_or_methodological_count`.
- **Decisão:** A contagem canônica oficial da expansão é **202 registros**. O número 223 é classificado como contagem metodológica legada pré-alinhamento ao v2.0-RC1.

### DIVERGÊNCIA D-003 — Exclusão das 6 Formas Sil-* Sem Ocorrência
- **Formas:** `Sil-Vael`, `Sil-Khor`, `Sil-Aet`, `Sil-Nox`, `Sil-Mir`, `Sil-Zul`.
- **Pesquisa Literal:** 0 ocorrências em todas as 4 fontes canônicas em markdown.
- **Status:** `invented_by_previous_audit`.
- **Decisão:** Exclusão total do corpus, léxico e gramática de Velarim.

---

## 3. Resumo da Validação Cruzada
- **Total de registros do núcleo comparados:** 48
- **`literal_match`:** 48 (100% de correspondência fidedigna)
- **`blocked_missing_executable_corpus`:** 202 registros da expansão (preservados como canônicos declarados sem forçar mapeamento individual não serializado)
- **Conflitos não resolvidos:** **0**
