# GOLDEN MASTER EDITORIAL — PRONTOV1

> Devassa read-only de `PRONTOV1_compressed (1).pdf` (344 páginas).
> **Versão 2** — corrigida após inspeção visual das páginas suspeitas de serem full-art
> (páginas que o `pdftotext` sub-reportava por serem image-only).
> Camada textual nativa preservada (PDF tagged), sem OCR.

---

## 1. Identidade do artefato

```text
Path             : /home/tonyus-dev/Downloads/PRONTOV1_compressed (1).pdf
SHA-256          : 4989306aea643fc2aabf7f45248fe957515a373f45c955dc987c370ca30eb793
Bytes            : 20 526 716
Producer         : iLovePDF
ProducerModDate : 2026-08-17 22:12:49 -03
PDF version      : 1.5
Tagged           : yes (camada textual nativa)
Pages            : 344
Page size        : 397 × 596 pt (≈ 140 × 210 mm — trim idêntico ao canônico)
Estado git       : NÃO versionado
```

---

## 2. Estatísticas textuais (corrigidas)

| Métrica | Valor |
| --- | ---: |
| Total caracteres | **562 484** |
| Média chars/página | **1 635** |
| Mediana | **1 579** |
| StdDev | **629** |
| Min | 0 (true blank vers) |
| Max | 3 159 |

**Páginas com `pdftotext` retornando < 50 chars** (antigo falso negativo para texto):

| Página | Texto `pdftotext` | Conteúdo real após inspeção visual |
| ---: | ---: | --- |
| 1 | 0 | verso intencional (não impresso) |
| 7 | 0 | **PARTE I — O MUNDO PARTIDO** (full-art image-only) |
| 45 | 0 | **PARTE II — O CINTURÃO DAS FRESTAS** (full-art) |
| 68 | 0 | **PARTE III — POVOS, OFÍCIOS E COMUNIDADES VIVAS** (full-art) |
| 102 | 2 (folha "101") | Tabela Técnicas da Trilha + ilustração simbólica |
| 105 | 2 (folha "104") | Tabela Técnicas da Trilha + ilustração simbólica |
| 108 | 2 (folha "107") | Tabela Técnicas da Trilha + ilustração simbólica |
| 149 | 2 (folha "148") | **PARTE IV — VELARIM** (full-art) |
| 178 | 2 (folha "177") | **PARTE V — JOGANDO KALLISTIS** (full-art) |
| 244 | 2 (folha "243") | **PARTE VI — CONDUZINDO KALLISTIS** (full-art) |
| 259 | 2 (folha "258") | **PARTE VII — O LIVRO DAS COISAS SEM NOME** (full-art) |

> **Conclusão da correção**: 6 páginas interpretadas como "sparse" pela análise textual são
> na verdade **PART_HERO full-art image-only**. **O golden master contém todas as 7 aberturas de Parte
> (I–VII).** A análise anterior reportou ausência porque leu só o fólio residual.

---

## 3. Mapa editorial estrutural (corrigido por inspeção visual)

### 3.1 Front matter (páginas 1 – 6)

| Página | Conteúdo confirmado | Arquétipo |
| ---: | --- | --- |
| 1 | verso intencional (não impresso) | verso |
| 2 | "MANUAL DO MUNDO / AN70N10 0L1V31R4 / Nomos Ludens · 2026" (sem imagem) + fólio `1` | COVER |
| 3 | "Expediente" — ficha técnica completa | FRONT_MATTER |
| 4 | "Dedicatória" — três linhas + frase ceremonial | FRONT_MATTER |
| 5 | **"Para registro de extrema seriedade editorial"** (1 linha) **+ Apresentação** + **"Como usar este livro"** — **TODAS NA MESMA PÁGINA**, sem hierarquia visual forte | FRONT_MATTER (densamente empacotado) |
| 6 | **"Prólogo — A velha e a Fresta"** — imagem central da velha + texto em duas colunas (uma coluna é só o corpo de texto com fólio do parágrafo) | PROLOGUE_FEATURE |

