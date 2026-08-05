# KALLISTIS — Correções do Claude para incorporar no Antigravity

## Objetivo

Este documento registra somente correções estruturais, editoriais e canônicas aproveitáveis do trabalho do Claude.

**Não fazer merge automático entre DOCX.**

Fluxo obrigatório:

```text
working_copy.docx do Antigravity
→ aplicar uma correção localizada
→ comparar com o baseline
→ renderizar
→ validar
→ commit
```

A autoridade continua sendo:

1. decisão humana registrada;
2. baseline e manifests do Antigravity;
3. documento-fonte canônico;
4. correções do Claude apenas como referência de solução.

---

## 1. Prosa já decidida

### Prólogo

Preservar integralmente a versão original aprovada, incluindo:

> Ninguém viu a Fratura chegar, porque ela não chegou — aconteceu por dentro, como um osso que se lembra de ter sido quebrado antes mesmo da dor.

Não incorporar a versão expositiva do Claude.

### Capítulo 1

Preservar a prosa original, inclusive:

> Há aventura aqui, e combate, e magia, e exploração — mas o eixo do jogo não é conquistar terreno.

Manter a decisão editorial:

```diff
- Em KALLISTIS, os personagens:
+ Em KALLISTIS, as personagens:
```

---

## 2. Correções estruturais aproveitáveis

### 2.1 Títulos grudados

Separar em parágrafos próprios, com o estilo correto:

- Guarda;
- Integridade;
- Movimento.

Validar que:

- o título não foi duplicado;
- o parágrafo anterior e o posterior permaneceram literais;
- a paginação continua funcional.

### 2.2 Palavras coladas e defeitos de conversão

Exemplo confirmado:

```diff
- Pontariacontra
+ Pontaria contra
```

Pesquisar também por:

- palavra minúscula colada a maiúscula;
- hífen ou travessão convertido em caractere estranho;
- número colado ao termo seguinte;
- título anexado à última frase de um parágrafo;
- marcadores invisíveis dentro de palavras.

Não usar substituição global sem revisão individual.

### 2.3 Blocos de adversários

A edição Claude melhorou a legibilidade dos 52 blocos de adversários.

Ordem recomendada:

1. nome;
2. subtítulo;
3. categoria;
4. natureza;
5. porte;
6. papel tático;
7. habitat típico;
8. objetivo/impulso;
9. estatísticas;
10. descrição;
11. traços;
12. ações;
13. técnicas;
14. reação, quando houver;
15. Predominância e Ressonância;
16. outra saída;
17. vestígios e consequências.

Não alterar:

- Ofensiva;
- Guarda;
- Fortitude;
- Integridade;
- Vitalidade;
- Proteção;
- Movimento;
- Dano-base;
- multiplicadores;
- alcance;
- frequência;
- limite por cena;
- condições;
- texto canônico.

### 2.4 Glossário

Separar cada entrada em bloco próprio:

```text
Termo: definição.
```

Aplicar:

- termo em negrito;
- definição em texto normal;
- uma entrada por parágrafo;
- recuo suspenso;
- alinhamento à esquerda;
- sem alteração de definição.

### 2.5 Referência rápida

Aproveitar a solução estrutural do Claude para:

- dificuldades;
- dano;
- Predominância;
- Ressonância;
- Coro;
- movimento;
- condições;
- gramática de Velarim;
- valores rápidos de adversários.

Converter apenas estruturas realmente tabulares em tabelas.

Não transformar prosa explicativa em tabela.

### 2.6 Legendas

A edição Claude criou 33 legendas:

- 22 figuras;
- 11 mapas.

Incorporar somente quando:

- a legenda identifica corretamente a imagem;
- não duplica texto;
- não altera o cânone;
- usa estilo de legenda;
- fica presa à imagem correspondente.

Não numerar ornamentos, fundos ou separadores.

### 2.7 Sumário e índice

Pode-se reutilizar a arquitetura:

```text
TOC \o "1-3" \h \z \u
```

Mas só considerar pronto quando:

