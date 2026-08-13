# KALLISTIS BOOK MAKER — CANVA GAP ANALYSIS

## Escopo e método

Auditoria somente leitura do workspace canônico em `book_maker/`, no commit `d29f7f992e33e175958a16843b221629868590ce`. Nenhum teste, build, PDF, CI ou alteração de código foi executado nesta missão. A classificação abaixo pergunta se a operação está exposta ao usuário no editor, e não se existe apenas um campo ou função no modelo.

Evidências principais: `src/editor/components/PageCanvas.tsx`, `src/editor/components/InlineTextEditorOverlay.tsx`, `src/editor/state/store.tsx`, `src/editor/components/Toolbar.tsx`, `src/editor/panels/PropertiesPanel.tsx`, `src/editor/panels/StructurePanel.tsx`, `src/editor/panels/AssetBrowser.tsx`, `src/editor/components/TableEditorOverlay.tsx`, `src/book/types.ts`, `src/book/renderer/PageRenderer.tsx` e `src/book/renderer/BlockRenderer.tsx`.

## 1. Resumo executivo

CANVA_PRODUCTION_READINESS = PARTIAL

P0_MISSING = 0
P1_MISSING = 9
P2_MISSING = 3

CAN_START_REAL_LAYOUT_TODAY = YES

O Book Maker já permite começar uma composição real sem editar JSON ou TypeScript: criar página blank, inserir texto/imagem/shape/box/tabela, selecionar blocos, mover, redimensionar, editar texto, substituir assets, recortar imagem, salvar localmente e imprimir. Isso é suficiente para iniciar páginas manuais.

Ele ainda não é um Canva editorial para centenas de páginas porque a unidade de interação é um bloco isolado. Não há seleção múltipla de objetos, painel de camadas, agrupamento, rotação, alinhamento/distribuição, limpeza de página, atalhos completos ou controle tipográfico fino.

## 2. O que já está pronto

| Capacidade | Status | Evidência |
|---|---|---|
| Selecionar bloco visível por clique | READY | `PageRenderer.tsx:55-77` encontra `data-block-id`; `BlockRenderer.tsx:72-84` chama `onSelectBlock`. |
| Seleção visual e moldura de transformação | READY | `BlockRenderer.tsx:72-84`; `PageCanvas.tsx:700-712`; `editor.css:368-382`. |
| Criar página, duplicar, excluir e reordenar | READY | `StructurePanel.tsx:76-109`; `state/store.tsx:660-713`. |
| Página em branco e composição livre | READY | template `blank` em `templates/index.ts`; inserção de blocos em `Toolbar.tsx:444-477`; `blank.tsx`. |
| Inserir texto, título, imagem, quote, box, tabela, shape e formulário | READY | `Toolbar.tsx:444-477`; `Toolbar.tsx:46-115`. |
| Editar texto diretamente na página | READY | duplo clique em `PageCanvas.tsx:677-683`; overlay em `InlineTextEditorOverlay.tsx:60-86`. |
| Mover e redimensionar blocos | READY | `BlockTransformOverlay` em `PageCanvas.tsx:365-527`; frame físico em `PropertiesPanel.tsx:45-89`. |
| Crop e reposicionamento interno de imagem | READY | `ImageResizeOverlay` em `PageCanvas.tsx:145-360`; `PropertiesPanel.tsx:594-615`. |
| Fit `cover`/`contain`, object position e full bleed | READY | `PropertiesPanel.tsx:581-634`; renderização em `BookComponents.tsx:85-110`. |
| Substituir asset e reutilizar asset | READY | `AssetBrowser.tsx:86-120`; catálogo e assets enviados em `AssetBrowser.tsx:60-84`. |
| Upload, thumbnail, busca e categorias de assets | READY | `AssetBrowser.tsx:241-295`, `:325-445`; `lib/assets/catalog.ts`. |
| Recortar, redimensionar e remover fundo de asset | READY | `AssetBrowser.tsx:199-230`; `lib/assets/edit.ts`. |
| Tabelas com edição de células, merge, split, linhas e colunas | READY | `TableEditorOverlay.tsx:160-285`, `:465-727`. |
| Resize de colunas/linhas e gráficos internos de tabela | READY | `TableEditorOverlay.tsx:287-448`, `:729-805`. |
| Boxes semânticos e formas básicas | READY | `Toolbar.tsx:118-136`, `:453-463`; `BookComponents.tsx:114-129`, `:266-285`. |
| Rulers, margins, bleed, safe area, columns e baseline | READY | `PageCanvas.tsx:1-134`; `editor.css:125-191`. |
| Grid de 1 mm durante transformação de bloco | READY | `Toolbar.tsx:432-440`; `PageCanvas.tsx:465-471`. |
| Undo/redo editorial | READY | histórico de 50 estados em `state/store.tsx:246-258`, `:330-353`; atalhos em `Toolbar.tsx:196-207`. |
| Delete de bloco e duplicate por `Ctrl/Cmd+D` | READY | `PageCanvas.tsx:623-641`; `state/store.tsx:613-628`. |
| Preflight, PPI, persistência, print e PDF | READY | mantidos pelo Production Lock; esta auditoria não reexecutou esses gates. |

