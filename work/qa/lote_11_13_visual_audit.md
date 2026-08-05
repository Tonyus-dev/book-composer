# Auditoria Visual Real — Lote 11–13 (Páginas 133 a 144)

## 1. Tabela de Auditoria por Página

| Página | Capítulo | Conteúdo Principal | Tabela Presente | Cabeçalho Repetido | Linha Dividida | Célula Cortada | Texto Sobreposto | Título Órfão | Espaço Vazio Anormal | Legibilidade | Resultado |
|--------|----------|---------------------|-----------------|-------------------|----------------|----------------|------------------|--------------|----------------------|--------------|-----------|
| **133** | Cap. 11 | Abertura do Capítulo 11, Consequências e Ruptura | Não | N/A | Não | Não | Não | Não | Não | Excelente | **PASS** |
| **134** | Cap. 11 | Testes Prolongados e Relógios de Progresso | Não | N/A | Não | Não | Não | Não | Não | Excelente | **PASS** |
| **135** | Cap. 12 | Abertura do Capítulo 12, Grade Ortogonal, Escala | Não | N/A | Não | Não | Não | Não | Não | Excelente | **PASS** |
| **136** | Cap. 12 | Movimento, Iniciativa e Ataques (Corpo a Corpo / Distância) | Não | N/A | Não | Não | Não | Não | Não | Excelente | **PASS** |
| **137** | Cap. 12 | Cobertura, Linha de Efeito, Áreas e Objetivos | Sim (Tabela #28 Cobertura) | Sim (`tblHeader`) | Não (`cantSplit`) | Não | Não | Não | Não | Excelente | **PASS** |
| **138** | Cap. 13 | Abertura do Capítulo 13, Estrutura da Magia, Graus | Sim (Tabela #29 Estrutura e #30 Graus) | Sim (`tblHeader`) | Não (`cantSplit`) | Não | Não | Não | Não | Excelente | **PASS** |
| **139** | Cap. 13 | Tradições Mágicas e Regras de Conjuração | Sim (Tabela #31 Tradições) | Sim (`tblHeader`) | Não (`cantSplit`) | Não | Não | Não | Não | Excelente | **PASS** |
| **140** | Cap. 13 | Catálogo de Magias — Grau 0 (6 Magias) | Sim (Tabela #32 Magias Grau 0) | Sim (`tblHeader`) | Não (`cantSplit`) | Não | Não | Não | Não | Excelente | **PASS** |
| **141** | Cap. 13 | Catálogo de Magias — Grau 1 (8 Magias) | Sim (Tabela #33 Magias Grau 1) | Sim (`tblHeader`) | Não (`cantSplit`) | Não | Não | Não | Não | Excelente | **PASS** |
| **142** | Cap. 13 | Catálogo de Magias — Grau 2 (8 Magias) | Sim (Tabela #34 Magias Grau 2) | Sim (`tblHeader`) | Não (`cantSplit`) | Não | Não | Não | Não | Excelente | **PASS** |
| **143** | Cap. 13 | Catálogo de Magias — Grau 3 (6 Magias) e Ilustração | Sim (Tabela #35 Magias Grau 3) | Sim (`tblHeader`) | Não (`cantSplit`) | Não | Não | Não | Não | Excelente | **PASS** |
| **144** | Cap. 13 / 14 | Final da Seção de Magias e Abertura do Capítulo 14 | Não | N/A | Não | Não | Não | Não | Não | Excelente | **PASS** |

---

## 2. Localização Exata do Reflow de Páginas (+1 Página)

- **Primeira página que diverge:** **Página 136**.
- **Tabelas que provocaram o reflow:**
  1. **Tabela #28 (Cobertura) no Capítulo 12 (Página 136-137):** O padding de célula de `120 dxa` superior/inferior e `150 dxa` esquerdo/direito expandiu a tabela de cobertura, empurrando as 3 linhas de dano verdadeiro e resumo de cobertura do rodapé da página 136 para o topo da página 137.
  2. **Tabelas #32 a #35 (Catálogo de Magias de Grau 0 a Grau 3) no Capítulo 13 (Páginas 140-143):** O padding de célula e os cabeçalhos em tom violeta `#2E1C38` de 7 colunas expandiram verticalmente os quadros de magias, deslocando o encerramento do Capítulo 13 para a página 144.
- **Capítulo 14 (Evocações):** Deslocado da página 144 para a página 145.
- **Escopo Fora do Lote (Capítulos 15–22 e Apêndices A–F):** Texto e estrutura perfeitamente preservados, acompanhando o deslocamento limpo de +1 página sem qualquer quebra de fluxo ou reflow corrompido.
