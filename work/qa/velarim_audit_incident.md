# INCIDENTE E INVALIDAÇÃO FORMAL DA AUDITORIA C6EDE50

## 1. Identificação do Incidente
- **Commit Invalidado:** `c6ede50` (*audit: concluir baseline canônico de Velarim*)
- **Data da Detecção:** 2026-08-05
- **Estado do Bloqueio:** `VELARIM_AUDIT_PENDING` Permanece **ATIVO**
- **Capítulo 15 (Velarim, Merge e Coro):** **BLOQUEADO**
- **Apêndice B (Velarim Conversacional v2.0):** **BLOQUEADO**
- **Lote 14–16:** **NÃO AUTORIZADO**

---

## 2. Razões da Invalidação Técnica
1. **Formas Inventadas Hardcoded:** Inserção manual de 6 formas não extraídas literalmente das fontes (`Sil-Vael`, `Sil-Khor`, `Sil-Aet`, `Sil-Nox`, `Sil-Mir`, `Sil-Zul`).
2. **Atribuição Indevida:** Classificação dessas 6 formas como 'Formas Primordiais de Silmain' sem evidência textual direta nas fontes canônicas.
3. **Contradição Ortográfica:** Afirmação de que diacríticos deveriam ser preservados, ignorando a regra ortográfica normativa ASCII oficial do Velarim.
4. **Omissão Sintática:** Omissão da ordem SOV característica do Escuridão Cotidiano.
5. **Hashes Inválidos:** Geração de hashes baseados em rótulos genéricos ('fonologia', 'ortografia') em vez de usar o texto literal das fontes.
6. **Classificação Cega:** Tratar a primeira coluna de qualquer tabela Markdown como entrada lexical.
7. **Inferência de Classe Gramatical:** Classificação heurística automática de qualquer forma não verbal como 'substantivo/termo'.
8. **Contagens Não Reconciliadas:** Falha em reconciliar documentalmente os 48 registros do núcleo, 250 registros ativos declarados, 223 entradas de expansão, 271 linhas documentadas e 266 formas textuais únicas.
9. **Validação Cruzada Manual:** Estruturação da validação cruzada por meio de dados escritos à mão sem comparação programática entrada por entrada.
10. **Falsa Declaração de Zero Termos Inventados:** Declaração incorreta apesar do hardcode das formas Sil-*.
11. **Classificação Incorreta de Variante:** Classificação de 'Vélarim' como variante legítima, contrariando a regra de ortografia normativa ASCII.
12. **Uso Incorreto da Decisão E-001:** Aplicação indevida da Decisão E-001 (gênero de 'personagem') para tratar de ortografia de Velarim.

---

## 3. Decisão e Consequências
- Nenhuma conclusão ou artefato gerado no commit `c6ede50` possui autoridade para liberar o Capítulo 15 ou o Apêndice B.
- A auditoria canônica de Velarim deve ser reconstruída 100% do zero via extração automatizada, sem hardcode, sem suposições e com testes automatizados de validação (25/25 PASS).
- O arquivo `work/working_copy.docx` permanece intocado.
