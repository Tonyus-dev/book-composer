# Relatório de implementação e validação — capa, assets e preparação para 300 ppi

**Data do relatório:** 11 de agosto de 2026  
**Branch:** `work`  
**Commits abrangidos:** `a06f6ff` e `3cae4e1`  
**Status:** **INCIDENTE — implementação automatizada verificada, fluxo real de produção não homologado em navegador**

## 1. Objetivo

Este trabalho tratou quatro solicitações relacionadas:

1. impedir que título, autoria, editora e lockup contaminem uma capa que já contém a composição gráfica completa;
2. fazer a escolha de uma nova imagem substituir a arte principal da capa, em vez de acrescentar blocos invisíveis ou concorrentes;
3. preparar imagens raster para um alvo de impressão de 300 ppi, registrando quando houve interpolação;
4. retirar branding público residual do Lovable e verificar as funcionalidades afetadas.

## 2. Alterações realizadas

### 2.1. Modos explícitos de capa

Foi acrescentado `coverMode` ao modelo serializável de página, com os valores:

- `art-only`: renderiza somente a imagem;
- `overlay`: mantém título, subtítulo, autor, editora e lockup sobre a arte.

Ao converter uma página que ainda não era capa para o template `cover`, o editor define `art-only` como opção inicial. O conteúdo textual não é apagado do projeto: ele apenas deixa de ser renderizado enquanto esse modo estiver ativo. Isso permite voltar para `overlay` sem perda editorial.

O painel de propriedades passou a apresentar as opções “Imagem pronta, sem textos” e “Arte com textos sobrepostos”. Editor, impressão e exportação continuam usando o mesmo `CoverTemplate`; não foi criado um esconderijo de CSS exclusivo do preview.

### 2.2. Identificação e substituição da arte principal

Foi criado `findPrimaryImage`, que prioriza uma imagem marcada como `fullBleed` ou `position: "full"` e usa a primeira imagem apenas como compatibilidade com páginas legadas.

O navegador de assets passou a usar esse mesmo critério. Em uma capa:

- se já existir arte principal, o clique atualiza `src`, `alt` e `effectivePpi` desse bloco;
- se não existir, cria uma imagem `full`, `fullBleed`, com `fit: "cover"`;
- o bloco atualizado ou criado é selecionado após a operação.

Com isso, cliques sucessivos não devem acrescentar silenciosamente uma segunda arte principal à capa.

### 2.3. Preparação raster para impressão

Foram adicionadas funções puras para:

- converter milímetros em pixels no alvo configurado;
- calcular ppi efetivo considerando largura e altura;
- calcular a escala necessária para cobrir o tamanho físico sem deformar a proporção;
- antecipar as dimensões e a área do raster final.

O upload mede a página e a sangria, calcula os pixels necessários em 300 ppi e usa Canvas nativo do navegador somente quando a imagem raster não possui pixels suficientes. Imagens que já atendem ao alvo não são redimensionadas. SVG permanece vetorial e não é rasterizado.

Quando ocorre interpolação, o asset persiste:

- dimensões originais;
- dimensões produzidas;
- alvo de 300 ppi;
- indicador `printInterpolated`;
- MIME e quantidade final de bytes.

**Limitação física declarada:** interpolar aumenta a quantidade de pixels, mas não recupera detalhes ausentes na imagem original. Por isso o editor e o preflight identificam explicitamente a interpolação; ela não é apresentada como melhoria real de nitidez.

### 2.4. Proteções acrescentadas após a primeira revisão

A primeira implementação poderia solicitar um Canvas excessivamente grande para imagens com proporções extremas. O commit corretivo `3cae4e1` acrescentou duas barreiras antes de persistir o resultado:

1. limite de 32 milhões de pixels para o raster planejado;
2. limite de 4 MB para os bytes finais, coerente com a arquitetura local-first existente.

Se um limite for ultrapassado, a operação falha com mensagem explícita. O original não é substituído parcialmente e o sistema não declara sucesso.

### 2.5. Preflight e interface

O navegador de assets mostra dimensões, bytes, ppi e um dos sinais relevantes:

- resolução nativa;
- 300 ppi por interpolação.

O preflight produz uma ocorrência informativa quando a imagem foi interpolada, incluindo dimensões originais. Os limites anteriores de resolução crítica e recomendada continuam ativos.

### 2.6. Branding público

Foram realizadas as seguintes mudanças públicas:

- remoção de `twitter:site: @Lovable`;
- remoção do favicon residual em `public/favicon.ico`;
- uso do símbolo oficial de KALLISTIS como `icon` e `apple-touch-icon`;
- alteração do idioma do documento para `pt-BR`.

A dependência de build com nome Lovable não foi removida sem evidência de que fosse dispensável. O escopo foi o branding enviado ao navegador.

## 3. Arquivos afetados

