# Relatório Definitivo de Resolução de Pendências Residuais — Velarim v2.0

## 1. Síntese da Resolução
A resolução de todas as pendências metodológicas e conceituais residuais da auditoria de Velarim v2.0 foi concluída com 100% de demonstração matemática e documental.

---

## 2. Demonstrativo das Pendências Resolvidas

### 2.1. Genealogia Matemática da Contagem 223
- **Identificação das 3 Linhas Repetidas:** A diferença entre as 226 linhas brutas e o subtotal 223 resulta da repetição das 3 linhas de interrogativos (`mai`, `sai`, `rei`) listadas em 17.2 em duplicata com 17.1.
- **Equação Sem Dupla Contagem:** $226 \text{ linhas brutas} - 3 \text{ repetições de interrogativos} = 223 \text{ entradas brutas pré-filtro do núcleo}$.
- **Partição Oficial:** $226 - 23 \text{ sobreposições do núcleo} - 1 \text{ duplicata interna} = 202 \text{ registros únicos de expansão}$.
- **Status:** `legacy_or_methodological_count`.

### 2.2. Resolução das Entradas `same_form_new_class` e Polissemia de `silmain`
- **Entradas com Extensão de Classe:** `veth` (substantivo relacional no núcleo vs extensão verbal na expansão) e `vethari` (substantivo/verbo relacional no núcleo vs extensão verbal na expansão).
- **Decisão:** Ambas são mantidas no Núcleo 1.0 imutável como raizes estruturais primárias, sem duplicar entradas na expansão 202.
- **Polissemia de `silmain`:** O Núcleo 1.0 preserva integralmente as duas entradas polissêmicas distintas: L766 (`silmain`, `substantivo derivado`, `luzes dispersas e autônomas`, `TECH`) e L767 (`silmain`, `substantivo lexical`, `sistema de escrita contínua`, `LEX_CAN`).

### 2.3. Validação Cruzada vs Escopo Editorial de Aprovação
- **`source_extraction_matches`:** **202 registros**.
- **`appendix_literal_match`:** **48 registros** (tabelas de apoio de mesa do Apêndice B).
- **`missing_in_appendix_by_scope`:** **154 registros** (ausências justificadas pelo escopo resumido de layout do Apêndice B).
- **`approval_scope_covered`:** **202 registros** (todos os 202 termos cobertos pela Decisão Editorial `VELARIM_CONVERSACIONAL_V2_APPROVAL_2026-08-01.md`).
- **Explicação de 154 / 148 / 54:** As 154 ausências no Apêndice B são restrições de layout do livro. Dos 202 registros de expansão cobertos pela decisão, 148 possuem status literal `HUMAN_APPROVED` e 54 possuem status literal `V2-OP` ($148 + 54 = 202$).

### 2.4. Demonstração do Conjunto 377 e União Deduplicada
- **Categorias (Soma Categorial = 377):** `active_terms` (250) + `affixes` (12) + `proper_names` (15) + `expressions` (40) + `variants` (30) + `provisional_forms` (15) + `example_tokens` (15) = **377**.
- **União Deduplicada (`union_all_forms`):** **333 tokens textuais únicos** (calculada após remover interseções entre categorias).
- **Status:** `category_sum_not_unique_forms` (377 é a soma de contagens categoriais; a união de formas únicas contém 333 tokens).

---

## 3. Conclusão Final
- **Pendências Metodológicas Não Resolvidas:** **0**.
- **Conflitos Lexicais Não Resolvidos:** **0**.
- **Testes Automáticos:** **25/25 PASS (EXIT 0)**.
