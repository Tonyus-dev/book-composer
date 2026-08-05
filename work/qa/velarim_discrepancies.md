# Relatório Definitivo de Agrupamento Executável-Humano — Velarim v2.0

## 1. Síntese Executiva do Agrupamento Mecânico
A auditoria mecânica do agrupamento dos **202 registros executáveis** pelo `human_entry_id` foi concluída e documentada em [work/qa/velarim_executable_human_grouping.json](file:///home/tonyus-dev/Projetos/RPG/kallistis%20libro/KALLISTIS_PARA_ANTIGRAVITY/work/qa/velarim_executable_human_grouping.json).

- **Total de Registros Executáveis (`distinct_executable_ids`):** **202** (IDs #1 a #202).
- **Registros Mapeados (`mapped_executable_ids`):** **202** (`0` órfãos, `0` unresolved).
- **Verbetes Humanos Distintos Utilizados (`distinct_human_entry_ids`):** **202**.
- **Caso Declarado:** **CASO B** (Cada um dos 202 registros executáveis mapeia 1:1 para um verbete humano distinto na camada de expansão).
- **Equação Cardinal Executável -> Humano:**
  $$\mathbf{202 \text{ distinct\_executable\_ids}} - \mathbf{202 \text{ distinct\_human\_entry\_ids}} = \mathbf{0 \text{ total\_relational\_excess}}$$

---

## 2. Análise dos Grupos e Ausência de Excesso Relacional

### 2.1. Distribuição dos Grupos por Tamanho
- **Grupos com `distinct_executable_count == 1`:** **202 grupos** (`group_excess = 0`).
- **Grupos com `distinct_executable_count > 1`:** **0 grupos** (`many_to_one_groups_count = 0`).
- **Excesso Relacional Total (`total_relational_excess`):** **0**.

### 2.2. Tratamento de `lesan` (Executable ID #109)
- **`executable_id`:** `109` (`forma: lesan`, `classe: testemunha, nomeador preciso`, `significado: depende de les; V1-PROV`, line: 1190).
- **`human_entry_id`:** `123` (`lesan`, line 1190).
- **Distinct Executable Count no Grupo:** `1` (`executable_ids: [109]`).
- **Group Excess:** `1 - 1 = 0`.
- **Conclusão:** `lesan` (Executable ID #109) possui mapeamento 1:1 e não forma grupo muitos-para-um com outros executáveis.

### 2.3. Formas Ortográficas Únicas
- **`distinct_normalized_forms`:** **202** (Cada um dos 202 registros executáveis possui forma ortográfica única).
- **Formas Repetidas:** **0**.

---

## 3. Conclusão Definitiva
- **Veredito do Agrupamento:** **CASO B CONFIRMADO ($202 \rightarrow 202$, Excesso Relacional = 0)**.
- **Suíte de Testes:** **16/16 PASS (EXIT 0)** em `work/qa/scripts/test_velarim_executable_human_grouping.py`.
- **DOCX:** 100% intocado (`366da81fd81a4c0ef5a2518da7bb90bb3db1c22a737f4df4df53644f6e5197f9`).
