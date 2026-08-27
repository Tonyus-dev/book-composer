# KALLISTIS — Reconstrução editorial — cobertura e diagnóstico

## Resultado mecânico

- Projeto final: **424 páginas**; materializador: **PASS**; PDF real: **0 Errors**, 425 warnings, 243 info.
- Fonte congelada: 94.040 palavras, 4.454 blocos selecionados, SHA-256 `da7bdf3177b8bb34e8b9df5ca33361c6f451681732be64c458078a4c2da2deca`; mismatch textual 0, palavras perdidas 0, palavras adicionadas 0.
- Páginas com imagem: 147; blocos de imagem: 160; fontes únicas usadas: 139; hashes únicos usados: 136; hashes candidatos aprovados/usable: 166; uso visual por hash: 81.93%.
- Tabelas: 131 páginas; mapas: 4; overflow: 0; headings órfãos: 0; linhas de tabela quebradas: 0.

## Auditoria dos templates

### Templates registrados

- `cover` — Capa; variantes: default.
- `front_matter` — Front Matter; variantes: default.
- `toc` — Sumário; variantes: default.
- `part_opening` — Abertura de Parte; variantes: default.
- `chapter_opening` — Abertura de Capítulo; variantes: image-top|image-side|quadrant-image.
- `narrative` — Narrativa; variantes: default.
- `rules_2col` — Regras (2 colunas); variantes: default.
- `profile` — Perfil; variantes: portrait-left|portrait-right|portrait-bottom|dual-portrait.
- `table_page` — Página de Tabela; variantes: default.
- `quote_layout` — Citação; variantes: inline-block|full-page.
- `full_art` — Arte; variantes: default|bestiary-opening.
- `map_page` — Mapa; variantes: default.
- `timeline_milestone` — Marco histórico; variantes: default.

### Templates não utilizados

- **cover** — shell de capa; sem slot de capa explícito no manuscrito congelado. **Compatível: NÃO**.
- **toc** — sumário gerado; o manuscrito tem headings, mas não um bloco/slot de sumário governado por conteúdo. **Compatível: NÃO como conteúdo-fonte explícito**.
- **profile** — perfis de Povos, Ofícios, NPCs e criaturas. O manuscrito contém esses conteúdos e o materializador os envia para chapter_opening/rules. **Compatível: SIM — POSSIBLE_ROUTING_GAP**.
- **quote_layout** — citação destacada; existem 3 quotes no manuscrito, hoje consumidas por part/opening/narrative. **Compatível: SIM — POSSIBLE_ROUTING_GAP**, embora o papel de citação standalone não esteja especificado no contrato novo.

### Templates usados

`front_matter=2`, `chapter_opening=76`, `part_opening=6`, `timeline_milestone=8`, `narrative=173`, `table_page=1`, `full_art=21`, `map_page=2`, `rules_2col=135`.

### Caminho de roteamento verificado

`SOURCE CONTENT → parseMarkdown → annotateHeadingPaths/bindSemanticAssets → assetForSource → compositionForSource → newPage → applyCompactReferencePage → pagination/addBlock → updatePageMetadata → PageRenderer/CSS`.

Perdas identificadas no caminho anterior: (1) `applyCompactReferencePage` convertia todo conteúdo sem imagem das Partes V/VI em `rules_2col`; (2) `MAP_PAGE` caía em `chapter_opening`; (3) ofícios em caixa alta não alcançavam assets por comparação sensível a maiúsculas; (4) não havia branches para `profile` ou `quote_layout`; (5) fallback final convertia funções sem asset em `narrative/TEXT_FLOW`.

Correções mínimas aplicadas: preservar páginas que já têm template semântico, rotear `MAP_PAGE` para `map_page`, aceitar aliases em maiúsculas somente para os oito ofícios oficiais, conter faixas de abertura e limpar floats antes de tabelas `span: full`.

## Amostras reais

### narrative