**Observações corrigidas**:
- ~~"Para registro" é página inteira~~: ERRADO. Está agrupada com Apresentação + Como usar na mesma página 5.
- ~~PRONTOV1 não tem PART_HERO~~: ERRADO. Tem 7 (p.7, 45, 68, 149, 178, 244, 259).
- "Como usar este livro" (não "Como usar este Manual") é um título de página inteira no fluxo do front matter.

### 3.2 PARTE I — O MUNDO PARTIDO (páginas 7 – 44)

| Página | Conteúdo | Arquétipo |
| ---: | --- | --- |
| 7 | **PARTE I — O MUNDO PARTIDO** — full-art image-only com cidade partida + livro + label "PARTE I / O MUNDO PARTIDO" no canto inferior | **PART_HERO** |
| 8 | "Manesh — O Mundo da Luz" + "Thuvel — O Mundo da Escuridão" na **mesma página** (juntos, sem arte) | CHAPTER_OPENING × 2 |
| 9 | "Luz, Escuridão e Sombra" + "Kav — Sombra É Corrupção, Não Escuridão" na mesma página | NARRATIVE |
| 10 | "O Grande Cristal — Antes Que Houvesse Dois Mundos" + **"Mirveth — Uma Pessoa Inteira"** na mesma página | NARRATIVE + CHAPTER_OPENING |
| 11 | "Vethari — Relação Sem Apagamento" + "História do Mundo Partido" na mesma página | NARRATIVE |
| 12 | "A história em Marcos" + **MARCO ZERO — A ERA DA UNIÃO** + subheading "Antes que houvesse dois mundos" | TIMELINE_MILESTONE |
| 13-14 | Continuação da era pré-fratura + "A tradição da escolha" | NARRATIVE |
| 15 | **MARCO UM — A FRATURA** | TIMELINE_MILESTONE |
| ...30 | **MARCO CINCO — A ERA DA RESTAURAÇÃO** | TIMELINE_MILESTONE |
| 44 | Final do Marcos (última página da Parte I antes do hero) | NARRATIVE |

**Observações corrigidas**:
- ~~"Mirveth — Uma Pessoa Inteira" está ausente~~: ERRADO. **Está na página 10** logo após "O Grande Cristal". O `pdftotext` tinha listado como primeira linha de p.11 ("Vethari") ignorando Mirveth que estava mais acima.

### 3.3 PARTE II — O CINTURÃO DAS FRESTAS (páginas 45 – 67)

| Página | Conteúdo | Arquétipo |
| ---: | --- | --- |
| 45 | **PARTE II — O CINTURÃO DAS FRESTAS** — full-art: abismo entre dois mundos com cristal + label | **PART_HERO** |
| 46-60 | Geografia das frestas, cidades (Krav-Nam e O Baixio da Névoa Ferida ~ p.55), rotas | GEOGRAPHY_FLOW |
| 60 | "Krav-Nam: O Juramento Violado" — bloco dramático | NARRATIVE |
| 67 | Término antes da Parte III | NARRATIVE |

**Observação**: PARTE II em PRONTOV1 é notavelmente curta (23 páginas) versus PARTE I (38 páginas). Possível supressão de seção de mapas detalhados.

### 3.4 PARTE III — POVOS, OFÍCIOS E COMUNIDADES VIVAS (páginas 68 – 148)

| Página | Conteúdo | Arquétipo |
| ---: | --- | --- |
| 68 | **PARTE III — POVOS, OFÍCIOS E COMUNIDADES VIVAS** — full-art: povoados à beira de estrada com cristais | **PART_HERO** |
| 69 | "NOVE MANEIRAS DE EXISTIR" (sumário dos 9 Povos) | SUMÁRIO |
| 70 | "REGRAS GERAIS DOS POVOS" | RULES_2COL |
| 70-95 | Povos individuais (Aelvari, Kragor, Draken, Nomos, Livres, Dóreos, Teriantes, Nimari, Vitrálios) | POVO_INLINE × 9 |
| 95-102 | Mecânica dos Povos / Coro | MECHANICS_FEATURE |
| 102-110 | Tabela "Técnicas da Trilha" com ilustração simbólica | MECHANICS_FEATURE + TABLE |
| 110-145 | Ofícios (8: Guardião, Duelista, Atirador, Tecelão, Curador, Evocador, Artífice, Batedor) | OFICIO_INLINE × 8 |
| 130-145 | Pedr'almas (de companhia, monumental) | PEDRALMA_FEATURE |
| 145-148 | "Nomes para aquilo que não se pode provar" — pseudo-Velarim | LINGUISTIC_FEATURE |

