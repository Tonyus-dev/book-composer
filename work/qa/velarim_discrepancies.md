# Relatório Fidedigno de Divergências Canônicas de Velarim

## 1. Visão Geral
A auditoria completa do baseline e do corpus executável v2.0 do Velarim foi concluída com sucesso. Os **48 Registros do Núcleo v1.0 LOCKED** e os **202 Registros da Expansão Conversacional v2.0** foram individualmente extraídos, hash-validados e reconciliados, totalizando **250 registros ativos declarados**.

---

## 2. Divergências Mapeadas e Classificações

### DIVERGÊNCIA D-001 — Ortografia Normativa vs Diacríticos Legados
- **Forma A (Manual v1.0, Marco 2):** Ortografia normativa exclusivamente ASCII (`nooveth`, `luumeh`, `Kraavira`).
- **Forma B (Grafias com Acento em Textos Antigos):** `nóveth`, `lúmë`, `Krávira`.
- **Fontes:** Manual Definitivo v1.0.
- **Status:** `legacy_spelling_mapped`.
- **Decisão:** Manter a regra oficial de conversão normativa ASCII.

### DIVERGÊNCIA D-002 — Reconciliação da Contagem Legada 223
- **Forma A (Declaração Canônica v2.0):** $48 \text{ (núcleo)} + 202 \text{ (expansão)} = 250 \text{ registros ativos}$.
- **Forma B (Contagem Intermediária 223):** $226 \text{ (linhas da Seção 17)} - 3 \text{ (repetições no fraseário)} = 223$.
- **Fontes:** Manual Expandido v2.0-RC1 (Seção 17) & Decisão de Aprovação v2.0.
- **Status:** `legacy_or_methodological_count`.
- **Decisão:** O subtotal canônico da expansão é **202 registros únicos**. O número 223 é classificado como contagem metodológica intermediária antes do descarte de sobreposições com o núcleo 1.0.

### DIVERGÊNCIA D-003 — Exclusão das 6 Formas Sil-* Sem Ocorrência
- **Formas:** `Sil-Vael`, `Sil-Khor`, `Sil-Aet`, `Sil-Nox`, `Sil-Mir`, `Sil-Zul`.
- **Pesquisa Literal:** 0 ocorrências em todas as 4 fontes canônicas.
- **Status:** `invented_by_previous_audit`.
- **Decisão:** Exclusão total do corpus, léxico e gramática.

---

## 3. Resumo da Validação Cruzada do Corpus v2.0
- **Registros do Núcleo Comparados:** 48 (100% `literal_match`)
- **Registros da Expansão Comparados:** 202 (100% `literal_match`)
- **Total Ativo Validado:** 250 registros
- **Conflitos Não Resolvidos:** **0**
