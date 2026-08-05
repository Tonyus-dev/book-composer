# Relatório Definitivo de Resolução da Sobreposição de `les` — Velarim v2.0

## 1. Síntese Executiva da Sobreposição de `les`
A sobreposição de `les` no crosswalk bidirecional foi integralmente resolvida em [work/qa/velarim_human_executable_reverse_crosswalk.json](file:///home/tonyus-dev/Projetos/RPG/kallistis%20libro/KALLISTIS_PARA_ANTIGRAVITY/work/qa/velarim_human_executable_reverse_crosswalk.json) e [work/qa/velarim_executable_human_crosswalk.json](file:///home/tonyus-dev/Projetos/RPG/kallistis%20libro/KALLISTIS_PARA_ANTIGRAVITY/work/qa/velarim_executable_human_crosswalk.json).

- **Registro Nuclear de `les`:** `Core L793` (`forma: les`, `classe: verbo transitivo`, `significado: reconhecer; nomear com precisão`, `status: PROV`).
- **Natureza do ID 103:** O número 103 na Seção 17.3 é um `raw_index` de tabela que foi filtrado por ser sobreposição com o Núcleo 1.0 (L793). Portanto, `les` não possui `executable_id` na expansão final (`executable_id_les = null`).
- **Forma Derivada na Expansão (`lesan`):** Possui `executable_id = 109` (`forma: lesan`, `classe: testemunha, nomeador preciso`, `significado: depende de les; V1-PROV`).
- **Verbete Humano #106 (`les`):** Classificado unicamente como **`derived_expansion_under_core_lemma`** (lema nuclear que hospeda a entrada derivada da expansão `lesan` Executable ID #109).

---

## 2. Partição Mutuamente Exclusiva dos 223 Verbetes Humanos

| Categoria da Partição | Quantidade de Verbetes | Descrição e Validação |
|-----------------------|------------------------|-----------------------|
| `expansion_only` | **200** | Verbetes humanos exclusivos da expansão |
| `core_only` | **22** | Verbetes humanos exclusivos do Núcleo 1.0 (excluindo `les`) |
| `derived_expansion_under_core_lemma` | **1** | Verbete humano `les` (Lema nuclear hospedando `lesan` #109) |
| `core_and_expansion` | **0** | Nenhuma sobreposição não tratada |
| `expression_without_record` | **0** | Nenhuma expressão órfã |
| `variant_without_record` | **0** | Nenhuma variante órfã |
| `additional_sense_without_record` | **0** | Nenhum sentido sem registro |
| `unresolved` | **0** | Nenhum verbete não resolvido |
| **SOMA TOTAL DA PARTIÇÃO** | **223** | **Soma exata dos 223 verbetes humanos** |

---

## 3. Cobertura dos 202 Registros Executáveis
- **Total de Registros Executáveis:** **202** (`mapped_executable_ids_count = 202`, `orphan_executable_ids_count = 0`).
- **Formas Ortográficas Únicas na Expansão:** **201** (`exp_map = 201`).
- **Equação Cobertura Executável:** $\mathbf{202 \text{ registros executáveis}} \longrightarrow \mathbf{200 \text{ verbetes humanos da expansão}}$.
- **Equação Partição Humana:** $\mathbf{223 \text{ verbetes humanos}} = \mathbf{200 \text{ expansion\_only}} + \mathbf{22 \text{ core\_only}} + \mathbf{1 \text{ derived\_expansion\_under\_core\_lemma}}$.
- **União Real:** $|\text{human\_expansion} \cup \text{human\_core}| = 200 + 23 = \mathbf{223 \text{ verbetes humanos únicos}}$.

---

## 4. Conclusão Definitiva
- **Sobreposição de `les`:** Resolvida (`les` = `derived_expansion_under_core_lemma`, `lesan` = `expansion_only`).
- **Partição dos 223:** Soma exatamente **223**.
- **Testes Automatizados:** **14/14 PASS (EXIT 0)**.