**Observação corrigida**: ~~Sumários "NOVE MANEIRAS DE EXISTIR" / "OITO MANEIRAS DE ESCOLHER" ausentes como páginas dedicadas~~: **PARCIALMENTE FALSO**. "NOVE MANEIRAS DE EXISTIR" está na p.69 como sumário dedicado. "OITO MANEIRAS DE ESCOLHER" segue a lógica dos Ofícios — pode ou não estar na p.97 como sumário. A análise textual verificou que "OITO MANEIRAS DE ESCOLHER" foi detectada em p.97 do layout extraído.

### 3.5 PARTE IV — VELARIM (páginas 149 – 177)

| Página | Conteúdo | Arquétipo |
| ---: | --- | --- |
| 149 | **PARTE IV — VELARIM** — full-art: monolito com runas + label | **PART_HERO** |
| 150 | "Velarim é apresentado aqui como língua real..." | INTRO |
| 151 | "O QUE É VELARIM" + "VELARIM EM DEZ REGRAS" | INTRO + RULES_TABLE |
| 155-178 | Fonologia (Forma), Morfologia, Léxico, Fraseário, Referência Rápida | LANGUAGE_FEATURE × 5 |

### 3.6 PARTE V — JOGANDO KALLISTIS (páginas 178 – 243)

| Página | Conteúdo | Arquétipo |
| ---: | --- | --- |
| 178 | **PARTE V — JOGANDO KALLISTIS** — full-art: duas pessoas com pão+migalhas (alusão ao "jogo") | **PART_HERO** |
| 179 | "PRINCÍPIOS DO JOGO" + "O NÚCLEO DE RESOLUÇÃO" | RULES_OPENING |
| ~183-194 | "CRIAÇÃO DE PERSONAGEM" + "ORIGENS COSMOLÓGICAS" | MECHANICS_FEATURE |
| 194 | "PERSONAGEM" | MECHANICS_FEATURE |
| 199 | "MAGIAS" + "TÉCNICAS DA TRILHA" | MECHANICS_FEATURE |
| 200-220 | 28-39 Comandos, Magias, Estrutura | MECHANICS_FEATURE |
| 228 | "EQUIPAMENTOS" | EQUIPMENT_TABLE |
| 230 | "Dano-base" | COMBAT_TABLE |
| 232 | "ARTEFATOS" | ARTEFACT_TABLE |
| 235 | "PROGRESSÃO" + "FENDAS E TRAVESSIAS" | MECHANICS_FEATURE |
| 236-243 | Ressonância Coletiva, Equipamentos / Combate | COMBAT_FEATURE |
| 240 | "SOMBRA E CORRUPÇÃO" | MECHANICS_FEATURE |

### 3.7 PARTE VI — CONDUZINDO KALLISTIS (páginas 244 – 258)

| Página | Conteúdo | Arquétipo |
| ---: | --- | --- |
| 244 | **PARTE VI — CONDUZINDO KALLISTIS** — full-art: planar ritual com mesa de operações + label | **PART_HERO** |
| 245 | "Conduzir KALLISTIS exige..." | INTRO |
| 248 | "REGRAS DO MESTRE" | RULES_FEATURE |
| 249 | "SETENTA E DOIS ENCONTROS ENTRE HERANÇA E ESCOLHA" | MESTRE_FEATURE |
| 250 | "O Livro das Coisas Sem Nome" + "ADVERSÁRIOS" | MESTRE_FEATURE |
| 254-258 | Estrutura de campanha, "Como usar o livro" + Lacaios | MESTRE_FEATURE |

### 3.8 PARTE VII — O LIVRO DAS COISAS SEM NOME (páginas 259 – 342)

