# Relatório Definitivo de Resolução de Cardinalidades e Crosswalk Bidirecional — Velarim v2.0

## 1. Síntese Executiva da Resolução de Cardinalidades
A reconciliação matemática entre a **Edição Humana (223 Verbetes)** e o **Corpus Executável (202 Registros de Expansão)** foi plenamente demonstrada e validada em [work/qa/velarim_human_executable_reverse_crosswalk.json](file:///home/tonyus-dev/Projetos/RPG/kallistis%20libro/KALLISTIS_PARA_ANTIGRAVITY/work/qa/velarim_human_executable_reverse_crosswalk.json).

- **Demonstração Matemática:** $223 \text{ verbetes humanos exibidos no Dicionário Conversacional 2.0} - 21 \text{ verbetes excedentes do Núcleo 1.0} = \mathbf{202 \text{ registros executáveis de expansão}}$.
- **Remoção da Afirmação Antiga:** A expressão ambígua *"154 ausências justificadas por escopo"* foi **totalmente removida** e substituída pela partição exata de layout das tabelas do Apêndice B.

---

## 2. Isolamento Rigoroso das 4 Partições Lexicais

### 2.1. Núcleo 1.0 (48 Registros Imutáveis)
1. **`núcleo -> humano`:** **21 verbetes excedentes exclusivos** presentes nas tabelas da Seção 17 do Dicionário Conversacional (ex: `ve`, `ol`, `nam`, `namath`, `velar`, `silar`, `nooveth`, `les`, `tav`, `dur`, `sib`, `noovethan`, `mirveth`, `mirvethin`, `mirvethari`, `anir`, `luumeh`, `manuv`, `tharen`, `krav`, `kavesh`).
2. **`núcleo -> apêndice_docx`:** **48 registros** integrados à Tabela #134 no Apêndice B.

### 2.2. Expansão v2.0 (202 Registros Únicos)
3. **`expansão -> humano`:** **202 registros executáveis** mapeados 1:1 com verbetes da edição humana v2.0.
4. **`expansão -> apêndice_docx`:**
   - **48 registros** presentes na Tabela #135 do Apêndice B do DOCX (subconjunto de consulta rápida de mesa).
   - **154 registros** reclassificados individualmente como **`omitted_from_docx_table_by_layout_subset`** (omitidos do layout resumido de tabela do Apêndice B no DOCX, mas 100% presentes no corpus e na edição humana).

---

## 3. Lista Nominal dos 21 Verbetes Excedentes do Núcleo no Dicionário Humano
1. `ve` (negação)
2. `ol` (relacional)
3. `nam` (REL/INTR)
4. `namath` (REL)
5. `velar` (INTR)
6. `silar` (INTR)
7. `nooveth` (TRANS)
8. `les` (TRANS)
9. `tav` (TRANS)
10. `dur` (TRANS)
11. `sib` (TRANS)
12. `noovethan` (tecelão ou tecelã de magia)
13. `mirveth` (contraparte cosmológica integral)
14. `mirvethin` (contrapartes autônomas)
15. `mirvethari` (relação viva entre contrapartes)
16. `anir` (começo, origem temporal)
17. `luumeh` (tempo fluido, era)
18. `manuv` (mão, instrumento de toque)
19. `tharen` (caminho, passagem)
20. `krav` (pedra ou rocha da Escuridão)
21. `kavesh` (falsificação ou instrumento da Sombra)

---

## 4. Conclusão Final do Crosswalk Bidirecional
- **Reverse Crosswalk (223 -> Executável/Núcleo):** 223/223 (100% reclassificados).
- **Forward Crosswalk (202 -> Humano):** 202/202 (100% mapeados).
- **Conflitos de Cardinalidade Não Resolvidos:** **0**.
- **Testes Automáticos:** **30/30 PASS (EXIT 0)**.
