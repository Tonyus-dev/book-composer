# Relatório Fidedigno de Fechamento da Auditoria de Velarim v2.0

## 1. Visão Geral do Fechamento
A auditoria metodológica e a validação cruzada do **Corpus Executável de Velarim v2.0** foram totalmente concluídas. Todas as **226 linhas brutas** da Seção 17 do Manual Expandido v2.0-RC1 foram individualmente classificadas e rastreadas.

---

## 2. Classificação Completa das 226 Linhas Brutas
- **`expansion_unique`:** **202 linhas** (entradas lexicais novas e exclusivas da expansão v2.0).
- **`exact_core_overlap`:** **23 linhas** (sobreposições com termos já catalogados no Núcleo 1.0 imutável).
- **`internal_exact_duplicate`:** **1 linha** (duplicata interna na listagem de interrogativos da Seção 17).
- **Gate Matemático:** $202 + 23 + 1 = 226$ linhas brutas ($202 \text{ únicas} + 24 \text{ excluídas} = 226$).

---

## 3. Análise Nominal das 23 Sobreposições com o Núcleo 1.0
As 23 sobreposições nominais entre a Seção 17 e os 48 registros do Núcleo 1.0 (ex.: `mi`, `si`, `na`, `ve`, `nam`, `namath`, `silar`, `tharen`, etc.) foram auditadas individualmente no manifesto [work/qa/velarim_core_overlap_analysis.json](file:///home/tonyus-dev/Projetos/RPG/kallistis%20libro/KALLISTIS_PARA_ANTIGRAVITY/work/qa/velarim_core_overlap_analysis.json). Todas foram mantidas em sua definição primária do Núcleo 1.0, evitando duplicação nos 250 registros ativos.

---

## 4. Auditoria de Status Lexicais e Editoriais (202 registros)
- **`HUMAN_APPROVED` (148 registros):** Status de aprovação editorial formal emitida na Decisão Canônica de 2026-08-01.
- **`V2-OP` (54 registros):** Status operacional indicando vocabulário introduzido na versão v2.0 para fluidez conversacional.
- **Recálculo do Total:** $148 + 54 = 202 \text{ registros de expansão}$.

---

## 5. Separabilidade entre Extração e Validação Cruzada
- **`source_extraction_matches`:** 202 (100% de correspondência direta com a fonte executável).
- **`cross_source_items_evaluated`:** 202 registros da expansão.
- **`missing_in_appendix`:** 154 (o Apêndice B seleciona intencionalmente um subconjunto prático de 48 termos para tabelas de apoio rápido de mesa; as 154 ausências são registradas como limitação de escopo e não como conflito).
- **`unresolved`:** **0**.

---

## 6. Reconciliação do Conjunto de 377 Tokens Únicos
- **`all_active`:** 250 (48 núcleo + 202 expansão)
- **`affixes`:** 12
- **`proper_names`:** 15
- **`expressions`:** 40
- **`variants`:** 30
- **`provisional_forms`:** 15
- **`example_tokens`:** 15
- **Soma das Categorias:** **377**
- **União Deduplicada (`union_all_forms`):** 377 tokens textuais únicos.
