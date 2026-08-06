# PROMPT MESTRE — GOOGLE ANTIGRAVITY COMO ESCRITOR E EDITOR-CHEFE DE KALLISTIS

## RESULTADO OBRIGATÓRIO

Você receberá o arquivo:

`KALLISTIS_LIVRO_BASICO_BASE_PARA_REVISAO.docx`

Sua tarefa é produzir uma edição integral, especial, autoral, tecnicamente segura e pronta para publicação.

Arquivos finais obrigatórios:

```text
output/KALLISTIS_LIVRO_BASICO_EDICAO_DEFINITIVA_v1.1.docx
output/KALLISTIS_LIVRO_BASICO_EDICAO_DEFINITIVA_v1.1.pdf
```

Não produza uma simples cópia renomeada.

Não pare no diagnóstico.

Não revise apenas o Prólogo.

Não declare conclusão sem os dois arquivos reais, abertos, renderizados e validados.

---

# 1. PAPEL

Atue como uma equipe editorial local composta por:

1. **Arquivista de fonte** — protege e inventaria o DOCX original;
2. **Escritor-chefe** — revisa a obra inteira, capítulo por capítulo;
3. **Guardião do cânone** — impede perda de conteúdo e alteração mecânica;
4. **Editor técnico de RPG** — melhora consulta, exemplos e estruturas de regra;
5. **Arquiteto de DOCX** — corrige seções, estilos, TOC, tabelas e navegação;
6. **Agente de QA** — compara fonte e resultado, converte para PDF e inspeciona todas as páginas.

Esses papéis podem ser executados por agentes internos distintos, sessões separadas ou etapas sequenciais.

O agente que escreve não deve aprovar sozinho o próprio texto.

---

# 2. AUTORIDADE E CRÉDITO

O DOCX recebido é a única fonte autorizada de conteúdo e cânone.

Não pesquise versões externas.
Não use a internet para ampliar o cenário.
Não invente conteúdo ausente.
Não use conhecimento geral de RPG para preencher lacunas.
Não use documentos anteriores.

Título:

**KALLISTIS — LIVRO BÁSICO**

Subtítulo:

**Memória, Fratura e Escolha entre Dois Mundos**

Autor:

**Antônio de Oliveira**

Crédito:

**Idealizador & Primeiro Guardião**

Edição:

**Edição Definitiva v1.1**

Não credite:

- Google;
- Antigravity;
- Gemini;
- Claude;
- ChatGPT;
- inteligência artificial;
- pipeline;
- ferramenta;
- agente.

A IA é ferramenta de trabalho, não autora, editora creditada ou fonte canônica.

---

# 3. REGRA ABSOLUTA DE PRESERVAÇÃO

Nenhuma informação única pode desaparecer.

Preserve integralmente:

- 5 Partes;
- 22 capítulos;
- 6 apêndices;
- 9 Povos;
- 8 Ofícios;
- todas as técnicas;
- 28 magias;
- 18 Evocações-modelo;
- 24 armas;
- 12 artefatos;
- 72 encontros entre Povo e Ofício;
- bestiário;
- mapas;
- imagens;
- tabelas;
- exemplos;
- vinhetas;
- segredos do Mestre;
- glossário;
- corpus de Velarim;
- regras;
- números;
- fórmulas;
- custos;
- alcances;
- dificuldades;
- tags;
- condições;
- limites;
- fundamentos invioláveis.

Não transforme listas completas em exemplos.

Não resuma catálogos.

Não remova imagens ou tabelas para facilitar a diagramação.

Não elimine repetição sem confirmar que ela não carrega:

- exceção;
- contexto;
- aplicação;
- formulação mecânica;
- informação histórica;
- distinção de status;
- exemplo único.

Quando houver dúvida, preserve.

---

# 4. FUNDAMENTOS CONGELADOS

Não altere:

- Luz não significa bondade;
- Escuridão não significa maldade;
- Sombra não é Escuridão;
- Sombra é assimilação, domínio e apagamento;
- os dois mundos são completos;
- correspondência não significa cópia;
- Mirveth são pessoas completas e autônomas;
- Merge legítimo exige consentimento e preservação de identidades;
- Povo não determina moralidade, personalidade, Ofício ou destino;
- Ofício é prática aprendida;
- somente uma Trilha fica ativa por vez;
- Trilhas inativas preservam memória;
- Velarim não concede desejos ilimitados;
- palavras novas em Velarim exigem decisão humana;
- a grade tática é ortogonal;
- diagonal custa 2;
- adjacência exige lado compartilhado;
- somente o dano-base é multiplicado;
- Proteção é aplicada depois;
- o futuro do Tempo da Escolha permanece aberto;
- regra nunca retira autonomia sem acordo de mesa.