| Página | Conteúdo | Arquétipo |
| ---: | --- | --- |
| 259 | **PARTE VII — O LIVRO DAS COISAS SEM NOME** — full-art: pássaro/ave mística em pântano + label | **PART_HERO** |
| 260 | Página-de-abertura (intro) | PROLOGUE-LIKE |
| 265-340 | **Bestiário**: Tartaruga-Fortaleza, Boitatá, Vitrálio Opaco, Catedral da Transparência, Andarilho sem Sombra, Drako da Brasa Ventral, Leviatã dos Veios, Árvore-Mãe Errante, Filhote de Tormenta, Autômato de Ponte, Eco Corrompido, Estilhaço Vitrálio, Parasita de Promessa, Lightbringer Curador, Diretorias, Operador de Portal, parasitas, lacaio "Vigia de Quartzo", "Curupira" | BESTIARY_ENTRY × ~20 |
| 343 | "A cena ganha força quando os personagens percebem..." + "Registro rápido da adaptação" — epílogo técnico | FINAL_CLOSURE |
| 344 | "MI NAM. MI RAAR. / Eu existo. Eu rujo. / Para que ninguém esqueça que estivemos aqui. / AN70N10 0L1V31R4" — assinatura autoral no fim de página quase vazia | SIGNATURE |

**Observação corrigida**:
- ~~Sem apêndices distintos~~: agora correto. **PARTE VII é essencialmente o apêndice "Bestiário + Encerramento"**. A ficha do jogador fica fora.

---

## 4. Taxonomia de arquétipos com observações VISUAIS

Corrigindo o que a análise textual sub-relatou:

| Arquétipo | `EditorialComposition` no `types.ts` | PRONTOV1 pratica | Páginas | Observação |
| --- | --- | --- | --- | --- |
| `COVER` | (variant `art-only`) | ✓ | 2 | título + chancela + autor; sem imagem |
| `FRONT_MATTER` | front/intro | ✓ | 3, 4, **5**, 6 | "Para registro" + "Apresentação" + "Como usar" todos juntos na p.5 |
| `PROLOGUE_FEATURE` | (não no union; renderizado como `CHAPTER_OPENING` com variant especial) | ✓ | **6** | "Prólogo — A velha e a Fresta" — imagem central + texto |
| **`PART_HERO`** | `PART_HERO` | **✓ SIM** | **7, 45, 68, 149, 178, 244, 259** | **full-art image-only, label integrado** |
| `IMAGE_TOP` | `IMAGE_TOP` | ✓ | 8 (Manesh), mas variantes | Capítulo opening com imagem opcional; p.6 Prólogo tem arte central |
| `NARRATIVE` | `TEXT_FLOW` | ✓ | muitos | narrativa pura |
| `CHAPTER_OPENING_IMAGE_TOP` | `IMAGE_TOP` ou `SIDE_ART_*` | possível | 8, 10 | Manesh, Mirveth |
| `TIMELINE_MILESTONE` | `TIMELINE_MILESTONE` | ✓ | 12, 15, ... 30 | Heading "MARCO N" |
| `POVO_INLINE` | `POVO_OPENING` | ✓ | ~9 páginas inline | sem hero de Povo dedicado |
| `MECHANICS_TABLE` | `TEXT_FEATURE` | ✓ | 102-108, 199+ | "Técnicas da Trilha" |
| `OFICIO_INLINE` | `OFICIO_CULTURAL_OPENING` | ✓ | 8 páginas | inline |
| `LANGUAGE_FEATURE` | `GEOGRAPHY_FLOW` ou `TEXT_FEATURE` | ✓ | 150-178 | Velarim linguístico |
| `RULES_TABLE` | `TEXT_FEATURE` | ✓ | 151, 158, etc. | tabelas pequenas |
| `MECHANICS_FEATURE` | `TEXT_FEATURE` | ✓ | 200-244 | "MAGIAS", "COMBATE" |
| `BESTIARY_INLINE` | `BESTIARY_ENTRY` | ✓ | 280-340 | por criatura, sem hero |
| `FINAL_CLOSURE` | `FINAL_CLOSURE` | ✓ | 343, 344 | "Registro da adaptação" + "MI NAM. MI RAAR" |
| `MAP_PAGE` | `MAP_PAGE` | **NÃO detectado nas rasters inspecionadas** | — | possivelmente reduzido no golden |
| `MAP_SPREAD` | `MAP_SPREAD` | **NÃO observado** | — | |
| `SIDE_ART_LEFT/RIGHT/PAIR` | idem | **NÃO observado nas rasters inspecionadas** | — | |

