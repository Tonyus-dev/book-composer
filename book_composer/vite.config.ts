// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    /* O JSON editorial é o arquivo de trabalho do editor. Salvá-lo não pode
       ser interpretado pelo Vite como alteração de código/HMR, senão a página
       atual é desmontada e a seleção volta para o primeiro fólio. */
    server: {
      watch: {
        ignored: ["**/projects/kallistis-manual-do-mundo-reconstrucao.json"],
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  /* INC-1: expõe o sidecar canônico projects/ como asset estático no output
     do build (Nitro copia para .output/public/projects/). Fonte canônica
     continua sendo book_composer/projects/kallistis-production-plan.json.
     maxAge=0 desabilita Cache-Control imutável porque o sidecar é versionado
     e pode mudar entre deploys; a UI já usa cache: "no-store" no fetch.
     O cast `as never` contorna o tipo restrito de LovableViteTanstackOptions
     (que só expõe preset/output/cloudflare por design); o spread runtime
     do @lovable.dev/vite-tanstack-config propaga publicAssets para Nitro. */
  nitro: {
    publicAssets: [{ baseURL: "/projects", dir: "projects", maxAge: 0, fallthrough: false }],
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  } as never,
});
