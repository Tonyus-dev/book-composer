# Relatório QA — capa, assets e resolução física de impressão

**Data:** 11 de agosto de 2026
**Branch observada:** `work`
**HEAD inicial desta correção:** `e2125d280643a2f80727234895422c1c4425bc9e`
**Base confirmada pelo merge-base:** `2f4ff79304b74124d3fcb0f5759ee62a6def08df`
**Status:** **AUTOMAÇÃO PASS; PRODUTO INCIDENTE — HOMOLOGAÇÃO BROWSER PENDENTE.**

## Objetivo correto

O Book Maker preserva a fonte original e verifica se ela contém informação real suficiente para o tamanho físico em que será impressa. Uma imagem insuficiente não é ampliada automaticamente, não recebe detalhe inventado e não pode virar `PASS` por interpolação.

## Raster original preservado

O upload de JPEG, PNG e WebP grava o Data URL derivado dos bytes recebidos e mantém `pixelWidth` e `pixelHeight` naturais. O upload não cria Canvas, não aumenta o arquivo para o tamanho da página e não persiste `printTargetPpi` ou `printInterpolated`. SVG permanece vetorial.

O limite individual de 4 MB continua sendo apenas uma barreira defensiva do asset. Ele **não garante** que o projeto inteiro caiba no `localStorage`: Data URL/base64 tem overhead e a quota total varia por origem e navegador.

## PPI como propriedade do uso

O preflight calcula o PPI somente quando o tamanho físico é determinável:

- capa com imagem `fullBleed` ou `position: "full"`: usa largura e altura da página mais a sangria dos dois lados;
- bloco com `frame`: usa `frame.width` e `frame.height` em milímetros;
- bloco com `width` e `height` explicitamente em `mm`: usa essas dimensões;
- sem geometria confiável: não inventa PPI; apenas preserva metadado declarado existente do bloco ou catálogo.

Para raster local, são usadas as dimensões naturais do asset. Projetos legados marcados como interpolados e que ainda guardem dimensões de origem são avaliados pelas dimensões de origem, nunca pelas dimensões aumentadas.

O cálculo é:

```text
ppiX = pixelWidth / (widthMm / 25.4)
ppiY = pixelHeight / (heightMm / 25.4)
effectivePpi = min(ppiX, ppiY)
```

Classificação:

- abaixo de 150 ppi: `ERROR`;
- de 150 até abaixo de 300 ppi: `WARNING`;
- 300 ppi ou mais: sem ocorrência de baixa resolução.

## Capa preservada

Foi mantido `coverMode: "art-only" | "overlay"`.

- `art-only` mostra somente a arte principal, sem título, subtítulo, autor, editora ou lockup; os metadados continuam no JSON;
- `overlay` mostra a composição editorial existente;
- `coverMode` ausente continua compatível como `overlay`;
- converter uma página comum em capa agora escolhe `overlay`, não oculta texto automaticamente;
- a arte principal prioriza `fullBleed`, depois `position: "full"`, depois a primeira imagem como fallback legado;
- aplicar outro asset substitui `src` e `alt` do mesmo bloco principal em vez de criar outra arte.

Uma capa `art-only` sem arte principal resolvível agora produz erro `missing-asset` com a mensagem “Capa em modo art-only sem arte principal válida.”

## Persistência local

`saveLocalBook` agora retorna sucesso ou falha explícita. Erros de quota, serialização ou storage são capturados e registrados. O autosave somente muda para `saved` quando a função retorna sucesso; em falha, muda para `error`. O livro permanece em memória e não existe fallback que finja persistência.

## Editor manual de imagens

Crop, resize e remoção de fundo continuam sendo operações explícitas do usuário, mas não atribuem mais PPI global ao asset editado. A criação do Canvas é bloqueada acima de 32 milhões de pixels e o resultado é recusado acima de 4 MB, evitando uma operação obviamente impossível para a persistência local atual.

## CI e testes

O workflow de CI passou a executar, nesta ordem:

1. `bun install --frozen-lockfile`;
2. `bun run lint`;
3. `bun run typecheck`;
4. `bun run test`;
5. `bun run build`.

O teste de produção de imagens cobre:

- 25,4 mm a 300 ppi = 300 pixels;
- PPI real de uma capa de 150 × 220 mm;
- `ERROR` abaixo de 150 ppi;
- `WARNING` entre 150 e 299 ppi;
- ausência de ocorrência de baixa resolução a partir de 300 ppi;
- prioridade `fullBleed`, depois `position: "full"`;
- fallback legado;
- substituições A → B → C mantendo uma arte principal;
- erro de capa `art-only` sem arte.

Execução final: lint, typecheck, testes, build e `git diff --check` terminaram com exit code 0.

## Homologação de produto

Build, lint, typecheck e testes não homologam o produto. Ainda é obrigatório executar em navegador real:

1. abrir o editor sem erro fatal;
2. verificar visualmente `art-only` e `overlay`;
3. trocar a arte A → B → C e confirmar um único bloco principal;
4. enviar raster ruim e confirmar dimensões originais e warning/error;
5. enviar raster adequado e confirmar ausência de baixa resolução;
6. recarregar e conferir persistência;
7. abrir `/print`;
8. exportar e abrir o PDF.

Se o navegador continuar indisponível, o veredito permanece: **PRODUTO INCIDENTE — HOMOLOGAÇÃO BROWSER PENDENTE**. Curl HTTP 200, build e mocks não substituem esse fluxo.

Nesta execução, `chromium.launch()` falhou porque o executável do Playwright não existe no container. `bunx playwright install chromium` também falhou com exit code 1: todas as tentativas de download retornaram HTTP 403 `Forbidden`. Portanto, editor, `/print` e PDF não foram homologados nem substituídos por mock ou screenshot inventada.

## Arquivos da correção

- `src/lib/assets/upload.ts`
- `src/lib/assets/registry.ts`
- `src/lib/assets/edit.ts`
- `src/lib/preflight/static-rules.ts`
- `src/book/types.ts`
- `src/book/templates/types.ts`
- `src/editor/panels/AssetBrowser.tsx`
- `src/editor/state/store.tsx`
- `src/lib/persistence/local.ts`
- `scripts/test-image-production.ts`
- `.github/workflows/ci.yml`
- este relatório
