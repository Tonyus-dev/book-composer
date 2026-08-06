# Relatório Definitivo de Reconciliação Declarado vs Calculado — Velarim v2.0

## 1. Síntese Executiva do Incidente Editorial (CASO B)
A auditoria documental e matemática de reconciliação entre a contagem declarada pela fonte canônica e a contagem extraída dos dados empíricos foi concluída e registrada no manifesto [work/qa/velarim_declared_vs_calculated_manifest.json](file:///home/tonyus-dev/Projetos/RPG/kallistis%20libro/KALLISTIS_PARA_ANTIGRAVITY/work/qa/velarim_declared_vs_calculated_manifest.json):

- **`source_declared_human_entries`:** **223** (Declarado literalmente no Parágrafo #4265 do arquivo `work/working_copy.docx`).
- **`calculated_unique_human_entries`:** **225** (Calculado diretamente das 226 ocorrências brutas menos 1 excesso do grupo `ravun`).
- **`divergence`:** **2** ($225 - 223 = 2$).
- **Caso Identificado:** **CASO B** (A extração final produz 225 verbetes únicos autênticos e a fonte declara 223).
- **Veredito:** `INCIDENTE EDITORIAL — CONTAGEM DECLARADA E EXTRAÍDA DIVERGEM`.
- **Status do Bloqueio Editorial:** `VELARIM_AUDIT_PENDING` mantido **ATIVO (BLOQUEADO)**.

---

## 2. Evidenciação Documental da Declaração Canônica
- **Arquivo:** `work/working_copy.docx`
- **SHA-256:** `366da81fd81a4c0ef5a2518da7bb90bb3db1c22a737f4df4df53644f6e5197f9`
- **Parágrafo Index:** `#4265`
- **Seção:** `17. Vocabulário Conversacional Expandido`
- **Texto Literal:** `"Esta seção reúne 223 verbetes humanos diretamente atestados na expansão e em seu corpus, além dos 48 registros do núcleo"`
- **População Declarada:** Verbetes humanos atestados na expansão e em seu corpus.

---

## 3. Reconciliação das 226 Linhas Brutas e Métricas de Conjunto
- **Linhas Físicas (`raw_human_entries`):** **226**.
- **Grupo Duplicado Único:** `ravun` (Linha 1226 / Raw ID #149 e Linha 1299 / Raw ID #207, `group_excess = 1`).
- **Verbetes Únicos Calculados ($|H|$):** **225**.
- **$|E|$ (Verbetes Únicos Usados pelos 202 Executáveis):** **202**.
- **$|C|$ (Verbetes Únicos do Núcleo 1.0):** **23**.
- **$|E \cap C|$:** **0**.
- **$|E \cup C|$:** **225** ($202 + 23 = 225$).
- **$|H - (E \cup C)|$:** **0**.
- **Invariante $E \cup C \subseteq H$:** **TRUE** ($225 \le 225$, 100% Satisfeito).

---

## 4. Conclusão e Testes
- **Veredito:** `INCIDENTE EDITORIAL — CONTAGEM DECLARADA E EXTRAÍDA DIVERGEM` (CASO B).
- **Suíte de Testes:** **18/18 PASS (EXIT 0)** em `work/qa/scripts/test_velarim_declared_vs_calculated.py`.
- **DOCX:** 100% intocado (`366da81fd81a4c0ef5a2518da7bb90bb3db1c22a737f4df4df53644f6e5197f9`).
