# Relatório Definitivo de Consistência Bidirecional entre Crosswalk Direto e Reverso — Velarim v2.0

## 1. Síntese Executiva das Operações de Conjunto
A sincronização mecânica entre o **Crosswalk Direto (202 Executáveis $\rightarrow$ 202 Verbetes Humanos)** e o **Reverse Crosswalk (226 Entradas Inventariadas / 223 Verbetes Únicos)** foi concluída com 100% de consistência bidirecional:

- **$|H|$ (Verbetes Humanos Inventariados):** **226 entradas inventariadas** (ou 223 verbetes únicos).
- **$|E|$ (Verbetes Humanos Usados pelos 202 Executáveis):** **202**.
- **$|C|$ (Verbetes Humanos Associados ao Núcleo 1.0):** **23**.
- **$|E \cap C|$ (Interseção Núcleo/Expansão):** **0** (Nenhum registro executável literal da expansão compartilha `human_entry_id` com a lista nuclear).
- **$|E - C|$ (`expansion_only`):** **202 verbetes** ($202 - 0 = 202$).
- **$|C - E|$ (`core_only`):** **23 verbetes** ($23 - 0 = 23$).
- **$|H - (E \cup C)|$ (`variant_without_record`):** **1 entrada** (`ravun` L1299 / Human Entry ID #207).
- **$|E \cup C|$ (União Núcleo e Expansão):** **225 entradas** ($202 + 23 = 225$).

---

## 2. Invariantes Bidirecionais de `les` e `lesan`

- **`lesan` (Executable ID #109):**
  - **Forward Mapping:** `109 -> human_entry_id 123` (`lesan`, L1190).
  - **Reverse Mapping:** Entry #123 (`lesan`) contém `executable_id = [109]`.
  - **Classificação Final:** `expansion_only`.

- **`les` (Human Entry ID #106 / Core L793):**
  - **Forward Mapping:** `executable_id = null`.
  - **Reverse Mapping:** Entry #106 (`les`) possui `matched_executable_ids = []` (NÃO contém 109).
  - **Classificação Final:** `core_only` (A designação `derived_expansion_under_core_lemma` foi removida por ausência de evidenciação relacional).

---

## 3. Reavaliação Individual dos 23 Itens Nucleares

| Item | Human Entry ID | Core Line | Executable IDs | Pertence a E | Pertence a C | Classificação Final |
|------|----------------|-----------|----------------|--------------|--------------|---------------------|
| `ve` | #3 | L733 | `[]` | `False` | `True` | `core_only` |
| `ol` | #7 | L737 | `[]` | `False` | `True` | `core_only` |
| `nam` | #45 | L741 | `[]` | `False` | `True` | `core_only` |
| `namath` | #46 | L742 | `[]` | `False` | `True` | `core_only` |
| `veth` | #90 | L779 | `[]` | `False` | `True` | `core_only` |
| `velar` | #102 | L780 | `[]` | `False` | `True` | `core_only` |
| `silar` | #103 | L781 | `[]` | `False` | `True` | `core_only` |
| `nooveth` | #104 | L782 | `[]` | `False` | `True` | `core_only` |
| `vethari` | #105 | L783 | `[]` | `False` | `True` | `core_only` |
| `les` | #106 | L793 | `[]` | `False` | `True` | `core_only` |
| `tav` | #107 | L785 | `[]` | `False` | `True` | `core_only` |
| `dur` | #108 | L786 | `[]` | `False` | `True` | `core_only` |
| `sib` | #109 | L787 | `[]` | `False` | `True` | `core_only` |
| `noovethan` | #122 | L800 | `[]` | `False` | `True` | `core_only` |
| `mirveth` | #124 | L802 | `[]` | `False` | `True` | `core_only` |
| `mirvethin` | #125 | L803 | `[]` | `False` | `True` | `core_only` |
| `mirvethari` | #126 | L804 | `[]` | `False` | `True` | `core_only` |
| `anir` | #136 | L814 | `[]` | `False` | `True` | `core_only` |
| `luumeh` | #138 | L816 | `[]` | `False` | `True` | `core_only` |
| `manuv` | #140 | L818 | `[]` | `False` | `True` | `core_only` |
| `tharen` | #154 | L832 | `[]` | `False` | `True` | `core_only` |
| `krav` | #167 | L845 | `[]` | `False` | `True` | `core_only` |
| `kavesh` | #188 | L866 | `[]` | `False` | `True` | `core_only` |

---

## 4. Conclusão Definitiva
- **Inconsistências Forward/Reverse Restantes:** **0** (`inconsistencies_remaining = 0`).
- **Suíte de Testes:** **25/25 PASS (EXIT 0)** em `work/qa/scripts/test_velarim_bidirectional_consistency.py`.
- **DOCX:** 100% intocado (`366da81fd81a4c0ef5a2518da7bb90bb3db1c22a737f4df4df53644f6e5197f9`).