## 3. O que existe parcialmente

| Capacidade | O que existe | O que falta | Prioridade |
|---|---|---|---|
| Transformação visual | Um único handle inferior-direito para blocos e imagens; drag cria/edita `frame` em mm. | Handles laterais/cantos completos, rotação, constraints e transformação de qualquer elemento gerado por template. | P1 |
| Precisão geométrica | X/Y/largura/altura numéricos para `frame`; largura/altura para imagem. | X/Y numérico de imagem, passos finos por teclado, unidades/constraints coerentes para todos os objetos. | P1 |
| Resize proporcional | `Shift` preserva proporção no resize de imagem. | Comportamento proporcional para qualquer bloco e opção persistente de constraint. | P2 |
| Ordem de camada | Botões `↑ subir` e `↓ descer` no painel de propriedades. | Painel visual de layers, drag de ordem, seleção de objeto oculto/atrás, bring-to-front/back explícitos. | P1 |
| Bloqueio | Página tem flag `fixed` e indicação visual. | `fixed` não bloqueia edição no `PageCanvas`; não há lock por objeto nem unlock operacional. | P1 |
| Texto | Inline edit, roles, alinhamento, largura, fonte por bloco e tokens globais. | Tamanho/peso/itálico/cor/entrelinha/tracking/padding/borda por caixa de texto, sem depender de markdown ou tokens globais. | P1 |
| Texto de template | Título, subtítulo, eyebrow, parte e capítulo editáveis no painel; header/footer/folio ligáveis. | Elementos gerados não são objetos selecionáveis/movíveis/apagáveis individualmente no canvas. | P1 |
| Estilos de texto | Templates, roles e receitas editoriais. | Estilo reutilizável geral para caixa de texto, com aplicação consistente entre páginas. | P2 |
| Imagem no canvas | Click insere; drag funciona sobre recipe slots; mover/crop/resize/replace funciona depois de selecionada. | Drag asset para qualquer ponto de uma página blank, com criação de frame no ponto de soltura. | P1 |
| Imagem e efeitos | Crop, cover/contain, object position, full bleed, PPI e placeholder/preflight. | Rotação, espelhamento, opacidade, borda, raio, máscara/frame e ajustes não destrutivos. | P1 |
| PPI durante edição | Metadados de pixel/PPI aparecem no Asset Browser e o preflight acusa baixa resolução. | Indicador visual persistente no objeto selecionado e atualização de alerta junto ao resize. | P1 |
| Ornamentos | Catálogo possui categoria `ornaments`; divisor tem marca ornamental; ornamento pode entrar como imagem/asset. | Ornamento livre como objeto gráfico modular: mover/rotacionar/espelhar/alinhá-lo, repetir cantos/bordas e criar frames. | P1 |
| Formas | Existem moldura, janela/caixa, linha/filete e área de cor. | Retângulo/quadrado como primitives explícitas, círculo/elipse fora de tabela, raio, opacity e rotação. | P1/P2 |
| Guides e grid | Overlays físicos e snap de 1 mm para `frame`. | Guides arrastáveis, snap a guides/objetos/centro/margens/safe area e smart guides. | P1 |
| Alinhamento | Ruler readout e valores físicos. | Alinhar à esquerda/direita/topo/base/centros, distribuir e medir distância entre objetos. | P1 |
| Copy/paste | Menu “Copiar bloco selecionado” grava um bloco no localStorage; paste clona um bloco. | `Ctrl/Cmd+C/V/X`, clipboard do sistema, múltiplos objetos, composição e página. | P1 |
| Atalhos | Delete, `Ctrl/Cmd+D`, undo/redo; setas navegam entre páginas; tabelas têm navegação própria. | Movimento de objeto por setas, Shift+seta, Ctrl/Cmd+A, cut e seleção múltipla por modificadores. | P1 |
| Seleção sobreposta | Clique resolve o bloco DOM mais próximo; outline hover/selected existe. | Ciclo por Tab, Alt-click/select behind, painel de layers e menu contextual. | P1 |
| Página | Criar blank, template, duplicar, excluir, reordenar e importar/exportar folha. | “Limpar página” em uma operação, copiar composição completa e remover efeitos gerados sem apagar a página. | P1 |
| Lock da página | Botão “Fixar composição”. | A flag é declarativa/visual; não impede drag, edição ou exclusão dos objetos. | P1 |
| Spread | Visualização de duas páginas, navegação e medianiz derivada dos tokens. | Seleção/movimento entre as duas páginas, composição contínua, objeto atravessando páginas, bleed e snap de spread. | P2 |
| Asset Browser | Upload, busca, filtro, thumbnails, click, drag em recipe slot, rename, edit e source canônica. | Favoritos, categorias editoriais dedicadas para molduras/formas/símbolos e drag universal no canvas. | P1/P2 |
| Tabela como objeto | Edição de célula e resize interno; frame numérico existe no painel genérico. | Mover/redimensionar a tabela inteira diretamente no canvas como um objeto único. | P1 |
| Boxes | Criar, editar título/conteúdo, mover, resize, duplicar e selecionar. | Fundo/borda/padding/ornamentação livres e preset visual reutilizável de box. | P1 |
| Undo/redo | O histórico cobre operações que passam por `setBook`, incluindo bloco, tabela, página e texto. | Não há histórico de seleção, estado do canvas, multi-seleção ou operações de UI que ainda não existem. | P2 |