---

## 5. Defeitos / decisões `GOLDEN_BUG` (corrigido)

| Página | Defeito | Classificação | Notas |
| ---: | --- | --- | --- |
| 7-149 (todas as PART_HERO) | Folhas full-art têm **rótulo "PARTE X — TÍTULO" sobreposto ao canto inferior da imagem** como faixa com fundo escuro | `GOLDEN_KEEP` (intenção editorial: o "label" é parte do design, não defeito) | Pode ser reproduzido por variante especial de `part_opening` com texto sobreposto |
| 102, 105, 108 | Fólio "101"/"104"/"107" aparece **duplicado** em algumas folhas (no rodapé principal + na ilustração simbólica abaixo da tabela) | `GOLDEN_BUG` | Defeito editorial, **não reproduzir** |
| 45, 68, 149, 178, 244, 259 | Folhas PART_HERO têm **apenas o label no rodapé** (sem fólio isolado) | `GOLDEN_BUG` (defeito gráfico) — **mas só se considerarmos que o label está no rodapé**. Se o label é o fólio, é feature. | Provável que o label seja o número da parte, não o fólio da página. **Incerteza.** |
| p.7 inicia já no verso ou já no reto? | O `PARTE I` ocupa a primeira página com `<verso implícito>` na p.7. Mas pdftotext anteriormente dizia que p.7=0. **Verificar se antes de p.7 é verso (p.1 = blank verso intencional; p.7 provavelmente também).** | `GOLDEN_KEEP` (verso intencional) | Não é bug |
| p.343-344 | p.343 "Registro rápido da adaptação" e p.344 assinatura autoral | `GOLDEN_KEEP` | Decisão editorial coerente com `FINAL_CLOSURE` |

**Defeitos de fólio com offset -1 do relatório anterior**: confirmou visualmente o `GOLDEN_BUG` em p.102, p.105, p.108 (fólio duplicado + offset). Não é universal.

---

## 6. Padrões de ritmo visual (corrigidos)

| Janela | Imagens? | Característica |
| --- | --- | --- |
| p.1-7 (Front + Parte I HERO) | capa p.2, PART_HERO p.7 | alta imagem em hero, sem densidade entre |
| p.8-44 (Parte I conteúdo) | esparso (2-3 imagens de capítulo) | flow narrativo denso |
| p.45-67 (Parte II conteúdo) | **provavelmente nulo** — sem mapa visível detectado | flow geográfico sem imagens do cinturão |
| p.68-148 (Parte III Povos/Ofícios) | denso | retratos + ilustrações simbólicas inline |
| p.149-177 (Parte IV Velarim) | nenhum | texto corrido puro (Velarim linguístico) |
| p.178-243 (Parte V Mecânica) | nenhum | tabelas + texto, sem imagem |
| p.244-258 (Parte VI Mestre) | nenhum + 1 HERO | texto + tabelas |
| p.259-342 (Parte VII Bestiário) | **denso** | imagens por criatura (bestiário) |
| p.343-344 (Fechamento) | nenhum | texto denso + assinatura |

Sequências longas **sem imagem** (provavelmente — não totalmente confirmado):
- p.8-44 (~37 páginas de flow narrativo da Parte I)
- p.45-67 (Parte II Cinturão — se não há mapas, é texto puro)
- p.149-177 (Parte IV Velarim — 28 páginas sem imagem)
- p.179-243 (Parte V Mecânica — ~64 páginas com tabelas, sem imagem pura)

**Insight principal**: o golden master faz cadência irregular: capítulos narrativos pure-text sem imagem, sequências longas de tabelas em Velarim, sequências longas de textos+arte em Povos+Bestiário. A cadência do materializador (`visualDebt`/`textRun`) deve aceitar janelas longas em modo referencial **e** preferir imagens em Povos/Bestiário.

---

## 7. Arquétipos derivados (taxonomia)

Lista final, com observação do golden master:

| Arquétipo | Observado em | Forma editorial |
| --- | --- | --- |
| `COVER` | p.2 | tipo, chancela, autor; fólio `1` |
| `FRONT_MATTER_DENSE` | p.3, p.4, p.5 | sem hierarquia forte; texto corrido |
| `PROLOGUE_FEATURE` | **p.6** | arte central + texto; layout misto |
| **`PART_HERO`** | **p.7, 45, 68, 149, 178, 244, 259** | **image-only full-art com label integrado** |
| `CHAPTER_OPENING_INLINE` | p.8, p.10, p.11 | dois capítulos consecutivos na mesma página |
| `TIMELINE_MILESTONE` | p.12, p.15, p.30 | "MARCO N — ..." |
| `POVO_INLINE` | 9 Povos | heading + sub-blocos sem hero |
| `OFICIO_INLINE` | 8 Ofícios | mesma lógica de Povos |
| `LANGUAGE_FEATURE` | p.150-178 | texto denso referencial |
| `MECHANICS_TABLE` | p.102-108, p.200+ | tabela densa + ilustração simbólica |
| `MECHANICS_FEATURE` | p.179-243 | heading numerado "N. Nome" |
| `BESTIARY_INLINE` | p.260-340 | criatura + stat-block |
| `FINAL_CLOSURE` | p.343-344 | reflexão + assinatura |
| `IMAGE_ONLY_FULL_ART_HERO` | **todas as PART_HEROS** | label integrado |

---

## 8. Conclusões para a política editorial (corrigidas)

Com base no que foi visto na inspeção visual:

1. **PART_HEROS são full-art com label integrado** (`PART_HERO` no `EditorialComposition`). **As 7 aberturas de Parte devem ser geradas**, não suprimidas.
2. **LABEL POSITION é bottom-left, com fundo escuro semitransparente** sobre a arte. Não é uma faixa isolada; é integrada ao design.
3. **Páginas de Povos e Ofícios NÃO são CARDs**. Cada Povo/Ofício é uma section inline dentro de um par de páginas, com Possível **uma ilustração por página** (não uma hero de página inteira).
4. **Velarim (Parte IV) é inteiramente sem imagem**, mesmo como referência linguística. A densa sem imagem é a referência.
5. **Parte II (Cinturão) parece usar pouca imagem** (sem mapa detectado) — assumir que mantenha-se puro texto + tabelas.
6. **Bestiário (Parte VII) é denso-imagem** + stat-block. Pode usar `BESTIARY_ENTRY` com ilustração full-bleed por criatura.
7. **A janela long-long sem imagem do golden master mostra que `textRun > 7` é aceitável** em modo referencial (Velarim, Mecânica). O `HARD_MAX_TEXT_RUN = 7` atual é conservador demais para o golden master.
8. **Apêndices NÃO são dedicados**; o bestiário faz esse papel. **A ficha do jogador explicitamente foi omitida** no golden (consistente com `characterSheet.status = "DEFERRED"`).
9. **Sumários existem** ("NOVE MANEIRAS DE EXISTIR") para Povos. Não encontrado equivalente para Ofícios no PRONTOV1 — talvez o sumário dos Ofícios tenha virado pagebreak dentro de outra seção.

---

## 9. Padrão de HERO vs CAPA observado nos rasters

| Página | Composição visual |
| --- | --- |
| 2 (CAPA) | texto + sans serif + chancela; SEM imagem |
| 7 (Parte I) | cidade partida vertical com cristal+arcos — escuro/luminoso |
| 45 (Parte II) | abismo entre dois mundos, reflexo no espelho, 2 metades |
| 68 (Parte III) | mundo 90 % da página — povoados à beira de estrada com cristais remotos |
| 149 (Parte IV) | monolito com runas — centralizado, ritual preparado |
| 178 (Parte V) | duas pessoas em mesa de pedra com pão + migalhas (alusão ao "jogo") |
| 244 (Parte VI) | mesa de operações rituais com operadores e cristal central |
| 259 (Parte VII) | ave mística em pântano + cristal distante |

**Padrão composicional do HERO**: cada abertura de Parte tem um arquétipo visual distinto (geografia partida, abismo, povoamento, monolito, mesa ritual, ritual). **Não há repetição de composição** entre as 7 PART_HEROS.

---

