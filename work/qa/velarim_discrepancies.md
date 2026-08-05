# Relatório Definitivo de Crosswalk Humano-Executável — Velarim v2.0

## 1. Visão Geral do Crosswalk
O crosswalk entre o **Corpus Executável de 202 Registros**, a **Edição Humana Canônica de 223 Verbetes** e o **Apêndice B do Livro Básico** foi totalmente concluído no manifesto [work/qa/velarim_executable_human_crosswalk.json](file:///home/tonyus-dev/Projetos/RPG/kallistis%20libro/KALLISTIS_PARA_ANTIGRAVITY/work/qa/velarim_executable_human_crosswalk.json).

---

## 2. Reconciliação entre Corpus Executável e Edição Humana

### 2.1. Ocorrência dos 223 Verbetes Humanos
- **Origem Documental:** As tabelas do Dicionário Conversacional 2.0 (Seção 17 do Manual v2.0-RC1 e Tabelas #135 a #144 do Apêndice B no DOCX).
- **Cálculo Fidedigno:** $226 \text{ linhas brutas de tabela} - 3 \text{ repetições no fraseário de interrogativos (mai, sai, rei)} = \mathbf{223 \text{ verbetes humanos exibidos}}$.

### 2.2. Ocorrência dos 202 Registros Executáveis Únicos
- **Cálculo Fidedigno:** $226 \text{ linhas brutas} - 23 \text{ sobreposições do núcleo 1.0} - 1 \text{ duplicata interna} = \mathbf{202 \text{ registros de expansão}}$.
- **Total Ativo do Idioma:** $48 \text{ (núcleo)} + 202 \text{ (expansão)} = \mathbf{250 \text{ registros ativos}}$.

---

## 3. Mapeamento dos Casos Especiais

| Termo | Núcleo 1.0 (v1.0) | Expansão (v2.0) | Resolução no Crosswalk |
|-------|-------------------|-----------------|------------------------|
| `silmain` | L766 (`TECH`, luzes dispersas) & L767 (`LEX_CAN`, escrita contínua) | Referenciado como sistema | Mantido com 2 entradas polissêmicas distintas no Núcleo 1.0. |
| `veth` | L779 (`CAN`, substantivo relacional) | Uso verbal `REL` | Mantido no Núcleo 1.0 com extensão verbal documentada no crosswalk. |
| `vethari` | L783 (`CAN`, substantivo/verbo relacional) | Uso verbal `REL` | Mantido no Núcleo 1.0 com extensão verbal documentada no crosswalk. |
| `ravun` | — | Verbete #33 (`V2-OP`) | Consolidado na Seção 17.4 ("Pessoas e relações"). |
| `lesan` | — | Verbete #24 (`V2-OP`) | Incorporado como forma nova da expansão v2.0 (diferente de `les`). |

---

## 4. Distribuição dos Status Lexicais e Canônicos
- **Status de Origem Literal (`source_status`):** `HUMAN_APPROVED` (148 entradas), `V2-OP` (54 entradas).
- **Status Canônico Final (`final_canonical_status`):** **`CANONICAL`** (100% dos 202 registros de expansão, após homologação formal na Decisão Editorial de 2026-08-01).

---

## 5. Conclusão Final do Crosswalk
- **Registros Executáveis Mapeados:** 202/202 (100% `one_to_one_literal` / `one_to_one_equivalent`).
- **Verbetes Humanos Reconciliados:** 223/223.
- **Conflitos Lexicais Não Resolvidos:** **0**.
- **Testes Automáticos:** **25/25 PASS (EXIT 0)**.
