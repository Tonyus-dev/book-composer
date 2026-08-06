# Relatório Definitivo de Auditoria de Reconciliação Declarado vs Calculado — Velarim v2.0

## 1. Síntese Executiva do Incidente Editorial
A reconciliação documental e matemática entre a declaração canônica e a extração empírica identificou o **CASO B**:

- **`source_declared_human_entries`:** **223** (Parágrafo #4265 de `work/working_copy.docx`).
- **`calculated_unique_human_entries`:** **225** (226 ocorrências brutas - 1 excesso do grupo `ravun`).
- **`divergence`:** **2** ($225 - 223 = 2$).
- **Caso:** **CASO B** (Divergência mantida sem falsificação de dados).
- **Veredito:** `INCIDENTE EDITORIAL — CONTAGEM DECLARADA E EXTRAÍDA DIVERGEM`.
- **`VELARIM_AUDIT_PENDING`:** Mantido **ATIVO (BLOQUEADO)**.
- **Invariante de Subconjunto:** $\mathbf{E \cup C \subseteq H}$ (**TRUE**, $|E \cup C| = 225 \le |H| = 225$).
- **Testes Automáticos:** **18/18 PASS (EXIT 0)** em `work/qa/scripts/test_velarim_declared_vs_calculated.py`.

---

## 2. Decisão e Bloqueio Editorial
- **`VELARIM_AUDIT_PENDING`:** Mantido **ATIVO (BLOQUEADO)** devido à divergência documental de 2 unidades entre a declaração textual (223) e o inventário extraído (225).
- **Capítulo 15 e Apêndice B:** Permanecem **BLOQUEADOS** até decisão editorial da liderança humana.