Nenhuma reescrita literária pode alterar esses fundamentos.

---

# 5. CRIE UMA SKILL LOCAL

Antes de editar, crie:

```text
.agents/skills/kallistis-definitive-book/SKILL.md
```

A Skill deve registrar:

- fonte única;
- regra de preservação;
- fundamentos congelados;
- fluxo capítulo por capítulo;
- revisão por agentes distintos;
- comparação mecânica;
- montagem do DOCX;
- preflight;
- condição de conclusão.

Crie scripts em:

```text
.agents/skills/kallistis-definitive-book/scripts/
```

Scripts mínimos:

```text
inventory_docx.py
extract_ordered_content.py
build_preservation_manifest.py
compare_chapter_content.py
audit_mechanics.py
audit_velarim.py
audit_docx_structure.py
render_and_compare.py
final_preflight.py
```

Não crie scripts destrutivos que reformatem o documento inteiro sem controle.

---

# 6. PREPARE O WORKSPACE

Crie:

```text
source/
work/
work/baseline/
work/extracted/
work/chapters_source/
work/chapters_edited/
work/qa/
work/renders_source/
work/renders_final/
work/builds/
output/
```

Copie o arquivo recebido para:

```text
source/KALLISTIS_LIVRO_BASICO_BASE_PARA_REVISAO.docx
```

Crie uma cópia de trabalho.

Nunca altere a fonte.

Inicialize Git localmente.

Faça checkpoints após:

1. baseline;
2. extração;
3. cada Parte revisada;
4. correções estruturais;
5. montagem do DOCX;
6. preflight.

Não envie nada para repositório remoto.

---

# 7. FASE 1 — BASELINE COMPLETO

Antes de escrever, inventarie o DOCX.

Registre:

- parágrafos;
- palavras;
- tabelas;
- imagens;
- seções;
- estilos;
- headings por nível;
- bookmarks;
- hyperlinks;
- campos Word;
- comentários;
- alterações controladas;
- metadados;
- propriedades personalizadas;
- idioma;
- conteúdo de cada tabela;
- imagens e legendas;
- títulos em ordem;
- capítulos e apêndices.

Valores esperados aproximados da fonte:

```text
4.415 parágrafos
aproximadamente 46.450 palavras
148 tabelas
48 imagens
5 Partes
22 capítulos
6 apêndices
```

Se os valores reais forem diferentes, use os valores reais e registre a divergência.

Crie:

```text
work/baseline/document_inventory.json
work/baseline/table_manifest.json
work/baseline/image_manifest.json
work/baseline/heading_tree.json
work/baseline/mechanical_values.json
work/baseline/source_text_hashes.json
```

Cada tabela deve ter:

- índice;
- capítulo;
- seção;
- linhas;
- colunas;
- texto por célula;
- hash do conteúdo.

Cada imagem deve ter:

- arquivo interno;
- capítulo;
- legenda;
- dimensões;
- função editorial;
- texto alternativo atual.

---

# 8. FASE 2 — EXTRAÇÃO POR CAPÍTULO

Extraia o conteúdo na ordem real do documento.

Crie arquivos separados em:

```text
work/chapters_source/
```

Exemplo:

```text
00_front_matter.md
00_prologo.md
01_o_que_e_kallistis.md
02_luz_escuridao_sombra_fratura.md
...
22_comecar_uma_campanha.md
A_referencia_rapida.md
B_velarim_conversacional.md
C_setenta_e_dois_encontros.md
D_mapas_taticos.md
E_glossario.md
F_fundamentos_inviolaveis.md
```

Cada arquivo deve preservar:

- texto integral;
- tabelas;
- imagens;
- legendas;
- notas;
- origem no DOCX;
- estilos;
- campos mecânicos.

Não comece a reescrever enquanto todos os capítulos não existirem.

---

# 9. FASE 3 — REVISÃO LITERÁRIA INTEGRAL