## 4. O que falta

| ID | Feature | Prioridade | Motivo |
|---|---|---|---|
| CANVA-01 | Mover objetos selecionados por teclado com Arrow/Shift+Arrow | P1 | Hoje as setas navegam páginas; não movem blocos. |
| CANVA-02 | Rotação com handle e campo numérico | P1 | Não existe `rotation` no modelo de bloco nem no overlay. |
| CANVA-03 | Multi-seleção de blocos | P1 | `selectedBlockId` é singular e o store não possui conjunto de seleção. |
| CANVA-04 | Agrupar/desagrupar objetos | P1 | Não há tipo group nem operações correspondentes. |
| CANVA-05 | Painel de layers de objetos | P1 | `StructurePanel` lista páginas, não objetos; não há layer tree. |
| CANVA-06 | Alinhar/distribuir/smart guides | P1 | Não há comandos ou cálculo de alinhamento entre objetos. |
| CANVA-07 | Limpar página | P1 | É possível remover blocos um a um, mas não há operação que preserve a página e limpe sua composição. |
| CANVA-08 | Seleção por retângulo/ciclo/select-behind | P1 | A seleção é por clique no DOM; objetos sobrepostos não têm rota alternativa. |
| CANVA-09 | Rotação/espelhamento/opacity/máscara de imagem | P1/P2 | O modelo de imagem só cobre fit, crop, position, offset, width/height e full bleed. |
| CANVA-10 | Formatação tipográfica fina de caixa | P1 | Não há controles de font-size local, peso, itálico, tracking, cor, padding e borda para texto comum. |
| CANVA-11 | Inserção de asset por drag em qualquer coordenada | P1 | `handleAssetDrop` só aceita `[data-recipe-slot]`. |
| CANVA-12 | Objetos ornamentais livres e composição modular | P1 | `ornaments` existe como catálogo, mas não existe objeto ornamental livre com transformações. |
| CANVA-13 | Primitives gráficas completas | P2 | Fora de tabela, há frame/window/line/fill; não há círculo/elipse, raio, rotação e opacity gerais. |
| CANVA-14 | Atalhos C/V/X/A e clipboard de composição | P1 | Copy/paste existe apenas por menu e para um bloco em localStorage; cut/select-all não existem. |
| CANVA-15 | Menu contextual de objeto | P2 | Não há `onContextMenu` nem ações contextuais de delete/duplicate/layers/lock/group. |
| CANVA-16 | Spread de composição contínua | P2 | `spread` é visualização de duas páginas; os canvas não compartilham seleção nem permitem atravessar a medianiz. |
| CANVA-17 | Lock/hide por objeto e lock efetivo de página | P1 | Só há flag visual de página; não há enforcement nem visibilidade por objeto. |
| CANVA-18 | Estilos reutilizáveis gerais | P2 | Existem recipes e presets de tabela, mas não um sistema visual geral de estilos de objeto/texto/box. |

