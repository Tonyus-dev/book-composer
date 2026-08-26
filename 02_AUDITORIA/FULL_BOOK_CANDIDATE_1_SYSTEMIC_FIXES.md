# FULL BOOK — CANDIDATE 1 — SYSTEMIC FIXES

Data: 2026-08-22  
Status: INCIDENTE — NÃO APROVADO

## Resultado

O materializador real processou o manuscrito completo sem perda de blocos:

- Candidate 0: 360 páginas.
- Candidate 1: 368 páginas.
- Blocos fonte/materializados: 4.382/4.382.
- Texto perdido/adicionado/reescrito: 0/0/0.
- Overflow: 0.
- `MAP_SPREAD`: 2 (antes: 0).
- Aberturas `PART_HERO`: 6.

O gate editorial falhou por `INVALID_IMAGE_PLACEMENTS=1`. O placement inválido está na página 177, na abertura da Parte IV: o asset `/assets/partes/parte-iv-memoria.png` conserva o anchor `Memória, Pedr’alma e Fé`, enquanto o heading real é `PARTE IV — VELARIM`. Esse metadado não foi mascarado nem convertido em aprovação.

## Exportação

O exportador iniciou o fluxo real Chromium, mas abortou durante a consolidação dos chunks. Foram produzidos chunks apenas até a página 300 de 368; não existe PDF completo Candidate 1 válido para entrega.

O artefato parcial em `/tmp/kallistis-full-candidate-1.pdf` tem 300 páginas e não deve ser tratado como livro final.

## Integridade e escopo

Manuscrito, catálogo, manifesto e arquivos de curadoria não foram alterados nesta rodada. Candidate 0 permaneceu preservado. Nenhum commit, push ou PR foi realizado. Não houve execução do full book além desta tentativa Candidate 1.

## Próxima ação exata

Corrigir somente a ligação semântica do asset da Parte IV, reproduzir o Candidate 1 completo e investigar o abort do chunk 300 antes de qualquer aprovação visual. Requer revisão humana antes de nova materialização.

