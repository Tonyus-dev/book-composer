# Relatório Final de Auditoria Fidedigna de Velarim

## 1. Síntese Executiva
A auditoria de fidelidade do baseline de Velarim foi concluída com 100% de conformidade com os manuais oficiais, registrando:
- **Núcleo Imutável v1.0 LOCKED:** 48 registros (com `silmari` = `TECH` e `mirveth` = `LEX_CAN`).
- **Distribuição dos 48 Registros:** `CAN: 17`, `LEX_CAN: 6`, `SRC: 6`, `TECH: 13`, `PROV: 6` (`TOTAL: 48`).
- **Expansão Conversacional Canônica:** 202 registros.
- **Total de Registros Ativos Declarados:** 250 registros ($48 + 202 = 250$).
- **Contagem Legada Reconciliada:** 223 registrado como `legacy_or_methodological_count`.
- **Manifesto Gramatical:** 44 regras individuais extraídas semanticamente.
- **Testes Automáticos de Validação:** **30/30 PASS (EXIT 0)**.

---

## 2. Reconciliação Documental de Contagens

| Valor | Unidade de Medida | Fonte Canônica | Status / Classificação |
|-------|-------------------|----------------|------------------------|
| **48** | Registros do Núcleo v1.0 `LOCKED` | Manual Definitivo v1.0 | `canônico` |
| **202** | Registros da Expansão Conversacional | Manual Expandido v2.0-RC1 | `canônico` |
| **250** | Registros Ativos Declarados | v2.0 Approval & Manual v2.0 | `canônico` |
| **223** | Subtotal Metodológico Anterior | Contagem metodológica legada | `legacy_or_methodological_count` |
| **271** | Linhas de Tabelas Lexicais | Manual v2.0-RC1 | `documentado` (inclui variantes dialetais) |
| **266** | Formas Textuais Únicas em v2.0 | Manual v2.0-RC1 | `documentado` |
| **525** | Linhas de Tabelas Brutas | Manual v1.0 + v2.0-RC1 | `contagem_bruta_de_tabelas` |
| **377** | Formas Textuais Únicas Extraídas | Manuais e Apêndices | `extração_ampla_de_corpus` |

---

## 3. Confirmação de Integridade
- **Modificações no `work/working_copy.docx`:** **0** (Documento-fonte 100% intocado).
- **Formas Inventadas Hardcoded:** **0** (Todas as 6 formas Sil-* foram eliminadas).
- **Política `VELARIM_AUDIT_PENDING`:** Permanece **ATIVA** até autorização para o Lote 14–16.
