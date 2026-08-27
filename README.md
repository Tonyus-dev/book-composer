# Book Maker

### Editor / diagramador genérico de livros. KALLISTIS é um projeto de validação, não o produto.

---

Book Maker é um editor visual local-first para composição editorial
estruturada, com pipeline determinístico de PDF e modelo de livro
serializável. Foi desenhado para levar um livro estruturado do
manuscrito digitado a um arquivo pronto para impressão que respeita o
trim físico definido pelo próprio projeto.

O produto é deliberadamente genérico:

- qualquer livro pode existir no Book Maker (romance, livro de RPG,
  suplemento, manual técnico, livro didático, catálogo, zine, livro
  ilustrado, documentação, obra personalizada);
- o formato físico (A5, A4, Letter, 6×9", 140×210 mm ou personalizado),
  as margens, a sangria, as fontes e a paleta são **decisões do projeto**,
  não do engine;
- KALLISTIS é apenas um dos projetos que vivem dentro do Book Maker.
  Continua sendo o melhor stress test do engine (423 páginas, 140×210 mm),
  mas não define a arquitetura.

A régua de produto:

> **O Book Maker deve conseguir criar um livro completamente novo,
> não-KALLISTIS, em formato diferente, editá-lo, salvá-lo, reabri-lo e
> gerar um PDF real — sem carregar nenhuma característica de KALLISTIS.**

---

## Estado atual

| Capacidade | Status |
| --- | --- |
| Engine genérico (KALLISTIS desacoplado) | PASS |
| LIVRO TESTE genérico A4 — criar, editar, salvar, reabrir, /print, PDF | PASS |
| KALLISTIS 423 p — abrir, editar, salvar, reabrir, /print, PDF 140×210 | PASS |
| Work File real (Salvar como + Salvar + reabertura via IndexedDB) | PASS |
| `/print` autocontido quanto ao tamanho (sem width/height explícitos) | PASS |
| AssetBrowser sem duplicate-key warnings | PASS |
| Build / Typecheck / Lint focal | PASS |
| Erros fatais de browser | 0 |

---

## Régua de produto (atualizada pós-pivô)

| Capacidade | Requisito |
| --- | --- |
| **Novo livro** | Criar projeto vazio sem depender de KALLISTIS |
| **Abrir livro** | Abrir qualquer projeto válido |
| **Salvar** | Arquivo de trabalho real (File System Access API) |
| **Formato** | Dimensões configuráveis por projeto |
| **Paginação** | Número dinâmico de páginas (1, 32, 96, 316, 423, 800+) |
| **Conteúdo** | Texto, imagem, tabela, formas, sheets, etc. |
| **Assets** | Biblioteca pertencente ao projeto |
| **Estilos** | Definidos pelo projeto/template |
| **Identidade** | Nenhuma identidade KALLISTIS obrigatória |
| **Print** | Derivado das configurações do documento |
| **PDF** | Mesmo tamanho físico configurado no projeto |

### Teste-gate definitivo

> Criar um livro completamente novo, não-KALLISTIS, em outro formato,
> editá-lo, salvá-lo, reabri-lo e gerar um PDF real, sem quebrar o
> projeto KALLISTIS que já funciona.

Esse fluxo foi provado em smoke real no commit `6310292` — LIVRO TESTE
A4 12 páginas + KALLISTIS 423 páginas coexistindo sem acoplamento.

---

## Arquitetura (genérica)

```
BOOK MAKER
│
├── ENGINE GENÉRICO
│   ├── páginas / blocos / spreads
│   ├── assets
│   ├── tipografia
│   ├── estilos
│   ├── layers
│   ├── tabelas
│   ├── guides / smart guides / réguas
│   ├── undo/redo
│   ├── persistência (localStorage + IndexedDB + File System Access API)
│   └── exportação (/print + PDF)
│
├── PROJETO (decisões do livro)
│   ├── metadata (título, autor, editora, idioma)
│   ├── document (pageWidth, pageHeight, unit, orientation, bleed, margins)
│   ├── typography (fonts, paragraphStyles, headingStyles)
│   ├── appearance (palette, background, defaults)
│   ├── assets (project-owned)
│   ├── pages (blocks/elements)
│   └── export configuration
│
└── PRESETS / TEMPLATES
    ├── Romance
    ├── RPG
    ├── Manual técnico
    ├── A5 / A4 / Letter / 6×9" / personalizado
    └── projetos personalizados (incluindo KALLISTIS como template)
```

KALLISTIS vive **apenas** no terceiro nível. O engine não conhece
KALLISTIS. O `DEFAULT_TOKENS` é A4 neutro (210×297mm), a paleta base é
cinza, a fonte display é Georgia, a fonte funcional é system-ui. KALLISTIS
entra quando o usuário escolhe o template/projeto KALLISTIS.

---

## O que o engine faz (e o que ele NÃO faz)

### O engine faz

- **Composição**: páginas, blocos, templates, escala, colunas, baseline grid.
- **Edição visual**: drag, multi-select, undo/redo, properties, snapping.
- **Persistência**: autosave localStorage, File System Access API (work
  file), IndexedDB para assets binários, JSON portátil exportável.
- **Preflight**: regras estáticas + medições de layout (overflow, assets
  ausentes, resolução efetiva, ocorrências editoriais).
- **PDF**: pipeline determinístico (Playwright + pdfunite + Ghostscript)
  que respeita o `document.pageWidth × pageHeight` do projeto.

### O engine NÃO faz

- assumir que toda biblioteca de assets é KALLISTIS;
- fixar trim de 140×210mm ou qualquer outro formato;
- fixar fonte (EB Garamond era acoplamento histórico, agora removido);
- hardcodar identidade visual (paleta roxa KALLISTIS removida da base);
- fixar número de páginas — suporta 1, 32, 96, 316, 423, 800+.

---

## Quick start

```bash
cd book_maker
bun install --frozen-lockfile
bun run dev -- --host 127.0.0.1 --port 4185
```

O editor abre em `http://127.0.0.1:4185/`. A rota `/` é o editor; `/print`
é a renderização limpa (sem UI de editor) usada para impressão e PDF.

Criar um novo projeto: menu **Projeto � → Novo projeto → Novo livro**
(Form: A4/A5/Letter/6×9"/140×210/personalizado; páginas iniciais
configuráveis; título e autor).

Salvar:
- **Salvar** — snapshot em localStorage + (se houver arquivo vinculado)
  grava no arquivo de trabalho real via File System Access API.
- **Salvar como…** — escolhe arquivo novo, vincula-o para Saves futuros.
- **Exportar PDF Otimizado** — chama o pipeline de produção.

---

## KALLISTIS — papel atual

KALLISTIS é um projeto Book Maker real, completo, com 423 páginas em
140×210mm, fonte EB Garamond, paleta proprietária e identidade visual
definida. Continua sendo:

- o **melhor stress test** do engine (projeto grande, trim incomum,
  tipografia proprietária, layout editorial denso);
- um **template/preset** instalável e válido;
- uma **referência de regressão** para garantir que o motor não regride
  para projetos grandes e complexos.

Não é mais:
- a identidade visual default do engine;
- a fonte default do editor;
- o caso de uso exclusivo;
- o motivo pelo qual o produto existe.

O JSON `projects/kallistis-manual-do-mundo-reconstrucao.json` continua
sendo aceito pelo editor e renderizado corretamente — foi apenas
despromovido de "default" para "um dos projetos".

---

## Stack

**Aplicação**
- TypeScript
- React 19
- TanStack Start / TanStack Router
- Vite 8
- Nitro (Node e Cloudflare adapters)

**Pipeline de produção (PDF)**
- Playwright (Chromium)
- pdfunite (poppler)
- Ghostscript (`-dPDFSETTINGS=/printer`)

**Persistência**
- localStorage
- IndexedDB
- File System Access API (Chromium)

**Infraestrutura**
- Cloudflare (Wrangler / D1 / R2) — disponível para o adapter Cloudflare.
  O pipeline de PDF otimizado roda em Node, não na edge, por design.

---

## Repositório

```
kallistis-book/
├── README.md            ← este arquivo
└── book_maker/
    ├── README.md        ← guia de instalação / dev / build
    ├── src/
    │   ├── book/        ← modelo editorial + renderer + templates
    │   ├── data/        ← emptyBook (genérico), canonicalBook (KALLISTIS preset)
    │   ├── editor/      ← canvas, toolbar, painéis, store
    │   ├── lib/         ← persistence, preflight, assets
    │   └── routes/      ← /, /print, /login
    ├── scripts/         ← export-pdf, materialize-manuscript, …
    ├── projects/        ← snapshots serializáveis (.json) — KALLISTIS, velarim, etc.
    ├── public/          ← manifesto editorial, favicon, assets locais
    ├── tests/e2e/       ← specs Playwright
    └── package.json
```

---

## Smoke real — gates que passaram

Cada um desses débitos foi provado por smoke real em Chromium
(headless ou headed), com bytes físicos no filesystem:

1. **Engine genérico** (`53d5feb`) — LIVRO TESTE A4 criado, editado,
   salvo, PDF A4 real sem passar width/height ao page.pdf().
2. **Work File real** (`b56dc4a` P1, `6310292`) — arquivo físico escrito
   via Salvar como, segunda escrita atualizou MESMO arquivo via
   handle vinculado em IndexedDB, reabertura via
   `loadBoundBookFromWorkFile` preservou o estado, overwrite guard
   intacto.
3. **`/print` autocontido** (`b56dc4a` P2-A) — injeta `@page { size: <w> <h> }`
   derivado dos tokens; PDF sai no formato exato do projeto
   (210×297mm para A4, 140×210mm para KALLISTIS) sem o consumidor
   precisar conhecer dimensões.
4. **AssetBrowser sem duplicate keys** (`b56dc4a` P2-B) — deduplicação
   do manifesto em render (177 entradas / 166 ids únicos → 0 warnings).

---

## Licença

A definir antes da publicação do clone público sanitizado. Nenhuma
licença permissiva é concedida por este README.
