# KALLISTIS BOOK BUILDER

Ferramenta editorial local-first para composição visual e exportação do Livro Básico do RPG
KALLISTIS. Todo o layout vive em um objeto `Book` serializável (JSON), com autosave em
`localStorage`, preflight profissional, mesa de luz editorial e exportação de PDF 210x280mm
via Chromium.

## Requisitos

- Node.js 20+ (ver `.nvmrc`) e [Bun](https://bun.sh) (ou npm)

## Desenvolvimento local

```sh
git clone <url-do-repositorio>
cd kallistis-book-builder
bun install
bun run dev          # editor em http://localhost:8080
```

Rotas: `/` (editor) e `/print` (renderização limpa usada pelo exportador).

Scripts úteis:

```sh
bun run lint         # ESLint
bun run typecheck    # TypeScript
bun run build        # build de produção (client + worker)
bun run preview      # pré-visualiza o build
```

## Exportação de PDF

```sh
bun run export:pdf                                   # usa o demo-book
bun run export:pdf -- --in book.json                 # a partir de um JSON exportado do editor
bun run export:pdf -- --in book.json --out dist/export/livro.pdf
bun run export:pdf -- --force                        # ignora o gate de preflight (ERROR)
```

O exportador grava o PDF e o relatório de preflight (`.json` / `.html`) na pasta de saída
(`dist/export/` por padrão, ignorada pelo Git). Na primeira execução, instale o Chromium do
Playwright: `bunx playwright install chromium`.

## Deploy na Cloudflare

O build usa Nitro com o preset `cloudflare-module` e gera automaticamente
`dist/server/wrangler.json` mais `.wrangler/deploy/config.json`. Não é necessário manter um
`wrangler.toml` manual.

```sh
bunx wrangler login
bun run deploy       # build + wrangler deploy
```

O nome do Worker vem de `package.json` (`kallistis-book-builder`). Para publicar via GitHub
Actions, defina os secrets do repositório:

- `CLOUDFLARE_API_TOKEN` — token com permissão _Workers Scripts: Edit_
- `CLOUDFLARE_ACCOUNT_ID` — ID da conta Cloudflare

## GitHub Actions

- `.github/workflows/ci.yml` — lint, typecheck e build em push/PR
- `.github/workflows/deploy.yml` — deploy na Cloudflare em push na `main` (ou manual)

## Stack

TanStack Start · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · dnd-kit · Playwright ·
Cloudflare Workers