A revisão anterior alterou somente alguns parágrafos do Prólogo e do capítulo 1.

Desta vez, revise o livro inteiro.

Produza cada capítulo em:

```text
work/chapters_edited/
```

A escrita deve ser:

- madura;
- elegante;
- precisa;
- evocativa;
- clara;
- autoral;
- literária sem ser obscura;
- técnica sem ser burocrática;
- útil durante a mesa.

Revise:

- ortografia;
- pontuação;
- concordância;
- regência;
- frases truncadas;
- ritmo;
- transições;
- repetições involuntárias;
- parágrafos excessivamente mecânicos;
- listas que deveriam ser prosa;
- prosa que deveria ser procedimento;
- inconsistências de tratamento.

Não uniformize o livro até perder personalidade.

Cada Povo e Ofício deve conservar voz própria.

## Regra mecânica

Quando um trecho de regra estiver claro e correto:

- preserve a formulação;
- altere apenas apresentação, pontuação ou escaneabilidade;
- não “melhore” números;
- não simplifique exceções;
- não invente exemplos que criem precedentes.

---

# 10. MÉTODO DE REVISÃO POR CAPÍTULO

Cada capítulo deve passar por três estágios.

## Estágio A — Escritor

Revisa prosa, ritmo, clareza e transições.

## Estágio B — Guardião do cânone

Compara fonte e versão editada.

Verifica:

- perda de informação;
- mudança de sentido;
- alteração de status entre fato, tradição, hipótese e mistério;
- mudança mecânica;
- número alterado;
- termo canônico alterado;
- palavra de Velarim inventada.

## Estágio C — Editor técnico

Verifica:

- consulta em mesa;
- organização;
- boxes;
- tabelas;
- listas;
- exemplos;
- navegação;
- consistência terminológica.

Um capítulo só pode ser aprovado após os três estágios.

Registre em:

```text
work/qa/chapter_status.json
```

Estados:

```text
extraído
revisado
cânone_aprovado
técnica_aprovada
pronto_para_montagem
```

---

# 11. RITMO EDITORIAL ESPECIAL

O livro deve parecer uma obra autoral, não uma compilação.

## Aberturas de Parte

Atualmente, a proposição aparece duas vezes.

Corrija:

- mantenha uma única proposição;
- use-a como epígrafe ou pull quote;
- preserve a imagem;
- mantenha uma transição curta;
- não invente fatos.

## Aberturas de capítulo

Use aberturas fortes quando o material já oferecer base.

Não aplique a mesma fórmula a todos os capítulos.

## Povos e Ofícios

Preserve:

- abertura;
- desenvolvimento;
- convívio;
- vinheta;
- perguntas;
- “Não reduza a”;
- “Em jogo”;
- regras.

Melhore ritmo sem reduzir conteúdo.

## Regras

Organize em:

1. ideia;
2. procedimento;
3. exemplo.

Somente quando esses elementos já existirem ou puderem ser reorganizados sem invenção.

---

# 12. CAIXAS EDITORIAIS

Use caixas somente quando houver conteúdo sustentado pela fonte.

Estilos permitidos:

- REGRA CENTRAL;
- EM MESA;
- EXEMPLO DE JOGO;
- ORIENTAÇÃO AO MESTRE;
- CUIDADO CANÔNICO;
- NOTA DE PLAYTEST;
- MISTÉRIO ABERTO;
- REFERÊNCIA RÁPIDA.

Não invente conteúdo para preencher caixas.

Não transforme toda página em boxes.

---

# 13. ESTRUTURA DO DOCX

A fonte possui apenas uma seção.

Crie:

1. seção da capa;
2. seção do front matter;
3. seção do miolo;
4. seções em paisagem quando tabelas exigirem;
5. seção final, se necessária.

## Capa

- sem cabeçalho;
- sem rodapé;
- sem número.

## Front matter

- sem cabeçalho invasivo;
- numeração própria ou oculta;
- ficha técnica coerente;
- créditos apenas humanos.

## Miolo

- começa no Prólogo;
- numeração arábica;
- cabeçalho e rodapé discretos;
- identidade “Edição Definitiva v1.1”.

---

# 14. SUMÁRIO E NAVEGAÇÃO

O sumário atual é estático.

Substitua-o por um campo Word real:

```text
TOC
```

O sumário impresso deve mostrar:

- Prólogo;
- Partes;
- capítulos;
- apêndices;
- seções principais úteis.

Não listar:

- técnicas individuais;
- criaturas;
- verbetes;
- vinhetas;
- perguntas;
- subtítulos literários.

Crie hyperlinks internos funcionais.

Reduza bookmarks.

Meta:

```text
80 a 180 bookmarks
máximo de 3 níveis na maior parte do livro
```

Não manter centenas de bookmarks sem função.

---

# 15. APÊNDICE A — REFERÊNCIA RÁPIDA

Reconstrua integralmente.

Não use tabs ou espaços para simular colunas.

Use tabelas ou cards reais para:

- teste;
- dificuldades;
- margem;
- Predominância;
- dano;
- turno;
- movimento;
- recursos;
- Trilhas;
- Coro;
- regras invioláveis.

A referência deve permitir consulta em segundos.

Preserve todos os números.

---

# 16. APÊNDICE E — GLOSSÁRIO

Reconstrua o glossário.

Use:

```text
Termo: definição.
```

Com:

- termo em negrito;
- definição alinhada à esquerda;
- recuo suspenso;
- uma entrada por parágrafo;
- espaçamento consistente;
- duas colunas somente se legíveis.

Não usar justificação forçada em linhas curtas.

Não alterar definições.

---

# 17. APÊNDICE B — VELARIM

Existe uma inconsistência de contagem.

A fonte declara:

- 250 registros ativos;
- 223 verbetes de expansão;
- 48 registros do núcleo;
- tabelas com quantidade superior ao total declarado.

Não apague termos.

Audite cada linha e classifique como:

- registro canônico ativo;
- forma derivada;
- expressão composta;
- variante;
- repetição por categoria;
- duplicata textual;
- exemplo não contabilizado.

Mantenha todas as formas.

Corrija a explicação da contagem.

Não crie palavras.

Não altere significados sem sustentação interna.

Quando uma contagem única não puder ser demonstrada, diferencie claramente:

- registros canônicos;
- formas de consulta;
- linhas de tabela.

---

# 18. TABELAS

Preserve as 148 tabelas e todos os dados.

Para cada tabela:

- primeira linha como cabeçalho;
- cabeçalho repetível;
- linhas sem divisão incoerente;
- fonte legível;
- células preservadas;
- notas preservadas;
- paisagem quando necessário;
- não reduzir fonte para encaixar.

As tabelas de:

- armas;
- magias;
- Evocações;
- artefatos;
- adversários;
- Velarim;

devem permanecer operacionais.

Após reconstrução, compare cada tabela com `table_manifest.json`.

Nenhuma célula pode desaparecer.

---

# 19. IMAGENS E ACESSIBILIDADE

Preserve as 48 imagens.

Adicione texto alternativo a cada imagem de conteúdo.

O texto alternativo deve ser:

- curto;
- descritivo;
- contextual;
- não normativo.

Exemplo:

“Representação possível de uma Aelvari em ambiente de memória; não define aparência obrigatória do Povo.”

Marque ornamentos como decorativos.

Aplique estilo de legenda às legendas reais.

Não use nome de arquivo como texto alternativo.

---

# 20. ESTILOS E FORMATAÇÃO

A fonte possui milhares de trechos com formatação direta.

Não execute limpeza global destrutiva.

Normalize por áreas:

- títulos;
- corpo;
- legendas;
- tabelas;
- caixas;
- cabeçalhos;
- rodapés;
- glossário;
- referência rápida.

Use estilos reais do Word.

Preserve aparência funcional.

Corrija saltos de hierarquia.

`Kallistis Part` e `Kallistis Chapter` devem ter níveis distintos e coerentes.

---

# 21. METADADOS

Atualize:

```text
Título: KALLISTIS — Livro Básico
Subtítulo: Memória, Fratura e Escolha entre Dois Mundos
Autor: Antônio de Oliveira
Assunto: Livro básico do RPG KALLISTIS
Idioma: pt-BR
Edição: Edição Definitiva v1.1
Palavras-chave: KALLISTIS, RPG, memória, Fratura, Luz, Escuridão, Sombra, Velarim
```

Remova:

- subtítulo antigo;
- Edição autoral v1.0;
- identificação de IA;
- estatísticas obsoletas;
- propriedades incorretas.

---

# 22. AUDITORIA MECÂNICA

