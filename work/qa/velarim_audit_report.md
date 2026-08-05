# Relatório Definitivo de Auditoria e Consistência Bidirecional — Velarim v2.0

## 1. Síntese Executiva da Consistência Bidirecional
A sincronização mecânica entre o **Crosswalk Direto** e o **Reverse Crosswalk** de Velarim foi concluída com 100% de precisão matemática e sem nenhuma inconsistência pendente:

- **$|H|$ (Total de Entradas Inventariadas / Verbetes Únicos):** **226 entradas inventariadas** (223 verbetes únicos).
- **$|E|$ (Verbetes Humanos Usados pela Expansão 202):** **202 verbetes** (`mapped_executable_ids = 202`, `orphan = 0`, `unresolved = 0`).
- **$|C|$ (Verbetes Humanos do Núcleo 1.0):** **23 verbetes**.
- **$|E \cap C|$ (Interseção Direta):** **0** (`E_inter_C_count = 0`).
- **$|E - C|$ (`expansion_only`):** **202 verbetes**.
- **$|C - E|$ (`core_only`):** **23 verbetes**.
- **$|H - (E \cup C)|$ (`variant_without_record`):** **1 entrada** (`ravun` L1299 / Human Entry ID #207).
- **$|E \cup C|$ (União Núcleo e Expansão):** **225 entradas**.
- **Inconsistências Forward / Reverse:** **0**.
- **Testes Automáticos:** **25/25 PASS (EXIT 0)** em `work/qa/scripts/test_velarim_bidirectional_consistency.py`.

---

## 2. Invariantes de `les` e `lesan`
- **`lesan` (Executable ID #109):** `Forward: 109 -> 123` | `Reverse: Entry #123 contém [109]` | Classificação: `expansion_only`.
- **`les` (Human Entry ID #106 / Core L793):** `Forward: null` | `Reverse: Entry #106 não contém 109` | Classificação: `core_only`.

---

## 3. Desbloqueio Editorial Definitivo
- **`VELARIM_AUDIT_PENDING`:** **TOTALMENTE ENCERRADO E LIBERADO**.
- **Capítulo 15 (Velarim, Merge e Coro):** **LIBERADO PARA REVISÃO NO LOTE 14–16**.
- **Apêndice B (Velarim Conversacional v2.0):** **LIBERADO PARA REVISÃO NO LOTE DE APÊNDICES**.