| Arquivo                                 | Responsabilidade da mudança                              |
| --------------------------------------- | -------------------------------------------------------- |
| `src/book/types.ts`                     | Modelo de modo de capa e metadados de produção do asset. |
| `src/book/templates/types.ts`           | Identificação compartilhada da arte principal.           |
| `src/book/templates/openings.tsx`       | Renderização condicional da sobreposição da capa.        |
| `src/editor/state/store.tsx`            | Modo seguro ao converter uma página em capa.             |
| `src/editor/panels/PropertiesPanel.tsx` | Escolha explícita da composição da capa.                 |
| `src/editor/panels/AssetBrowser.tsx`    | Substituição da arte principal, upload e indicadores.    |
| `src/lib/assets/registry.ts`            | Cálculo físico de pixels, ppi e plano raster.            |
| `src/lib/assets/upload.ts`              | Preparação local via Canvas e limites de segurança.      |
| `src/lib/preflight/static-rules.ts`     | Aviso de interpolação e resolução.                       |
| `src/routes/__root.tsx`                 | Metadados, idioma e ícone públicos.                      |
| `scripts/test-image-production.ts`      | Testes dos cálculos e da seleção de arte.                |
| `package.json`                          | Inclusão do teste de imagem na suíte padrão.             |

## 4. Verificações executadas

Foram executadas com sucesso:

- `bun run test:image`;
- `bun run typecheck`;
- `bun run lint`;
- `bun run test`;
- `bun run build`;
- `git diff --check`;
- resposta HTTP 200 do servidor local por `curl` em execução anterior.

O teste de imagem verifica:

- conversão de 25,4 mm para 300 pixels;
- dimensões A4 aproximadas em 300 ppi;
- cálculo pelo menor ppi entre os dois eixos;
- escala proporcional de uma imagem normal;
- rejeição preventiva de uma proporção que excederia o limite raster;
- preferência por imagem full bleed como arte principal;
- fallback para páginas legadas.

## 5. Tentativas de validação no navegador

### 5.1. Ambiente local

O servidor Vite iniciou e respondeu HTTP 200, mas o ambiente não continha Chromium, Chrome ou Firefox. As tentativas de instalar Chromium e Firefox pelo Playwright foram recusadas com HTTP 403 por todos os mirrors disponíveis. Por isso não foi possível executar o clique real, observar o Canvas no navegador ou produzir screenshot.

### 5.2. Produção

Foi fornecida a URL `https://book-maker.kallistis.app/` e uma senha de proprietário. A ferramenta de navegação recebeu HTTP 401 antes de alcançar a tela `/login`; o `curl` do container recebeu HTTP 403 na criação do túnel. A senha não chegou a ser enviada ao endpoint do aplicativo.

Não foram usados mock, bypass de autenticação, resposta simulada ou dados falsos para substituir essa validação.

## 6. Matriz de homologação real

| Critério                   | Estado                         | Evidência                                  |
| -------------------------- | ------------------------------ | ------------------------------------------ |
| App compila                | Aprovado                       | `bun run build`.                           |
| Tipos e lint               | Aprovado                       | `bun run typecheck` e `bun run lint`.      |
| Cálculos de 300 ppi        | Aprovado de forma automatizada | `bun run test:image`.                      |
| App local responde         | Aprovado parcialmente          | HTTP 200 por `curl`; sem interação visual. |
| Login de produção          | Não verificado                 | Bloqueio 401/403 anterior ao app.          |
| Troca real da capa         | Não verificado                 | Navegador indisponível.                    |
| Ausência visual de overlay | Não verificado                 | Navegador indisponível.                    |
| Upload e Canvas reais      | Não verificado                 | Navegador indisponível.                    |
| Persistência após reload   | Não verificado                 | Navegador indisponível.                    |
| Igualdade editor/impressão | Não verificado                 | Navegador indisponível.                    |
| PDF final                  | Não verificado                 | Fluxo manual não executado.                |
| Favicon no Chrome limpo    | Não verificado                 | Chrome indisponível.                       |
| Cloudflare/GitHub/R2 reais | Não verificado                 | Ambiente integrado inacessível.            |

## 7. Resultado segundo o critério Produto Real

O trabalho **não está homologado como produto funcionando**. Build, lint e testes automatizados passaram, mas não substituem a validação do fluxo principal. O status permanece **INCIDENTE** até que seja possível:

1. autenticar no ambiente publicado;
2. trocar a capa três vezes e confirmar uma única arte principal;
3. verificar `art-only` e `overlay` visualmente;
4. enviar imagens reais e observar conversão, erros e persistência;
5. recarregar o projeto e abrir impressão/PDF;
6. confirmar os metadados e o favicon em um navegador limpo.

## 8. Riscos e pendências

1. **Qualidade original:** 300 ppi interpolados não equivalem a uma fonte nativa em 300 ppi.
2. **Armazenamento:** variantes raster grandes continuam limitadas pela arquitetura que embute bytes no JSON/localStorage.
3. **Tamanho físico:** o upload prepara a imagem usando página e sangria; outros usos menores podem não precisar dessa quantidade de pixels.
4. **Assets remotos:** a preparação local depende de o navegador conseguir ler a imagem sem bloqueio de CORS.
5. **Compatibilidade legada:** capas antigas sem `coverMode` continuam em `overlay`; páginas convertidas pelo editor passam a `art-only`.
6. **Homologação:** nenhuma conclusão visual deve ser aprovada antes do teste real descrito neste relatório.

## 9. Histórico dos commits

- `a06f6ff fix: prepare cover images for print` — implementação de capa, substituição de asset, preparação raster, preflight, metadados públicos e teste inicial.
- `3cae4e1 fix: guard print image conversion` — proteção de área/bytes, plano raster testável e tratamento correto de SVG.
