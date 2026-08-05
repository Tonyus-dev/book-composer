# Relatório Definitivo de Separação entre Ocorrências Brutas e Verbetes Únicos — Velarim v2.0

## 1. Síntese Executiva da Separação entre Ocorrências Brutas e Verbetes Únicos
A auditoria de identidade entre as **Ocorrências Brutas (`raw_human_entries`)** e os **Verbetes Humanos Únicos (`unique_human_entries`)** foi concluída e documentada no manifesto [work/qa/velarim_human_identity_manifest.json](file:///home/tonyus-dev/Projetos/RPG/kallistis%20libro/KALLISTIS_PARA_ANTIGRAVITY/work/qa/velarim_human_identity_manifest.json):

- **`raw_human_entries_count`:** **226 ocorrências brutas** (`raw_entry_id` 1 a 226).
- **`unique_human_entries_calculated`:** **225 verbetes humanos únicos** (`unique_human_entry_id` 1 a 225).
- **`total_duplicate_excess`:** **1** (`ravun` L1299 / Raw ID #207).
- **Equação de Redução:**
  $$\mathbf{226 \text{ raw\_entries}} - \mathbf{1 \text{ duplicate\_excess}} = \mathbf{225 \text{ unique\_human\_entries}}$$

---

## 2. Invariantes de Conjunto com IDs de Verbetes Únicos

- **$|H|$ (Conjunto de `unique_human_entry_id`s):** **225 verbetes únicos**.
- **$|E|$ (Verbetes Únicos Usados pelos 202 Executáveis):** **202 verbetes únicos**.
- **$|C|$ (Verbetes Únicos do Núcleo 1.0):** **23 verbetes únicos**.
- **$|E \cap C|$ (Interseção Direta):** **0**.
- **$|E - C|$ (`expansion_only`):** **202 verbetes únicos**.
- **$|C - E|$ (`core_only`):** **23 verbetes únicos**.
- **$|E \cup C|$ (União Núcleo e Expansão):** **225 verbetes únicos** ($202 + 23 = 225$).
- **$|H - (E \cup C)|$:** **0** (Cobertura de 100%).

### 2.1. Validação Obrigatória de Subconjunto ($E \cup C \subseteq H$)
- **`invariant_E_cup_C_subset_H`:** **TRUE** ($E \cup C \subseteq H$).
- **Inclusão-Exclusão:** $|E \cup C| = |E| + |C| - |E \cap C| \implies 225 = 202 + 23 - 0$ (**FECHA PERFEITAMENTE**).

---

## 3. Tratamento Estrito de `ravun`
- **Ocorrências Brutas (`raw_human_entries`):** 2 ocorrências (`raw_entry_id`: `149` em L1226 e `207` em L1299).
- **Verbete Humano Único (`unique_human_entry_id`):** 1 verbete único (`ravun`).
- **Registro Executável Correspondente (`executable_id`):** `129` (`ravun`).
- **Excesso do Grupo:** $2 - 1 = \mathbf{1}$.

---

## 4. Conclusão Definitiva
- **Veredito:** **100% RECONCILIADO COM SUPORTE MATEMÁTICO INTEGRAL**.
- **Suíte de Testes:** **18/18 PASS (EXIT 0)** em `work/qa/scripts/test_velarim_human_identity.py`.
- **DOCX:** 100% intocado (`366da81fd81a4c0ef5a2518da7bb90bb3db1c22a737f4df4df53644f6e5197f9`).
