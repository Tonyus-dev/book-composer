# BOOK-COMPOSER

Editor / diagramador genérico de livros. KALLISTIS é um projeto de validação (template + stress test), não o produto.

O BOOK-COMPOSER nasceu durante a produção de **KALLISTIS — Manual do Mundo**, que continua sendo o melhor stress test do engine (423 páginas, 140×210 mm, tipografia proprietária). Mas o produto é deliberadamente genérico: qualquer livro — romance, RPG, suplemento, manual técnico, didático, catálogo, zine, obra personalizada — pode existir no BOOK-COMPOSER.

<!-- TODO public clone: add a sanitized current screenshot of the editor. -->

## O que é

O BOOK-COMPOSER combina materialização automatizada, templates editoriais, edição manual visual, preflight e exportação de projetos portáteis. O editor trabalha sobre um modelo `Book` serializável e renderiza a mesma estrutura no canvas, no modo de impressão e na exportação PDF.

O formato físico (A5, A4, Letter, 6×9", 140×210 mm ou personalizado), margens, sangria, fontes e paleta são decisões do projeto, não do engine. O engine é neutro; KALLISTIS é um dos projetos que vivem dentro dele.

Ele não é um CMS genérico, um editor de texto comum ou um clone visual de outra ferramenta. É uma bancada editorial orientada à composição de livros.

## Por que ele existe

Livros estruturados repetem tarefas que podem ser automatizadas, mas decisões de hierarquia, ritmo, imagem e composição ainda precisam de julgamento humano. O BOOK-COMPOSER faz a parte repetitiva e deixa o ajuste editorial final visível e direto no canvas.

A ferramenta é genérica por construção: cada projeto define o seu próprio formato, identidade e cadência. KALLISTIS é o stress test mais exigente que rodamos (423 páginas, 140×210 mm, tipografia proprietária), mas não é o que define a régua do produto.

## Estado atual

Ferramenta funcional em desenvolvimento ativo, agora desacoplada de KALLISTIS como produto. KALLISTIS continua sendo o melhor stress test do engine (423 páginas, 140×210 mm) e vive dentro do BOOK-COMPOSER como um projeto de exemplo/template. Build e testes automatizados são importantes, mas não substituem a validação manual do editor, do preflight e da saída impressa.

### Gates pós-pivô genérico (smoke real provado)

| Gate | Status | Commit |
| --- | --- | --- |
| Engine desacoplado de KALLISTIS (DEFAULT_TOKENS, /print, verso header, paleta base, presets de tabela, ficha) | PASS | `53d5feb` |
| Work File real (File System Access API + IndexedDB handle + reabertura via `loadBoundBookFromWorkFile`) | PASS | `b56dc4a`, `6310292` |
| `/print` autocontido quanto ao tamanho (`@page { size }` derivado dos tokens; PDF sai no formato do projeto sem width/height explícitos) | PASS | `b56dc4a` |
| AssetBrowser sem duplicate-key warnings (deduplicação de manifesto em render) | PASS | `b56dc4a` |
| LIVRO TESTE A4 12 p — criar, editar, salvar, reabrir, /print, PDF A4 real | PASS | smoke |
| KALLISTIS 423 p — abrir, editar, salvar, reabrir, /print, PDF 140×210 | PASS | regressão |

## Principais recursos

### Implementado

- páginas, spreads e mesa de luz;
- templates editoriais e variantes de composição;
- navegação por Páginas, Assets e Camadas;
- edição visual de blocos, seleção direta, drag e resize;
- copy/paste nativo de elementos, inclusive multiseleção e grupos;
- multiseleção, agrupamento, bloqueio, alinhamento e distribuição;
- smart guides, snap de composição, réguas, margens, sangria, área segura e grade;
- guias do cursor opcionais, sem participação na saída editorial;
- propriedades contextuais de página e elemento;
- preflight estático e medição de layout;
- persistência local, projetos nomeados e JSON portátil;
- modo de impressão em `/print` e exportação PDF por Chromium.

### Experimental ou dependente do ambiente

- fontes e assets importados dependem do navegador e do armazenamento local disponível;
- upload remoto, D1 e R2 dependem da configuração do Worker e das credenciais do ambiente;
- validação de impressão física continua sendo uma etapa editorial própria.

### Planejado ou pendente

- screenshot sanitizado da interface para o futuro clone público;
- decisão de licença e seleção do conteúdo redistribuível;
- exemplos públicos independentes do acervo privado de KALLISTIS.

## Interface

A interface mantém o canvas no centro, a navegação de páginas/assets/camadas à esquerda e as propriedades à direita. A toolbar superior prioriza ações frequentes e agrupa visualização, inserção, ferramentas e projeto em menus.

O painel direito acompanha a seleção real do editor:

- sem bloco selecionado: propriedades da página;
- bloco selecionado: propriedades do tipo correspondente;
- múltiplos blocos: contexto de grupo e ações de composição.

Seções de propriedades são recolhíveis. Campos editáveis têm foco e aparência de formulário; identificadores herdados ou somente leitura permanecem discretos e não podem ser alterados.

## Fluxo editorial

```text
conteúdo estruturado
        ↓
materialização
        ↓
templates editoriais
        ↓
páginas e spreads
        ↓
edição visual humana
        ↓
preflight
        ↓
modo de impressão / PDF / projeto portátil
```

O materializador cuida do trabalho repetitivo; o editor humano conserva a decisão editorial final. A meta é produzir a maior parte da página automaticamente e tornar os ajustes restantes rápidos e diretos no canvas.

## Materialização automática

O materializador existente fica em `scripts/materialize-manuscript.mjs`. Ele recebe conteúdo estruturado, catálogo e projeto-base conforme os argumentos do script e produz um `Book` serializável. Os comandos específicos de materialização são destinados ao acervo editorial do projeto de trabalho; um futuro clone público deverá fornecer seus próprios exemplos sanitizados.

## Templates

Os templates são declarados em `src/book/templates.ts` e tipados em `src/book/types.ts`. A implementação atual inclui famílias para capa, front matter, sumário, abertura de parte, abertura de capítulo, narrativa, regras em duas colunas, perfil, tabela, citação, arte, mapa e marco de cronologia.

O template é uma decisão editorial, não apenas uma decoração. Variantes, composição, conteúdo e assets devem continuar coerentes entre si.

## Edição manual

O fluxo manual prioriza:

```text
selecionar → editar → arrastar → alinhar → agrupar → bloquear → salvar
```

Atalhos e interações nativas existentes incluem seleção aditiva com `Shift`/`Ctrl`/`Cmd`, agrupamento com `Ctrl/Cmd + G`, menu contextual, drag, resize e `Shift + G` para alternar as guias do cursor.

`Ctrl/Cmd + C` e `Ctrl/Cmd + V` copiam elementos para uma clipboard interna da sessão. O paste cria novos IDs, preserva posições relativas e referências de assets, pode ser feito em outra página e participa do histórico como uma única operação. Campos de texto e propriedades continuam usando o clipboard nativo do navegador.

As guias do cursor são uma preferência do editor armazenada localmente. Elas mostram duas linhas auxiliares no canvas, não entram no projeto editorial e não aparecem no PDF ou na impressão. Smart guides, snap, margens, área segura e equal spacing são mecanismos distintos.

## Assets e camadas

Assets podem ser inspecionados no painel próprio e blocos podem ser selecionados pela aba Camadas. O estado de visibilidade, bloqueio e ordem pertence ao modelo do projeto quando suportado pelo bloco. Assets locais usam o armazenamento do navegador até que uma operação remota seja confirmada.

## Smart guides e ferramentas de composição

O editor oferece réguas, grade opcional de 1 mm, snap, guias de centro/borda, margens, sangria, área segura, colunas e baseline. O menu `Visualização` concentra essas opções junto de zoom, página, spread, mesa de luz e modo de impressão.

O foco no canvas recolhe temporariamente os painéis laterais e pode ser desativado para restaurar o estado anterior da interface.

## Preflight

O preflight combina regras estáticas com medições de layout. Ele sinaliza, entre outros problemas, overflow, assets ausentes ou inadequados, resolução efetiva, imagens fora da composição e ocorrências editoriais relevantes. Um erro real deve ser revisado antes da exportação de produção; a ferramenta não corrige conteúdo silenciosamente.

O relatório pode ser consultado no editor e exportado em JSON ou HTML.

## Projetos portáteis

O menu `Projeto` permite criar projetos locais, abrir snapshots, importar e exportar JSON portátil. O salvamento normal mantém o projeto no armazenamento local do navegador; o botão `Salvar` também grava o arquivo de trabalho escolhido pelo usuário quando a File System Access API está disponível.

Projetos legados continuam sendo normalizados pelo carregador. O formato deve ser tratado como contrato serializável e versionável, não como banco privado do editor.

## Instalação

Requisitos verificados:

- Node.js 22, conforme `.nvmrc`;
- Bun, usado pelo lockfile e pelos scripts do projeto;
- Chromium do Playwright para exportação PDF e testes E2E.

```bash
git clone <repository-url>
cd <repository-directory>
bun install --frozen-lockfile
bunx playwright install chromium
```

A URL acima é intencionalmente um placeholder: a URL do futuro clone público ainda não foi definida.

## Como executar

Para iniciar o editor local:

```bash
bun run dev -- --host 127.0.0.1 --port 4173
```

Abra `http://127.0.0.1:4173/`. A rota `/` é o editor e `/print` é a renderização limpa usada na preparação de impressão e PDF.

O script `scripts/abrir-kallistis-book-maker.sh` também existe para o launcher local do ambiente de trabalho; ele não é necessário para uma instalação portátil.

## Desenvolvimento

Scripts principais:

```bash
bun run typecheck
bun run test
bun run build
bun run preview
```

`bun run dev` inicia o Vite. O projeto usa TanStack Start, React, TypeScript, Tailwind CSS, dnd-kit e Playwright, além do runtime Nitro para o pacote Cloudflare.

## Build

```bash
bun run build
```

O build gera os artefatos client, SSR e Worker em diretórios ignorados pelo Git. O deploy é uma operação separada e requer configuração explícita de Cloudflare; este README não autoriza publicação.

## Testes

```bash
bun run typecheck
bun run test
```

Os testes de contrato cobrem modelos de tabela, authoring, sheets e imagens. O comando `bun run test:e2e` também existe e usa Chromium real, mas a suíte atual ainda contém dois cenários legados que esperam controles da toolbar anterior; eles precisam ser migrados para os menus atuais antes de serem tratados como gate verde. Instale o navegador antes do E2E quando necessário.

`bun run lint` executa ESLint, porém o checkout de trabalho atual ainda contém erros históricos de formatação Prettier fora desta missão. O lint não é apresentado aqui como gate verde.

O resultado automatizado não substitui a abertura real do aplicativo, a navegação por páginas, a revisão de propriedades, o teste de salvar/reabrir e a inspeção da saída impressa.

## Estrutura do projeto

```text
.
├── src/
│   ├── book/           # modelo, templates e renderer editorial
│   ├── editor/         # canvas, toolbar e painéis
│   ├── lib/            # preflight, assets e persistência
│   └── routes/         # editor e modo de impressão
├── projects/           # projetos Book serializáveis do ambiente de trabalho
├── public/             # manifesto, favicon e assets locais
├── scripts/            # materialização, testes e exportação
├── tests/e2e/          # fluxos no navegador
├── migrations/         # migrações D1 versionadas
├── docs/               # documentação de apoio
└── package.json
```

## Exportação e projeto portátil

Exportação PDF:

```bash
bun run export:pdf -- --in projects/<book>.json --out dist/export/livro.pdf
```

O exportador abre `/print`, aguarda a renderização, executa o gate de preflight e grava o PDF e os relatórios. Um livro com `ERROR` interrompe a exportação de produção; `--force` existe para uma decisão consciente de diagnóstico.

Exportação e importação JSON também estão disponíveis no menu `Projeto` do editor.

## Filosofia de design

O Book Maker segue três princípios curtos:

1. automação resolve o trabalho repetitivo, sem substituir julgamento editorial;
2. capacidades existentes devem ser reutilizadas antes de criar novas camadas;
3. a interação deve permanecer compreensível, pequena e verificável.

### Ponytail

O melhor código é aquele que nunca precisou ser escrito. O projeto prefere soluções nativas, mudanças estreitas e abstrações somente quando resolvem um problema real que a arquitetura atual não resolve.

## Limitações atuais

- o editor depende de navegador moderno para persistência local e File System Access;
- recursos remotos exigem configuração própria de Worker, D1, R2 e autenticação;
- o acervo visual e textual atual não constitui automaticamente um pacote redistribuível;
- não há licença pública declarada;
- a qualidade final da composição ainda exige revisão humana e preflight.

## Roadmap

O próximo passo de distribuição é preparar um clone público sanitizado, com exemplos independentes, screenshot seguro, licença definida e validação de instalação limpa. A checklist operacional está em [`docs/PUBLIC_CLONE_CHECKLIST.md`](docs/PUBLIC_CLONE_CHECKLIST.md).

Melhorias de edição continuam sendo guiadas por problemas observados no fluxo real, não por uma porcentagem ideal de templates ou por redesign amplo.

## Identidade

O BOOK-COMPOSER é a evolução genérica do que era conhecido como "KALLISTIS Book Maker". A renomeação aconteceu após o pivô genérico (commit `f7a7bd1`) e o bugfix de Work File (`6310292`):

- Nome do produto (UI, títulos de página, README): `BOOK-COMPOSER`
- `package.json` name: `book-composer`
- `wrangler.jsonc` name + D1/R2 names: `book-composer-d1`, `book-composer-r2`
- Folder local: `book_composer/`
- Launcher: `scripts/abrir-kallistis-book-maker.sh` (mantido por compat com instalação local; novo nome a definir quando o repo público for criado)
- Repositório GitHub: ainda `Tonyus-dev/kallistis-book` — renomeação fica para outra missão coordenada com a publicação do clone público sanitizado
- Storage keys locais (`kallistis.book-builder.*`): preservados para compat de leitura; leituras antigas continuam funcionando

KALLISTIS continua sendo tratado como um projeto dentro do BOOK-COMPOSER, não como o produto.

## Origem do projeto

O BOOK-COMPOSER foi criado para atender a produção de **KALLISTIS — Manual do Mundo**. KALLISTIS explica a origem e o primeiro corpus editorial usado como stress test; o produto documentado aqui é uma ferramenta de composição genérica que não depende mais de KALLISTIS para funcionar.

## Futuro repositório público

Este repositório é atualmente o ambiente de produção do Book Maker.

Antes de uma distribuição pública será criado um clone sanitizado, no qual serão revisados separadamente:

- configurações locais;
- dados sensíveis;
- conteúdo editorial privado;
- assets de KALLISTIS;
- arquivos temporários;
- dados de desenvolvimento;
- licença e termos de distribuição.

A sanitização não faz parte do runtime ou da arquitetura do Book Maker.

## Conteúdo e assets de KALLISTIS

O checkout de trabalho contém código, projetos, textos, imagens e artefatos de produção. A presença de um arquivo no checkout não significa que ele possa ser redistribuído. O futuro clone deve separar software, conteúdo autoral de KALLISTIS e assets de terceiros antes de publicar qualquer material.

## Licença

A licença para a futura distribuição pública do Book Maker ainda será definida antes da publicação do repositório sanitizado. Nenhuma licença permissiva é concedida por este README.