## 5. Bloqueadores P0

Nenhum.

O núcleo mínimo para começar uma página real está presente: página blank, inserção, seleção, edição, movimento, resize, composição de imagem/shape/box/tabela e persistência. A ausência de multi-seleção e camadas torna o trabalho menos confortável, mas não impede a primeira produção manual.

## 6. Produção confortável P1

Prioridade prática, nesta ordem:

1. Seleção múltipla + seleção por retângulo + seleção sobreposta.
2. Painel de layers com reorder, lock/hide e ações de frente/trás.
3. Transformação completa: mover por teclado, handles de resize, rotação, X/Y/W/H coerentes e snap.
4. Limpar página, Ctrl/Cmd+C/V/X/A e clipboard de composição.
5. Tipografia local de texto: tamanho, peso, itálico, cor, entrelinha, tracking, padding e borda.
6. Drag de asset em qualquer ponto, com frame e crop previsíveis.
7. Objetos ornamentais e shapes livres reutilizáveis.
8. Acesso direto a qualquer texto gerado por template, sem depender apenas do painel de metadados.

## 7. Refinamentos P2

- Espelhamento, opacidade, raio e máscaras avançadas de imagem.
- Menu contextual.
- Círculo/elipse como primitive geral.
- Estilos reutilizáveis universais.
- Spread contínuo e objetos atravessando a medianiz.
- Favoritos e classificação editorial ampliada de assets.
- Histórico de estado de seleção/canvas.

## 8. Não necessário agora

Não são pré-requisitos para iniciar a diagramação: colaboração simultânea, comentários/revisões em tempo real, geração automática de arte, IA de layout, auto-layout irrestrito, publicação direta ou remodelagem do pipeline de print. O sistema físico atual — mm, bleed, safe area, PPI, preflight, persistência, `/print` e PDF — deve ser preservado enquanto a camada visual evolui.

## 9. Resposta às 14 perguntas “CANVA”

