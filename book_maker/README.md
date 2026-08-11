# KALLISTIS BOOK BUILDER

Ferramenta editorial local-first para composição visual e exportação do Livro Básico do RPG
KALLISTIS. O modelo editorial leve vive em um `Book` serializável, com metadados no
`localStorage`, blobs locais no IndexedDB, preflight profissional, mesa de luz editorial e
exportação física via Chromium. O trim é **140 × 210 mm**, com **5 mm de sangria por lado**;
a página full bleed mede **150 × 220 mm**.

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
bun run test         # testes de contratos editoriais
bun run build        # build de produção (client + worker)
bun run test:e2e     # Chromium real contra servidor local: editor, IndexedDB, /print e PDF
bun run preview      # pré-visualiza o build
```

## Exportação de PDF

```sh
bun run export:pdf                                   # usa o demo-book
bun run export:pdf -- --in book.json                 # a partir de um JSON exportado do editor
bun run export:pdf -- --in book.json --out dist/export/livro.pdf
bun run export:pdf -- --force                        # ignora o gate de preflight (ERROR)
```

“Exportar projeto portátil” gera, sob demanda, JSON autocontido com os bytes locais. O autosave
normal e os snapshots cloud guardam apenas metadados e referências; JSONs legados com Data URL
continuam aceitos e são migrados para IndexedDB somente depois da gravação ser confirmada.
O exportador grava o PDF e o relatório de preflight (`.json` / `.html`) na pasta de saída
(`dist/export/` por padrão, ignorada pelo Git). Na primeira execução, instale o Chromium do
Playwright: `bunx playwright install chromium`.

## Deploy na Cloudflare

O build usa Nitro com o preset `cloudflare-module` e gera automaticamente
`.output/server/wrangler.json`. O binding D1 de produção é declarado em `wrangler.jsonc` e a
migration versionada vive em `migrations/0001_initial.sql`.

```sh
bunx wrangler login
bun run deploy       # build + wrangler deploy usando o manifesto gerado
bun run worker:dry-run # valida o pacote sem publicar
bun run worker:dev   # executa localmente no runtime Workers
bun run db:migrate   # aplica migrations no D1 remoto autenticado
```

O nome do Worker vem de `package.json` (`kallistis-book-builder`). Para publicar via GitHub
Actions, defina os secrets do repositório:

- `CLOUDFLARE_API_TOKEN` — token com permissão _Workers Scripts: Edit_
- `CLOUDFLARE_ACCOUNT_ID` — ID da conta Cloudflare

Cloudflare Access não é usado nesta versão por decisão do proprietário. As APIs privadas usam
single-owner auth: configure os secrets `OWNER_PASSWORD` e `SESSION_SECRET` exclusivamente no
Worker. A sessão é um cookie HttpOnly, Secure e SameSite=Strict; a senha nunca vai para o bundle,
localStorage ou query string. `GITHUB_TOKEN`, quando configurado como secret do Worker, é usado
apenas server-side para leitura de `Tonyus-dev/kallistis_producao` (`main`) nos prefixes canônicos.

R2 é o destino dos assets importados e snapshots. O binding `R2_ASSETS` usa o bucket
`kallistis-book-assets`; uploads locais permanecem no IndexedDB até o upload ser confirmado e
então recebem referência R2 leve. D1 mantém metadados, revisões e fallback JSON compatível.
PPI não é propriedade intrínseca do arquivo: o preflight o calcula a partir dos pixels originais
e da geometria física de cada uso, sem upscale ou reamostragem silenciosa. O limite defensivo de
4 MB por imagem permanece nesta mudança.

## GitHub Actions

- `.github/workflows/ci.yml` — instalação congelada, lint, typecheck, testes, build e Playwright
  Chromium (`test:e2e`), nessa ordem
- `.github/workflows/deploy.yml` — deploy manual na Cloudflare via `workflow_dispatch`

O gate reproduz exatamente:

```sh
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run test
bun run build
bunx playwright install --with-deps chromium
bun run test:e2e
```

## Stack

TanStack Start · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · dnd-kit · Playwright ·
Cloudflare Workers