## 10. Auditoria textual contra o manuscrito — preliminares

Headings do manuscrito canônico encontrados no PRONTOV1 (parcial — precisa de comparação completa):

```text
Present (paginated visually):
  Manesh — O Mundo da Luz                  ✓ p.8
  Thuvel — O Mundo da Escuridão            ✓ p.8 (junto)
  Luz, Escuridão e Sombra                 ✓ p.9
  Kav — Sombra É Corrupção, Não Escuridão  ✓ p.9
  O Grande Cristal — Antes Que…            ✓ p.10
  Mirveth — Uma Pessoa Inteira             ✓ p.10 (junto)
  Vethari — Relação Sem Apagamento         ✓ p.11
  História do Mundo Partido                ✓ p.11 (junto)
  A história em Marcos                    ✓ p.12
  MARCO ZERO — A ERA DA UNIÃO              ✓ p.12
  MARCO UM — A FRATURA                    ✓ p.15
  MARCO CINCO — A ERA DA RESTAURAÇÃO       ✓ p.30
  NOVE MANEIRAS DE EXISTIR                 ✓ p.69
  REGRAS GERAIS DOS POVOS                  ✓ p.70
  SETENTA E DOIS ENCONTROS                ✓ p.249
  PRINCÍPIOS DO JOGO                     ✓ p.179
  PERSONAGEM                              ✓ p.194
  MAGIAS                                  ✓ p.199
  EVOCAÇÕES                               ✓ p.208
  COMBATE                                 ✓ p.216
  EQUIPAMENTOS                            ✓ p.228
```

Itens **provavelmente presentes mas não confirmados nas rasters inspecionadas**: 6 últimas Partes (Parte VI/VI-VII-VIII), Bestiário completo (20 criaturas), Micro-seções sem heading L1.

Itens do manuscrito canônico que **provavelmente NÃO aparecem** no golden master: ficha do jogador, glossário independente, apêndice A/B dedicado (são apenas Romantização em `work/romantizacao/`).

---

## 11. Decisão editorial derivada (revisão)

Recomendação ao materializador (calibração a fazer na Fase C do prompt):

1. **PART_HERO COM label integrado**: usar o template `part_opening` com variant específica que renderiza o label no canto inferior do `full_art`. **Não suprimir abertura de Parte.**
2. **Front matter denso**: PROLOGO + capa + expediente + dedicatória na ordem de p.2-6 **e adicionar "Para registro" como primeiro bloco do front matter, não como página dedicada**.
3. **Sem CARD para Povos/Ofícios**: usar `chapter_opening` com variant inline, não `povo_card` ou `oficio_card` (se existisse).
4. **Velarim = `rules_2col`**: configurar `rules_2col` com 2 colunas para páginas linguísticas densas, **e desabilitar o check de cadência para o intervalo p.150-178**.
5. **Bestiário = `chapter_opening` com portrait + stat_block**: criar entradas uma por criatura.
6. **`textRun` permissivo em modo referencial**: introduzir flag `mode = "reference"` que ignora `HARD_MAX_TEXT_RUN`. Default = `narrative`.
7. **Sem apêndices novos no Book final**: respeitar `characterSheet.status === "DEFERRED"` suprimindo Material block.

---

## 12. Correção metodológica

A versão 1 deste relatório cometeu **falsos negativos estruturais** por inferência exclusiva da camada
textual via `pdftotext`. **Lição**: páginas full-art image-only (com fólio apenas em rótulo embutido)
não são identificáveis só pelo texto. Inspeção visual por raster é obrigatória para qualquer
amostra que tenha `chars/página < 200`.

Esta versão 2 confirma o padrão, com 7 PART_HEROS encontradas.

---

## 13. Próxima ação (Fase C)

Com base no MAP correto:
- **Criar `book_maker/scripts/policy/kallistis-editorial.json`** (mínimo) com a taxonomia deste relatório (lista de Partes com composição, Povos, Ofícios).
- **Verificar reposição por SHA** dos assets referenciados em PRONTOV1 contra os caminhos reais em `public/assets/`.
- **Definir minteração entre label integrados e template `part_opening`** no renderer / templates.
- **Não rodar piloto ainda**; aguardar validação humana desta estrutura.
