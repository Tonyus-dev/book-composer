# KALLISTIS — Padrão técnico de tabelas

## Objetivo

Definir o padrão editorial e técnico das tabelas do Livro Básico.

Aplicação:

- tabelas do capítulo 7;
- regras centrais;
- magia;
- Evocações;
- equipamentos;
- artefatos;
- bestiário;
- referência rápida;
- Velarim;
- apêndices.

Regra absoluta:

> Melhorar a apresentação sem alterar uma única célula de conteúdo.

Antes de formatar, gerar manifest com:

- índice;
- capítulo;
- título;
- número de linhas;
- número de colunas;
- texto de cada célula;
- hash do conteúdo concatenado.

---

## 1. Paleta

| Elemento | Cor |
|---|---|
| Cabeçalho principal | `#2E1C38` |
| Texto do cabeçalho | `#FFFFFF` |
| Borda superior | `#CBD5E1` |
| Borda inferior do cabeçalho | `#94A3B8` |
| Divisores horizontais | `#E2E8F0` |
| Linha alternada | `#F8FAFC` |
| Linha branca | `#FFFFFF` |

Evitar fundo escuro em grandes blocos de texto e manter boa impressão em escala de cinza.

---

## 2. Configuração geral

### Alinhamento

- tabela centralizada na área útil da página;
- nomes e descrições alinhados à esquerda;
- números, níveis, custos e frequências centralizados.

### Padding

```text
superior: 120 dxa
inferior: 120 dxa
esquerdo: 150 dxa
direito: 150 dxa
```

### Cabeçalho

- fundo `#2E1C38`;
- texto branco;
- negrito;
- alinhamento vertical central;
- repetir em páginas seguintes;
- impedir divisão da linha.

OOXML esperado:

```xml
<w:tblHeader/>
<w:cantSplit/>
```

### Linhas

Zebra:

```text
linha ímpar: #F8FAFC
linha par: #FFFFFF
```

Não usar zebra em:

- cards de adversário;
- tabelas de uma linha;
- caixas de referência;
- glossário.

### Bordas

- borda superior: `0,75 pt`, `#CBD5E1`;
- borda inferior do cabeçalho: `1,0 pt`, `#94A3B8`;
- divisores horizontais: `0,5 pt`, `#E2E8F0`;
- evitar bordas verticais pesadas.

### Fonte

- manter a família tipográfica do livro;
- corpo entre 8,5 e 10 pt;
- cabeçalho entre 9 e 10 pt;
- nunca reduzir abaixo de 8,5 pt para forçar encaixe.

---

## 3. Retrato e paisagem

### Retrato

Usar quando houver:

- até quatro colunas médias;
- texto curto;
- nenhuma coluna extensa de descrição.

### Paisagem

Criar seção em paisagem quando houver:

- cinco ou mais colunas relevantes;
- estatísticas completas;
- descrições longas;
- catálogos de magia ou equipamento;
- adversários;
- dicionário de Velarim;
- comparações regionais extensas.

A seção deve:

- começar antes da tabela;
- terminar depois da tabela;
- manter numeração contínua;
- preservar cabeçalho e rodapé;
- não criar página vazia desnecessária.

### Proibições

Não:

- esmagar colunas;
- empilhar campos sem rótulo;
- reduzir fonte excessivamente;
- separar rótulo e valor;
- forçar tabela larga em retrato;
- usar espaços ou tabs para alinhar conteúdo.

---

## 4. Tabelas do capítulo 7

Preservar o padrão já aplicado pelo Antigravity:

- centralização;
- padding 120/150 dxa;
- cabeçalho violeta;
- texto branco;
- cabeçalho repetível;
- linhas indivisíveis;
- bordas horizontais leves;
- zebra;
- zero alteração de conteúdo.

### Técnicas

Estrutura típica:

```text
Nível | Técnica | Efeito | Custo/Limite
```

Larguras sugeridas:

- Nível: 10%;
- Técnica: 24%;
- Efeito: 50%;
- Custo/Limite: 16%.

Preservar a ordem original quando ela for diferente.

### Chaves

Estrutura típica:

```text
Ofício | Chave | Função | Risco/condição
```

Não criar colunas inexistentes na fonte.

### Progressão

- colunas numéricas com largura fixa;
- descrição recebe o espaço restante.

---

## 5. Modelos por categoria

### Catálogo mecânico

Usar para:

- armas;
- armaduras;
- magias;
- técnicas;
- artefatos;
- capacidades.

Regras:

- nome à esquerda;
- valores numéricos centralizados;
- tags em coluna própria;
- notas abaixo da tabela.

### Estatísticas de adversário

Ordem canônica:

```text
Ofensiva | Guarda | Fortitude | Integridade |
Vitalidade | Proteção | Movimento | Dano-base
```

Preferir:

- linha única em paisagem; ou
- grade 4 × 2.

Nunca separar os valores dos respectivos rótulos.

### Card de adversário

Nome e subtítulo fora da tabela.

Bloco superior:

```text
Categoria | Natureza | Porte | Papel tático
Habitat típico
Objetivo ou impulso
```

Depois:

1. estatísticas;
2. descrição;
3. traços;
4. ações;
5. técnicas;
6. reação;
7. Predominância e Ressonância;
8. outra saída;
9. vestígios e consequências.

### Referência rápida

Usar tabelas independentes para:

- dificuldade;
- grau de resultado;
- Predominância;
- dano;
- multiplicadores;
- Proteção;
- movimento;
- condições;
- Coro;
- recursos.

Não criar uma tabela única gigantesca.

### Glossário

Preferir:

```text
Termo: definição.
```

Com termo em negrito, recuo suspenso e uma entrada por parágrafo.

### Velarim

Estrutura típica:

```text
Forma | Classe | Significado | Observação/uso
```

Regras:

- paisagem quando necessário;
- não justificar;
- repetir cabeçalho;
- não dividir entrada;
- preservar diacríticos;
- desativar autocorreção sobre termos de Velarim.

### Correspondências regionais

```text
Camada da Luz | Camada da Escuridão | Natureza da correspondência
```

A terceira coluna deve ser a mais larga.

---

## 6. Títulos, notas e quebras

### Título

- parágrafo próprio acima da tabela;
- estilo específico;
- `keepWithNext`;
- nunca dentro da primeira célula.

### Notas

- abaixo da tabela;
- fonte discretamente menor;
- alinhamento à esquerda;
- não colocar em coluna numérica.

### Quebra de página

- repetir cabeçalho;
- impedir divisão de linhas mecânicas curtas;
- manter título com ao menos duas linhas da tabela;
- evitar página com apenas o cabeçalho;
- permitir continuação de tabelas longas.

---

## 7. Acessibilidade

Cada tabela deve ter:

- primeira linha marcada como cabeçalho;
- ordem de leitura lógica;
- nenhum uso de células vazias apenas para espaço;
- nenhuma fusão confusa;
- título ou descrição anterior;
- abreviações explicadas;
- contraste suficiente;
- informação não codificada apenas por cor.

---

## 8. Controle de integridade

Comparar antes e depois:

- número de tabelas;
- linhas;
- colunas;
- texto de cada célula;
- números;
- símbolos;
- multiplicadores;
- sinais `+` e `-`;
- custos;
- frequências;
- alcances;
- condições.

Resultado obrigatório:

```text
diferenças de conteúdo: 0
```

Mudanças permitidas:

- largura;
- alinhamento;
- padding;
- borda;
- shading;
- estilo;
- orientação;
- quebra de página.

---

## 9. QA visual

Depois de cada grupo:

1. exportar o DOCX completo com LibreOffice;
2. renderizar as páginas afetadas;
3. verificar página anterior e seguinte;
4. conferir cabeçalhos repetidos;
5. conferir linhas alternadas;
6. conferir células cortadas;
7. conferir sobreposição;
8. conferir rótulos e valores;
9. conferir espaços vazios;
10. comparar com o manifest.

---

## 10. Commits recomendados

```text
tabelas-01-capitulo-07-validado
tabelas-02-regras-centrais
tabelas-03-magia-evocacoes
tabelas-04-equipamentos
tabelas-05-adversarios
tabelas-06-referencia-rapida
tabelas-07-velarim
tabelas-08-apendices
```

Não misturar alteração de prosa e tabela no mesmo commit.

---

## 11. Gate final

Uma tabela só é aprovada quando:

- conteúdo idêntico ao baseline;
- render legível;
- fonte mínima respeitada;
- orientação adequada;
- cabeçalho repetível;
- rótulo e valor inseparáveis;
- nenhuma linha mecânica quebrada;
- nenhuma célula perdida;
- nenhuma mudança numérica;
- DOCX abre sem reparo;
- PDF preserva a tabela.