- o campo estiver atualizado;
- os números de página aparecerem;
- os links funcionarem;
- o PDF incluir o sumário;
- o índice exibir termos e páginas;
- não houver mensagem “Atualize este campo”.

---

## 3. Correções canônicas do conto “O Cristal e a Fresta”

O conto deve ser tratado como narrativa complementar, não como substituto dos capítulos 1–4.

Rótulo recomendado:

```text
O CRISTAL E A FRESTA
Conto de abertura de KALLISTIS

Narrativa complementar.
A narradora expressa tradições, interpretações e memórias próprias.
Este texto não substitui a formulação canônica do Livro Básico.
```

### 3.1 Os mundos não são territórios vizinhos

Substituir a ideia de “contrafortes do lado escuro” por uma visão da Fenda ou de ecos visuais instáveis.

Sugestão:

> O rapaz olhou para o leste, onde o Planalto descia até as estruturas de contenção. Além delas, a névoa e o brilho irregular da Fenda escondiam qualquer imagem confiável do outro mundo.

### 3.2 A Fenda não é confirmada como ser vivo

Evitar:

> coisa viva, respirando instável

Preferir:

> uma ruptura que parecia respirar, instável, sob a pressão de relações que ninguém controlava por inteiro

Manter claro que não há prova de consciência ou vontade própria.

### 3.3 As almas não foram partidas “ao meio”

Preferir:

> A Fratura também alcançou as almas. De cada origem surgiram duas pessoas inteiras, uma na Luz e outra na Escuridão.

### 3.4 Primeiro Conselho

Evitar “representantes de quase todo povo dos dois mundos”.

Preferir:

> representantes de quase todos os Povos conhecidos

### 3.5 Kethrell

Preferir:

> um magista e pesquisador chamado Kethrell

### 3.6 Krav-Nam

Transformar a propriedade inventada em tradição local:

> alguns viajantes juravam nunca ter atravessado Krav-Nam duas vezes do mesmo modo

### 3.7 Nimaris

Evitar confirmar sabotagem ou intenção.

Preferir:

> cuja ancoragem cósmica foi deslocada — por quem, por quê, ou mesmo se houve intenção, ninguém sabia

### 3.8 Bosque dos Ecos

Evitar futuro confirmado.

Preferir:

> sons de coisas que talvez ainda aconteçam misturados aos de acontecimentos antigos

---

## 4. O que não incorporar

Não incorporar:

- “Edição Claude v1.1”;
- crédito editorial à ferramenta;
- reescrita inferior do Prólogo;
- reescrita expositiva do capítulo 1;
- redução automática de polissíndetos;
- simplificação de distinções cosmológicas;
- TOC vazio;
- índice vazio;
- bookmarks excessivos;
- metadados contraditórios;
- alterações de mecânica sem comparação literal.

Identidade final recomendada:

```text
KALLISTIS — Livro Básico
Memória, Fratura e Escolha entre Dois Mundos
Antônio de Oliveira
Idealizador & Primeiro Guardião
Edição Definitiva
```

---

## 5. Ordem de incorporação

Commits separados:

```text
merge-claude-01-erros-de-conversao
merge-claude-02-adversarios
merge-claude-03-referencia-rapida
merge-claude-04-glossario
merge-claude-05-legendas
merge-claude-06-toc-indice
merge-claude-07-conto-correcao-canonica
```

Depois de cada commit:

1. comparar com o baseline;
2. provar zero alteração numérica indevida;
3. exportar com LibreOffice;
4. renderizar páginas afetadas;
5. verificar página anterior e seguinte;
6. registrar decisão em QA.

---

## 6. Gate de aceitação

Uma correção só entra quando:

- a mudança é localizada;
- o diff é compreensível;
- números e regras permanecem idênticos;
- nenhuma imagem desapareceu;
- nenhuma tabela perdeu célula;
- o DOCX abre sem reparo;
- o PDF mantém o conteúdo;
- as páginas afetadas foram inspecionadas;
- a mudança melhora o livro de forma demonstrável.
