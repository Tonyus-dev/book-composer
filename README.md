# KALLISTIS Book Maker

### Local-first editorial production for complex illustrated books.

---

KALLISTIS Book Maker is the editorial production tool that materializes the
**KALLISTIS — Manual do Mundo (Reconstrução)** book. It is a visual editor
plus a deterministic PDF pipeline, designed to take a structured editorial
model from typed manuscript to a print-ready file that matches the trim of
the final book, page by page.

The tool covers the full editorial loop:

- **Composição** — pages, blocks, templates, scale, columns, baseline grid.
- **Edição visual** — drag, multi-select, undo/redo, properties, snapping.
- **Persistência** — autosave to localStorage and File System Access API,
  with IndexedDB for binary assets.
- **Preflight** — runtime diagnostics that catch missing assets, overflow,
  and hidden content before export.
- **PDF de produção** — a real production pipeline (Playwright + pdfunite
  + Ghostscript) that produces the optimized PDF used for print.

The optimized output is intentionally a **production-ready book**, not a
preview snapshot. A green build is necessary but not sufficient: the only
gate that matters is editing through the UI, saving, reloading, exporting
the current state, and inspecting the final PDF.

---

## Production status

| Gate | Status |
| --- | --- |
| Local editorial production | PASS |
| Editor → persistence → optimized PDF | PASS |
| Canonical book | 423 pages |
| Trim | 140 × 210 mm |
| Preflight errors | 0 |
| Optimized PDF | ~32 MiB |
| Build | PASS |
| Lint | PASS |
| Typecheck | PASS |

Cloud optimized export is **unsupported by design**. The Node-only export
endpoint (`POST /api/export-from-snapshot`) detects non-Node runtimes and
returns 503. Production-time CI is expected to run on a worker with Node
and use `npm run export:pdf -- --in <arquivo>` directly. This is a product
decision, not a defect of the local workflow.

---

## Product principle

> **Build green ≠ production-ready book.**

The real gate is end-to-end:

```
edit
 → save
 → reload
 → export current state
 → inspect final PDF
```

If the final PDF opens, renders the right trim, and contains the exact
state that was on screen, the build is production-ready. Anything less
is a preview.

---

## Architecture

```
Manuscript / Project
        │
        ▼
       Book
        │
        ▼
   Visual Editor
        │
        ▼
     Autosave
   (localStorage + IndexedDB)
        │
        ▼
 Current Snapshot
        │
        ▼
 POST /api/export-from-snapshot      (Node-only)
        │
        ▼
   scripts/export-pdf.mjs
        │
        ▼
   Playwright  (Chromium, print CSS, 140×210 mm)
        │
        ▼
     pdfunite  (50-page chunks → single PDF)
        │
        ▼
   Ghostscript  (-dPDFSETTINGS=/printer)
        │
        ▼
 Production PDF  (~32 MiB, EB Garamond)
```

---

## Features

📖 **Editor**

- Composition by page and spread
- Block types: title, text, image, quote, box, table, divider, caption,
  form, sheet, shapes, lockup, TOC
- Drag, multi-select, undo/redo with keyboard shortcuts
- Properties panel for type-specific settings
- Smart guides, snap-to-grid, ruler readout
- Overlays: rulers, margins, bleed, safe area, columns, baseline

⚙️ **Persistence**

- Autosave to `localStorage` keyed by project
- Binary assets externalized to IndexedDB
- File System Access API for save-in-place to a working file
- Portable JSON export with inline assets
- Multi-project library on the same machine

🖨️ **Production**

- Preflight diagnostics (errors, warnings, info)
- Two export paths:
  - **Browser preview** — `Gerar PDF` (Chromium print dialog)
  - **Production** — `Exportar PDF Otimizado` (Playwright + pdfunite + Ghostscript)
- EB Garamond typography, 1 mm grid, 140 × 210 mm trim
- Print-ready PDF, ~32 MiB for 423 pages

---

## Quick start

```bash
cd book_maker
npm install
npm run dev
```

The editor opens at `http://127.0.0.1:5173` (or the next free port).

### Production export

Inside the editor:

1. **Salvar** — flush the current snapshot to localStorage / the working file.
2. **Exportar PDF Otimizado** — sends the current snapshot to
   `POST /api/export-from-snapshot`, which spawns the production pipeline.

The PDF is downloaded as a binary blob. The route is **Node-only** by
design; in a serverless deployment the optimized export runs in CI with:

```bash
npm run export:pdf -- --in projects/kallistis-manual-do-mundo-reconstrucao.json
```

---

## Editorial format

- **Canonical book**: 423 pages
- **Trim**: 140 × 210 mm
- **Interior font**: EB Garamond (Type 3 glyphs in the rendered PDF; see
  "Known limitations" below)

---

## Stack

**Application**

- TypeScript
- React 19
- TanStack Start / TanStack Router
- Vite 8
- Nitro (Node and Cloudflare adapters)

**Production pipeline**

- Playwright (Chromium)
- pdfunite (poppler)
- Ghostscript (`-dPDFSETTINGS=/printer`)

**Persistence**

- localStorage
- IndexedDB
- File System Access API

**Infrastructure**

- Cloudflare (Wrangler / D1 / R2) — used by the Cloudflare deployment
  path. The optimized Node export is **not** a Cloudflare Worker and
  does not run on the edge.

---

## Local-first

The optimized production workflow is intentionally local-first. It
depends on:

- Node.js (>= 20)
- Filesystem temp space
- Playwright (Chromium)
- pdfunite
- Ghostscript

These are deliberately not part of the Cloudflare Worker runtime. The
Cloudflare adapter handles a different role (project persistence, asset
storage, owner-auth API) and is complementary infrastructure.

---

## Known limitations

**PDF text extraction is partial for some EB Garamond glyphs** after
Ghostscript optimization. The `/printer` setting drops the `ToUnicode`
CMap on Type 3 fonts, which is the documented behavior of Ghostscript
across `/printer`, `/prepress`, and `/screen` settings.

- Visual rendering: **valid**
- Print rendering: **valid**
- PDF opens correctly: **valid**
- Programmatic text extraction: **partial**

The fix is **not** to swap fonts and **not** to remove Ghostscript. The
trade-off — ~90 % size reduction with no visible loss — is part of the
production decision.

The existing E2E suite covers functional flows; some fixtures are
historically flaky and were left untouched in this freeze.

---

## Repository layout

```
book_maker/
├── src/
│   ├── book/          ← editorial model, renderer, templates
│   ├── editor/        ← canvas, panels, state
│   ├── routes/        ← /, /print, /login
│   ├── lib/           ← persistence, auth, assets
│   └── server-api.ts  ← /api/export-from-snapshot, /api/health, owner API
├── scripts/
│   ├── export-pdf.mjs     ← production PDF pipeline
│   ├── materialize-manuscript.mjs
│   └── …
├── projects/          ← canonical Book snapshots (.json)
├── public/            ← cover, branding, asset manifest
├── tests/e2e/         ← Playwright specs
└── playwright.config.ts
```

---

## Development

```bash
cd book_maker

npm run dev          # vite dev server
npm run build        # vite build (Nitro + Cloudflare adapters)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm run test         # unit tests (table, authoring, sheet, image)
npm run test:e2e     # playwright test
npm run export:pdf   # node scripts/export-pdf.mjs
```

Engine: **Node.js >= 20**.

---

## License

Internal. Reproduction of the KALLISTIS content is governed by the
project's editorial license.