| Pergunta | Resposta | Evidência |
|---|---|---|
| 1. Posso clicar em qualquer coisa que vejo? | PARTIAL | Blocos com `data-block-id` sim; títulos/header/footer/folio produzidos por template não são objetos selecionáveis. |
| 2. Posso mover qualquer coisa que vejo? | PARTIAL | Blocos selecionados sim; elementos gerados e elementos entre páginas não. |
| 3. Posso apagar qualquer coisa que vejo? | PARTIAL | Blocos sim; texto gerado por template só pode ser alterado por campos/toggles, não apagado como objeto. |
| 4. Posso redimensionar qualquer coisa que vejo? | PARTIAL | Blocos/imagens/tabelas internamente sim; sem resize geral de elementos de template e sem handles completos. |
| 5. Posso inserir qualquer elemento sem código? | PARTIAL | Há menu de blocos e shapes; não há primitives completas, ornamento livre ou imagem por drag universal. |
| 6. Posso reorganizar camadas? | PARTIAL | `↑ subir`/`↓ descer` por bloco; não há painel de layers. |
| 7. Posso começar uma página totalmente vazia? | YES | `blank` existe e `Toolbar.tsx` cria página em branco. |
| 8. Posso reconstruir uma página inteira manualmente? | YES | Em blank, blocos podem ser inseridos, editados, movidos e redimensionados. |
| 9. Posso produzir uma abertura de capítulo complexa? | PARTIAL | Templates e blocos permitem a composição; falta controle livre de todos os elementos gerados e ornamentos. |
| 10. Posso fazer imagem + texto + ornamentos + boxes? | PARTIAL | Imagem/texto/shape/box existem; ornamentos são catálogo/divisor, não objetos modulares livres. |
| 11. Posso trabalhar sem abrir JSON? | YES | Fluxo de editor, assets, propriedades, persistência e print estão expostos na UI. |
| 12. Posso trabalhar sem editar TypeScript? | YES | O núcleo de composição manual está no editor; o limite é de capacidade, não de necessidade de código para as operações existentes. |
| 13. Posso trabalhar sem usar terminal? | YES | Para editar e salvar projetos já existentes, sim; exportação/infraestrutura continuam sendo operações técnicas separadas. |
| 14. A experiência é suficientemente direta para centenas de páginas? | NO | A ausência de seleção múltipla, layers, alinhamento, estilos locais e limpeza de página torna a operação objeto-a-objeto lenta demais. |

## 10. Ordem mínima de implementação

### CANVA-01 — Seleção e composição de objetos

Uma intervenção coerente: conjunto de seleção, marquee, Shift/Cmd-click, select-all, select-behind, limpar página, copy/cut/paste de múltiplos blocos e ações de delete/duplicate.

### CANVA-02 — Transformação e layers

Uma intervenção coerente: layer panel, reorder, lock/hide, group/ungroup, frente/trás, Arrow/Shift+Arrow, handles de resize/rotação, X/Y/W/H e snap/alinhamento.

### CANVA-03 — Tipografia e objetos gráficos

Uma intervenção coerente: controles locais de texto, estilos reutilizáveis, imagem com espelho/opacidade/máscara e primitives/ornamentos livres.

### CANVA-04 — Spread e acabamento de produção

Somente depois dos três grupos anteriores: composição contínua de spread, objetos atravessando medianiz, smart guides avançadas, favoritos e refinamentos de contexto.

## 11. Critério de entrada em produção

CAN_START_REAL_LAYOUT = YES com o subconjunto atual:

- página blank;
- inserir texto, título, imagem, box, shape e tabela;
- selecionar um bloco;
- editar texto e propriedades;
- mover e redimensionar bloco;
- crop/fit/replace de imagem;
- salvar localmente e recuperar após reload;
- consultar preflight/PPI e abrir `/print`.

Para declarar `CANVA_PRODUCTION_READINESS = READY`, o mínimo adicional é concluir `CANVA-01`, `CANVA-02` e o núcleo tipográfico de `CANVA-03`. Sem isso, a ferramenta é utilizável para composição manual inicial, mas não para diagramar centenas de páginas com conforto e consistência.

## Conclusão

Há 18 gaps funcionais explícitos na lista detalhada; 12 são grupos de capacidade totalmente ausentes e 6 são capacidades parcialmente existentes com uma lacuna relevante. Entre os grupos totalmente ausentes, 9 são P1 e 3 são P2. Não há P0 ausente. O produto pode começar a receber layout real hoje, desde que a produção aceite trabalhar bloco a bloco e usar templates/painéis para o que ainda não é objeto livre.

## 12. Registro estruturado consolidado

Este é o único entregável da auditoria. O registro estruturado que havia sido mantido em arquivo separado foi absorvido nesta seção; não há JSON separado a consultar.

### Resumo estruturado

| Campo | Valor |
|---|---|
| `readiness` | `PARTIAL` |
| `canStartRealLayout` | `true` |
| grupos `READY` | 15 |
| grupos `PARTIAL` | 20 |
| grupos `MISSING` | 12 |
| ausências `P0` | 0 |
| ausências `P1` | 9 |
| ausências `P2` | 3 |
| semântica das contagens | `READY`, `PARTIAL` e `MISSING` contam grupos de capacidade; `P0/P1/P2` contam grupos totalmente ausentes por prioridade |