LORE CONTÍNUO | p.37 | PASS | FIT_CONTENT=PASS | FIT_HIERARCHY=PASS | FIT_DENSITY=PASS | FIT_IMAGE=PASS | FIT_EDITORIAL_ROLE=PASS | VISUAL_QUALITY=GOOD
GEOGRAFIA | p.88 | PASS | FIT_CONTENT=PASS | FIT_HIERARCHY=PASS | FIT_DENSITY=PASS | FIT_IMAGE=PASS | FIT_EDITORIAL_ROLE=PASS | VISUAL_QUALITY=ACCEPTABLE
CULTURA/SOCIEDADE | p.186 | PASS | FIT_CONTENT=PASS | FIT_HIERARCHY=PASS | FIT_DENSITY=PASS | FIT_IMAGE=PASS | FIT_EDITORIAL_ROLE=PASS | VISUAL_QUALITY=ACCEPTABLE
TEXTO + TABELA PEQUENA | p.214 | PASS | FIT_CONTENT=PASS | FIT_HIERARCHY=PASS | FIT_DENSITY=FAIL | FIT_IMAGE=PASS | FIT_EDITORIAL_ROLE=FAIL | VISUAL_QUALITY=POOR — evidência de que tabela em narrative acomoda, mas não é composição deliberada; permanece pendência de roteamento para table_page.

### rules_2col

REGRA TEXTUAL | p.241 | PASS | FIT_CONTENT=PASS | FIT_HIERARCHY=PASS | FIT_DENSITY=PASS | FIT_IMAGE=PASS | FIT_EDITORIAL_ROLE=PASS | VISUAL_QUALITY=GOOD
PROCEDIMENTO/CRIAÇÃO | p.242 | PASS | FIT_CONTENT=PASS | FIT_HIERARCHY=PASS | FIT_DENSITY=PASS | FIT_IMAGE=PASS | FIT_EDITORIAL_ROLE=PASS | VISUAL_QUALITY=GOOD
TABELA PEQUENA | p.267 | PASS | FIT_CONTENT=PASS | FIT_HIERARCHY=PASS | FIT_DENSITY=PASS | FIT_IMAGE=PASS | FIT_EDITORIAL_ROLE=PASS | VISUAL_QUALITY=GOOD
REFERÊNCIA MECÂNICA DENSA | p.264 | PASS | FIT_CONTENT=PASS | FIT_HIERARCHY=PASS | FIT_DENSITY=PASS | FIT_IMAGE=PASS | FIT_EDITORIAL_ROLE=PASS | VISUAL_QUALITY=GOOD

### chapter_opening

ABERTURA | p.3 | PASS | FIT_CONTENT=PASS | FIT_HIERARCHY=PASS | FIT_DENSITY=PASS | FIT_IMAGE=PASS | FIT_EDITORIAL_ROLE=PASS | VISUAL_QUALITY=GOOD
POVO | p.100 | PASS | FIT_CONTENT=PASS | FIT_HIERARCHY=PASS | FIT_DENSITY=PASS | FIT_IMAGE=PASS | FIT_EDITORIAL_ROLE=PASS | VISUAL_QUALITY=GOOD
GEOGRAFIA | p.90 | PASS | FIT_CONTENT=PASS | FIT_HIERARCHY=PASS | FIT_DENSITY=PASS | FIT_IMAGE=PASS | FIT_EDITORIAL_ROLE=PASS | VISUAL_QUALITY=GOOD
BESTIÁRIO ESPECIALIZADO | p.288 | PASS | FIT_CONTENT=PASS | FIT_HIERARCHY=PASS | FIT_DENSITY=PASS | FIT_IMAGE=PASS | FIT_EDITORIAL_ROLE=PASS | VISUAL_QUALITY=GOOD

Conclusão do diagnóstico: a repetição anterior não era explicada apenas pela natureza do conteúdo. Houve **ROUTING_PROBLEM**; depois das correções, as geometrias dominantes são adequadas. Não há prova de **TEMPLATE_LIMITATION** estrutural, mas há uma pendência residual: tabelas pequenas em narrative ainda podem ser visualmente aceitáveis sem cumprir o papel semântico de `table_page`.