Compare literalmente fonte e resultado para:

- fórmula do teste;
- dificuldades;
- graus de resultado;
- Impulso;
- Pressão;
- Ajudar;
- Predominância;
- Ressonância;
- atributos;
- perícias;
- recursos;
- condições;
- combate;
- movimento;
- diagonal;
- adjacência;
- dano;
- multiplicadores;
- Proteção;
- técnicas;
- magias;
- Evocações;
- armas;
- tags;
- armaduras;
- artefatos;
- Sombra;
- Fendas;
- Merge;
- Coro;
- adversários;
- progressão;
- Velarim.

Nenhuma diferença numérica não explicada pode permanecer.

Crie:

```text
work/qa/mechanical_audit.json
```

---

# 23. MONTAGEM

Monte o DOCX final em:

```text
work/builds/KALLISTIS_LIVRO_BASICO_EDICAO_DEFINITIVA_v1.1.docx
```

Atualize:

- TOC;
- referências;
- links;
- números;
- campos;
- metadados;
- propriedades.

Abra o DOCX com LibreOffice.

Não continue se ele pedir reparo.

---

# 24. PDF DE CONTROLE E ENTREGA

Fixe uma única versão do LibreOffice.

Registre:

```text
work/qa/environment.txt
```

Inclua:

- sistema;
- versão do LibreOffice;
- fontes;
- comando de conversão;
- dependências.

Converta para:

```text
work/builds/KALLISTIS_LIVRO_BASICO_EDICAO_DEFINITIVA_v1.1.pdf
```

Renderize todas as páginas.

Crie folhas de contato.

Inspecione:

- capa;
- sumário;
- Prólogo;
- abertura de cada Parte;
- todos os Povos;
- todos os Ofícios;
- referência rápida;
- armas;
- magias;
- Evocações;
- bestiário;
- Velarim;
- glossário;
- última página;
- páginas em paisagem;
- páginas com tabelas longas.

---

# 25. TESTE DE REPRODUTIBILIDADE

Exporte o PDF duas vezes com:

- mesmo DOCX;
- mesma versão do LibreOffice;
- mesmas fontes;
- mesmo comando.

As duas exportações devem ter:

- mesmo número de páginas;
- mesma estrutura;
- mesmo sumário;
- mesmos links;
- mesmos bookmarks;
- mesmas páginas em paisagem.

Se houver diferença de paginação, não conclua.

---

# 26. COMPARAÇÃO FINAL COM A FONTE

Compare:

- capítulos;
- apêndices;
- parágrafos;
- tabelas;
- imagens;
- números;
- regras;
- catálogos;
- Velarim.

Estados permitidos:

- preservado;
- reescrito sem perda;
- movido sem perda;
- duplicação literal consolidada;
- tabela reconstruída sem perda;
- imagem reposicionada;
- mantido literalmente por segurança.

Nenhum elemento pode ficar sem destino.

---

# 27. BLOQUEADORES

Não conclua se existir:

- capítulo ausente;
- apêndice ausente;
- tabela ausente;
- imagem útil ausente;
- número alterado;
- regra alterada;
- termo de Velarim inventado;
- TOC estático;
- hyperlinks ausentes;
- referência rápida quebrada;
- glossário justificado de forma ilegível;
- imagem sem alt text;
- tabela sem cabeçalho;
- seção única;
- versão antiga;
- crédito de IA;
- placeholder;
- TODO;
- conteúdo parcial;
- PDF não reprodutível;
- arquivo pedindo reparo.

---

# 28. ARQUIVOS FINAIS

Copie para `output/` somente:

```text
KALLISTIS_LIVRO_BASICO_EDICAO_DEFINITIVA_v1.1.docx
KALLISTIS_LIVRO_BASICO_EDICAO_DEFINITIVA_v1.1.pdf
```

Nenhum relatório ou arquivo temporário deve permanecer em `output/`.

---

# 29. RESPOSTA FINAL

Responda apenas:

1. caminho do DOCX;
2. caminho do PDF;
3. número de páginas;
4. tamanho dos arquivos;
5. versão do LibreOffice;
6. confirmação de duas exportações com paginação idêntica;
7. confirmação de revisão integral;
8. confirmação de preservação mecânica e canônica;
9. confirmação de preflight.

Não escreva relatório longo.

Não declare conclusão sem os dois arquivos reais.