### Matriz completa de capacidades

| ID | Capacidade | Status | Prioridade | Lacuna ou evidência |
|---|---|---|---|---|
| `core.select` | Selecionar bloco por clique | READY | P0 | — |
| `core.selection-box` | Bounding box e seleção visual | READY | P0 | — |
| `core.transform` | Mover e redimensionar objetos no canvas | PARTIAL | P1 | Há um único handle e não há transformação geral dos elementos produzidos pelos templates. |
| `core.keyboard-move` | Mover objeto por teclado com precisão fina | MISSING | P1 | As setas navegam páginas; não existe movimento de bloco por Arrow/Shift+Arrow. |
| `core.proportional` | Resize proporcional universal | PARTIAL | P2 | Shift preserva proporção apenas no resize de imagem. |
| `core.rotation` | Rotação por handle/campo | MISSING | P1 | Não há propriedade `rotation` nem controle visual. |
| `core.duplicate` | Duplicar bloco | READY | P0 | — |
| `core.copy-paste` | Copiar/colar bloco ou composição | PARTIAL | P1 | Só um bloco por vez, por menu/localStorage; não há clipboard do sistema, múltiplos ou página. |
| `core.cut` | Recortar objeto | MISSING | P2 | Não existe ação de cut nem atalho Ctrl/Cmd+X. |
| `core.delete` | Apagar qualquer elemento visível | PARTIAL | P1 | Blocos são apagáveis; header/footer/folio e títulos gerados por template não são objetos individuais. |
| `core.lock-hide-group` | Lock/hide/group de objetos | MISSING | P1 | Não há seleção múltipla, group, visibilidade ou lock por objeto. |
| `core.layer-order` | Camadas e ordem de objetos | PARTIAL | P1 | Há subir/descer por bloco, mas não há painel de layers nem frente/trás explícitos. |
| `core.multi-select` | Multi-seleção, marquee e select-all | MISSING | P1 | O store mantém somente `selectedBlockId` singular. |
| `text.create-edit` | Criar e editar texto/título/quote/box | READY | P0 | — |
| `text.transform` | Mover e redimensionar caixa de texto | READY | P0 | — |
| `text.typography` | Tipografia local completa | PARTIAL | P1 | Há fonte, role e alinhamento; faltam tamanho/peso/itálico/cor/entrelinha/tracking/padding/borda locais. |
| `text.template-content` | Editar/apagar texto produzido por template | PARTIAL | P1 | Metadados e toggles são editáveis, mas os elementos não são objetos livres no canvas. |
| `text.styles` | Estilos de texto reutilizáveis | PARTIAL | P2 | Recipes e roles existem, mas não há um estilo visual geral reutilizável. |
| `image.insert-reuse` | Inserir, substituir e reutilizar imagem | READY | P0 | — |
| `image.drag-canvas` | Arrastar asset para qualquer ponto do canvas | PARTIAL | P1 | Drop só é aceito em recipe slots; click insere em outros casos. |
| `image.crop-fit` | Mover, resize, crop, fit e object position | READY | P0 | — |
| `image.effects` | Imagem com rotação, mirror, opacity, borda e máscara | PARTIAL | P1 | Fit/crop/full bleed existem; faltam rotation, flip, opacity, border/radius e mask/frame. |
| `image.ppi-diagnostics` | PPI durante edição e alerta visual | PARTIAL | P1 | O dado aparece no asset/preflight, mas não acompanha visualmente cada resize do objeto. |
| `ornament.free-object` | Ornamento como objeto gráfico livre | PARTIAL | P1 | Existe categoria e divisor ornamental, mas não um objeto modular livre para transformar. |
| `ornament.composition` | Montar cantos, bordas, frames e boxes ornamentais | MISSING | P1 | Não há primitive/agrupamento/repetição de ornamentos fora de tabela. |
| `shape.basic` | Retângulo, moldura, janela, linha e preenchimento | READY | P0 | — |
| `shape.complete` | Círculo/elipse, radius, rotation e opacity de shape | MISSING | P2 | `ShapeKind` só tem frame/window/line/fill e não há propriedades de radius/rotation/opacity. |
| `alignment.guides` | Rulers, margens, safe area, bleed, baseline e grid | READY | P0 | — |
| `alignment.smart` | Snap a guides/objetos/centro e smart guides | PARTIAL | P1 | Existe snap de 1 mm para frame; não há snap relacional nem smart guides. |
| `alignment.commands` | Alinhar e distribuir objetos | MISSING | P1 | Não há comandos de alinhamento/distribuição nem seleção múltipla para aplicá-los. |
| `layers.panel` | Painel de layers com reordenação, lock e hide | MISSING | P1 | O painel é uma árvore de páginas/seções; não lista objetos da página. |
| `shortcuts` | Atalhos de edição e transformação | PARTIAL | P1 | Undo/redo/Delete/Ctrl+D existem; C/V/X/A, Shift+Arrow e movimento de objeto não. |
| `context-menu` | Menu contextual de objeto | MISSING | P2 | Não há ações contextuais de delete, duplicate, layers, lock, group ou properties. |
| `page.lifecycle` | Criar, duplicar, excluir, mover, template e blank | READY | P0 | — |
| `page.clear` | Limpar página sem excluir a página | MISSING | P1 | Só há add/remove de bloco individual; não há clear composition. |
| `page.free-compose` | Reconstruir página blank sem código | READY | P0 | — |
| `page.lock` | Lock efetivo de página | PARTIAL | P1 | A flag `fixed` é persistida e exibida, mas não impede edição, drag ou remoção. |
| `spread` | Spread contínuo e edição entre páginas | PARTIAL | P2 | Há visualização verso/recto; não há seleção cruzada, objeto atravessando medianiz ou snap de spread. |
| `assets.library` | Biblioteca de assets com upload, busca, filtro, rename e reuse | READY | P0 | — |
| `assets.categories` | Categorias editoriais, favoritos e metadados de produção | PARTIAL | P2 | Categorias básicas e PPI existem; favoritos e categorias específicas para formas/molduras não. |
| `tables.editing` | Editar tabela, células, merge/split, rows/columns e estilo | READY | P0 | — |
| `tables.transform` | Mover e redimensionar tabela inteira no canvas | PARTIAL | P1 | Há edição interna e frame numérico genérico, mas não overlay de transform da tabela inteira. |
| `boxes` | Box com texto, título, movimento, resize e duplicate | PARTIAL | P1 | A estrutura semântica existe; faltam controles livres de fundo/borda/padding/ornamentação e estilos reutilizáveis. |
| `selection.overlap` | Selecionar objeto sobreposto, atrás ou oculto | MISSING | P1 | A seleção usa o elemento mais próximo do target; não há ciclo, Alt-click ou layer panel. |
| `undo-redo` | Undo/redo das operações editoriais existentes | READY | P0 | — |
| `page-copy-composition` | Copiar página/composição completa | PARTIAL | P1 | Existe export/import de folha e duplicate page, mas não copy/paste de composição via clipboard. |
| `production-persistence` | Persistência local, cloud/offline, print e contrato físico | READY | P0 | — |

### Ordem mínima de implementação registrada

| Ordem | ID | Objetivo |
|---:|---|---|
| 1 | `CANVA-01` | Seleção múltipla, marquee, select-all, copy/cut/paste de composição e limpeza de página. |
| 2 | `CANVA-02` | Painel de layers, lock/hide/group, ordem, movimento por teclado, resize/rotação e alinhamento. |
| 3 | `CANVA-03` | Tipografia local, estilos, efeitos de imagem e primitives/ornamentos livres. |
| 4 | `CANVA-04` | Spread contínuo, medianiz, smart guides avançadas, favoritos e refinamentos. |

### Estado final para decisão

```text
CANVA_PRODUCTION_READINESS = PARTIAL
CAN_START_REAL_LAYOUT_TODAY = YES
P0_MISSING = 0
P1_MISSING = 9
P2_MISSING = 3
```