## Cobertura visual

- VISUAL_ASSETS_FOUND=166 hashes únicos no limite aprovado/usable; inventário externo: 447 raster files, 361 hashes únicos, 288 REVIEW_REQUIRED e 73 USED.
- VISUAL_ASSETS_APPROVED_OR_USABLE=166; UNIQUE_IMAGES_CURRENTLY_USED=136 hashes / 139 paths; UNIQUE_IMAGES_CURRENTLY_UNUSED=30 hashes; VISUAL_USAGE_PERCENTAGE=81.93%.
- LONGEST_TEXT_ONLY_RUN=33; TEXT_ONLY_RUNS_JUSTIFIED=62; TEXT_ONLY_RUNS_WITH_VISUAL_OPPORTUNITY=0.

| intervalo | classificação | justificativa |
|---|---|---|
| p.1–3 (3) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.15–16 (2) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.19–22 (4) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.25–28 (4) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.32–32 (1) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.38–38 (1) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.47–49 (3) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.52–52 (1) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.55–57 (3) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.60–60 (1) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.65–65 (1) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.80–80 (1) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.82–82 (1) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.85–85 (1) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.87–87 (1) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.89–90 (2) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.93–97 (5) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.99–100 (2) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.102–104 (3) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.106–107 (2) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.109–111 (3) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.113–114 (2) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.116–117 (2) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.119–120 (2) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.122–124 (3) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.126–127 (2) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.130–133 (4) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.135–136 (2) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.138–139 (2) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.141–142 (2) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.144–145 (2) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.147–149 (3) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.151–152 (2) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.154–155 (2) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.157–158 (2) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.163–163 (1) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.166–167 (2) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.170–179 (10) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.181–185 (5) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.187–190 (4) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.192–192 (1) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.197–229 (33) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.232–244 (13) | JUSTIFIED_TEXT_RUN | regras e tabelas mecânicas; imagens pontuais já ancoradas em headings específicos. |
| p.246–252 (7) | JUSTIFIED_TEXT_RUN | regras e tabelas mecânicas; imagens pontuais já ancoradas em headings específicos. |
| p.254–260 (7) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.263–263 (1) | JUSTIFIED_TEXT_RUN | referência mecânica densa; composição rules_2col e tabelas presentes no entorno. |
| p.265–282 (18) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.284–285 (2) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.287–287 (1) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.290–294 (5) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.297–300 (4) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.303–311 (9) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.313–313 (1) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.318–327 (10) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.329–332 (4) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.334–362 (29) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.367–367 (1) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.374–374 (1) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.379–379 (1) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.389–393 (5) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.399–407 (9) | JUSTIFIED_TEXT_RUN | sequência textual curta ou transição sem asset aprovado semanticamente ancorado. |
| p.409–424 (16) | JUSTIFIED_TEXT_RUN | apêndices, contrato e dicionário de assets; ficha nativa ainda é incidente separado. |

- POVOS_WITH_HERO_ART=9/9 aberturas POVO com imagem contextual; OFICIOS_WITH_HERO_ART=8/8 ofícios oficiais, além da abertura genérica; PARTS_WITH_OPENING_ART=Parte I–III e V–VI com heroes existentes, Parte IV sem hero aprovado usado nesta regra.
- REPEATED_IMAGES=15; UNASSIGNED_ASSETS=30 hashes; ROUTING_CHANGES_REQUIRED=NO para a seleção mínima já corrigida, SIM para eventual uso futuro de profile/quote_layout e slot da ficha.

## Ficha do Jogador

O ZIP `KALLISTIS_FICHA_PERSONAGEM_FINAL_22_DE_22.zip` foi localizado e contém F01–F22 em grayscale/originais/variantes. O projeto contém apenas o texto contratual da ficha (p. 408–409), não as quatro páginas nativas exigidas. Portanto: `CHARACTER_SHEET=INCIDENT`; não houve achatamento em screenshot, placeholder ou invenção.
