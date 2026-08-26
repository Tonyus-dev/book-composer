# MATERIALIZATION PILOT V0 RAW — VS GOLDEN

Data: 2026-08-22
Status: V0 RAW EXECUTED — FAILED EDITORIAL GATE

## Catalog

- `CATALOG_STATUS`: CATALOG_FOUND_EXACT
- `CATALOG_PATH_LOCAL`: `/home/tonyus-dev/Downloads/CURADORIA_DE_CONTEUDO/agora_sim_producao/PRODUCAO/00_CATALOGO_MESTRE_PRODUCAO_KALLISTIS_REV1.md`
- `CATALOG_BYTES`: `260375`
- `CATALOG_SHA256`: `04ea301b8d4eebd616a25deca1c4aba8ae3f3a8a22561fbd6f683bca2d783627`
- `CATALOG_MTIME`: `2026-08-13 19:05:50.539166653 -0300`
- `CATALOG_GATE_28`: PASS — marcador literal `## 28. Cobertura editorial capítulo a capítulo — REV1` presente na linha 347.
- `ABSOLUTE_PATHS_ADDED_TO_CODE`: 0
- `ABSOLUTE_PATHS_ADDED_TO_POLICY`: 0

## Pre-run hashes

| Input | SHA-256 |
|---|---|
| Manuscrito congelado v2 | `5427818b44f08ba00cc74f8635172b44952ded4eb948589d22016e4272990d83` |
| Catálogo REV1 | `04ea301b8d4eebd616a25deca1c4aba8ae3f3a8a22561fbd6f683bca2d783627` |
| `scripts/policy/kallistis-curated-assets.json` | `ead8ff144795aeee3a385f3dd46586757017716cb55ba243acfb8ca08e4095b` |
| `drive-image-inventory.json` | `c5cf52b4abdad10ed809260c7aba58243610f86c51e849c40ff4d2afaa0bc3e6` |
| `drive-image-disposition.csv` | `7cdd42d89b06cc0b20d04e0c15b8c1ca1b162f9d3814b81db784c12e41536fce` |

## Pilot execution

Command: `KALLISTIS_CATALOG_PATH=<catalog> bun scripts/materialize-manuscript.mjs --scope HISTORIA --pilot --output /tmp/kallistis-pilot-v0.json`

- `PILOT_RUN`: ABORTED
- `PILOT_PAGES`: NOT_AVAILABLE
- `OUTPUT`: `/tmp/kallistis-pilot-v0-run.log`; no pilot JSON/PDF/renders were generated.

### Abort record

- `STAGE`: `ensureServer`, before PageRenderer/Chromium page rendering.
- `ERROR`: `Book Maker não respondeu em http://127.0.0.1:4185`
- `STACK`:

  ```text
  Error: Book Maker não respondeu em http://127.0.0.1:4185
      at ensureServer (scripts/materialize-manuscript.mjs:3287:15)
      at async main (scripts/materialize-manuscript.mjs:4567:24)
      at processTicksAndRejections (native:7:39)
  ```

- `INPUT`: canonical manuscript SHA passed; exact catalog and §28 passed; policy loaded; materializer reported `34 resolved, 13 skipped, 0 via legacy fallback` before the server gate.
- `ROOT_CAUSE`: the materializer's local Book Maker health check did not receive an HTTP response from `127.0.0.1:4185` after its automatic `bun run dev` start attempt. The child process uses ignored stdio, so the underlying Vite startup error was not exposed. No corrective retry was made, per pilot stop rule.

## V0 metrics

All page, source, table, layout, asset, and visual-family metrics: `NOT_AVAILABLE` because no page was rendered.

Visual comparison against PRONTOV1: `NOT_PERFORMED` for all requested families.

## Post-abort integrity

The manuscript, catalog, and curation input hashes were rechecked after the abort and remained unchanged.

## Required stop state

- `FULL_BOOK_RUN`: NO
- `COMMIT`: NO
- `PUSH`: NO
- `PR`: NO
- `NEXT_EXACT_ACTION`: inspect the suppressed Vite startup failure in a separately authorized run, then rerun only PILOT_V0_RAW.
- `STOP_AND_REQUEST_HUMAN_REVIEW`: YES

## Rodada posterior — boot e runtime truth

### Server boot forensics

- `SERVER_COMMAND`: `bun`
- `SERVER_ARGV`: `run dev -- --host 127.0.0.1 --port 4185`
- `SERVER_CWD`: `/home/tonyus-dev/Portifolio/kallistis-book/book_maker`
- `SERVER_PORT`: `4185`
- `SERVER_HOST`: `127.0.0.1`
- `SERVER_ENV`: inherited process environment; no catalog path was embedded in code.
- `HEALTHCHECK`: `GET http://127.0.0.1:4185/print`
- `HEALTHCHECK_ATTEMPTS`: initial 1.5 s probe, then polling every 300 ms up to 120 s.
- `PORT_4185_BEFORE`: FREE
- `PORT_4185_AFTER`: FREE
- `ROOT_HTTP_PASS`: NO — connection refused
- `PRINT_ROUTE_PASS`: NO — connection refused
- `ROOT_CAUSE_CLASS`: `BIND_FAILURE`
- `FIRST_CAUSAL_ERROR`: `Error: listen EPERM: operation not permitted 127.0.0.1:4185`
- Captured logs: `/tmp/kallistis-book-server.stdout.log` and `/tmp/kallistis-book-server.stderr.log`.

The minimum observability fix changed only `stdio: "ignore"` to bounded stdout/stderr capture and includes command, cwd, exit code, signal, and output tail in future boot failures.

### Runtime asset truth

The 13 skips were caused by a proven status mismatch: policy v3 uses `EXISTING_IN_REPO_NOW`, while runtime eligibility accepted only `EXACT_EXISTING` and `DUPLICATE_EXISTING`. The runtime allowlist now includes `EXISTING_IN_REPO_NOW`; no asset bytes, SHA, asset IDs, or editorial choices changed.

- `RUNTIME_ASSETS_TOTAL`: 47
- `RUNTIME_ASSETS_RESOLVED`: 47
- `RUNTIME_ASSETS_SKIPPED`: 0
- `RUNTIME_ASSET_HASH_MISMATCH`: 0
- `FALLBACK_USED`: 0

### V0 raw result after the minimal fixes

- `PILOT_RUN`: EXECUTED
- `PILOT_PAGES`: 7
- `SOURCE_TEXT_LOST`: 0
- `SOURCE_TEXT_ADDED`: 0
- `SOURCE_TEXT_ORDER_CHANGED`: 0
- `SOURCE_BLOCKS_DUPLICATED`: 0
- `TABLE_ROWS_LOST`: 0
- `TABLE_ROWS_DUPLICATED`: 0
- `PAGE_OVERFLOW`: 0
- `BLOCK_OUT_OF_BOUNDS`: not emitted by the report schema
- `ORPHAN_HEADING`: 1
- `BROKEN_TABLE`: 0
- `WORD_CHUNK_SPLITS`: not emitted by the report schema
- `MISSING_REQUIRED_ASSET`: 0
- `FALLBACK_USED`: 0
- `VERDICT`: FAIL — `ORPHAN_HEADINGS=1` and visual gate used only 2 of the required 3 composition families.
- `OUTPUT_JSON`: `/tmp/kallistis-pilot-v0.json`
- `OUTPUT_REPORT`: `/tmp/kallistis-pilot-v0.report.json`
- `OUTPUT_LOG`: `/tmp/kallistis-pilot-v0-run.log`

The pilot reached real PageRenderer/Chromium execution. No CSS, pagination, template, manuscript, catalog, golden, or asset correction was applied after the result. The remaining orphan-heading and composition-family findings require human review.

## V0 coverage incident

`--scope HISTORIA` ends before `PARTE II`. The original pilot then called `selectPilotBlocks` on that already-truncated set, while most of its anchors (`PARTE II`, peoples, offices, rules, appendices) were outside the set. Only the initial 17-block window was selected. This is classified as `SCOPE_INTERACTION` plus `PILOT_SELECTION_TOO_SMALL`, not an early renderer stop.

V0 selected 17 of 586 blocks available in the HISTORIA parse and rendered 7 pages. Its composition families were only `TEXT_FLOW` (3) and `TEXT_FEATURE` (2); the visual 2/3 gate was therefore a coverage failure, not evidence of a complete visual comparison.

## V0 orphan forensic trace

- `ORPHAN_HEADING_TEXT`: `Apresentação`
- `ORPHAN_HEADING_ID`: `src-7257525282a4f3776dff`
- `ORPHAN_PAGE`: 7
- `NEXT_BLOCK`: none in the selected pilot set
- `ROOT_CAUSE_CLASS`: `COMPOSITION_BOUNDARY`
- `ORPHAN_CREATED_AT`: pilot harness truncation at the end of its first 17-block window.
- `ORPHAN_SHOULD_HAVE_BEEN_PREVENTED_BY`: complete heading subtree selection.
- `ORPHAN_SHOULD_HAVE_BEEN_REPAIRED_BY`: no general repair; `repairOrphanHeadings` only moves a trailing heading when a next page exists.
- `WHY_IT_SURVIVED`: the selected window ended at the heading, so no next page existed for the repair routine to use. This is not a page-number-specific renderer defect.

## Pilot harness correction

The pilot-only path now parses `ALL` source sections and selects non-contiguous windows by semantic headings/roles: Part I/II/III heroes, narrative, timeline, table, geography, peoples, offices, Pedr’alma, Velarim, rules, master/appendices, and bestiary. Each selected source block retains its source identity and order; no manual pages or textual edits are introduced. Normal non-pilot scope behavior remains unchanged.

## V0.1 result

- `PILOT_RUN`: PASS
- `PILOT_PAGES`: 25
- `FAMILIES_SELECTED`: 146 source blocks across the requested representative windows.
- `FAMILIES_RENDERED`: 10 composition families (`PART_HERO=3`, `IMAGE_TOP=5`, `MAP_PAGE=1`, `GEOGRAPHY_OPENING=1`, `POVO_OPENING=1`, `OFICIO_CULTURAL_OPENING=1`, `PEDRALMA_OPENING=1`, `CULTURE_FLOW=2`, `TEXT_FLOW=3`, `TEXT_FEATURE=3`).
- `SOURCE_TEXT_LOST`: 0
- `SOURCE_TEXT_ADDED`: 0
- `SOURCE_TEXT_ORDER_CHANGED`: 0
- `SOURCE_BLOCKS_DUPLICATED`: 0
- `TABLE_ROWS_LOST`: 0
- `TABLE_ROWS_DUPLICATED`: 0
- `PAGE_OVERFLOW`: 0
- `BLOCK_OUT_OF_BOUNDS`: not emitted by the report schema.
- `ORPHAN_HEADING`: 0
- `BROKEN_TABLE`: 0
- `WORD_CHUNK_SPLITS`: not emitted by the report schema.
- `MISSING_REQUIRED_ASSET`: 0
- `FALLBACK_USED`: 0
- `OUTPUT_JSON`: `/tmp/kallistis-pilot-v0.1.json`
- `OUTPUT_REPORT`: `/tmp/kallistis-pilot-v0.1.report.json`
- `OUTPUT_LOG`: `/tmp/kallistis-pilot-v0.1-run.log`

The visual gate passed structurally (`10/3` composition-family threshold) with semantic correctness true. No aesthetic calibration or visual-family correction was applied.

## V0.1 editorial review

Visual evidence captured without replacing V0.1:

- `/tmp/kallistis-pilot-v0.1-renders/P001.png` through `P025.png`
- `/tmp/kallistis-pilot-v0.1-contact-sheet.png`

The review compared sections/functions with the PRONTOV1 golden language rather than matching page numbers. The observed V0.1 families were: `FRONT_MATTER`, `PART_HERO`, `NARRATIVE`, `TABLE`, `GEOGRAPHY`, `POVO`, `OFICIO`, `COMMUNITY_PEDRALMA`, `VELARIM`, `RULES`, `MASTER`, and `BESTIARY-adjacent reference material`. `BESTIARY_ENTRY` itself was not rendered as a dedicated composition family in this sample.

### V0.1 family matrix

| Family | V0.1 result | Evidence / root cause |
|---|---|---|
| FRONT_MATTER | EQUIVALENT | Hierarchy and front-matter rhythm are coherent; sparse dedication is intentional. |
| PROLOGUE | ACCEPTABLE | Present through opening structure, but not a dedicated full-art prologue window in this sample; `POLICY_SELECTION`, not a renderer failure. |
| PART_HERO | EQUIVALENT | Full-art page dominates, title integrates into the art, and transition is legible. |
| NARRATIVE | EQUIVALENT | Paragraph density and heading rhythm remain readable across the sample. |
| TIMELINE | ACCEPTABLE | Timeline-specific composition was not materially represented; no P1 rule evidence. |
| TABLE | EQUIVALENT | Headers, alignment, row rhythm, and continuation remain readable; no broken rows. |
| GEOGRAPHY | EQUIVALENT | Map and geography opening use image as editorial anchor with readable text. |
| POVO | EQUIVALENT | Aelvari sample integrates portrait and text without destroying legibility. |
| OFICIO | EQUIVALENT | Office portrait participates in the composition and does not read as an unattached image. |
| COMMUNITY_PEDRALMA | EQUIVALENT | Image, title, and prose form a coherent opening. |
| VELARIM | EQUIVALENT | Dense prose/table treatment is accepted without forced decorative imagery. |
| RULES | EQUIVALENT | Rules/table pages are legible and structurally intact. |
| MASTER | ACCEPTABLE | Appendix/reference page works, but this sample is not sufficient to claim golden-level breadth. |
| BESTIARY | ACCEPTABLE | Bestiary content appears in the selected flow, but no dedicated `BESTIARY_ENTRY` composition was rendered. |

`V0.1_BETTER_THAN_GOLDEN=0`, `V0.1_EQUIVALENT=9`, `V0.1_ACCEPTABLE=5`, `V0.1_WORSE=0`, `V0.1_BROKEN=0`.

The ACCEPTABLE classifications are coverage/editorial-sample limitations (`P1_EDITORIAL_GAPS=0`), not grounds for a generic-engine or CSS patch. No family showed a proven general-rule defect requiring calibration. In particular, Velarim was not “improved” with extra imagery, and no page-number or heading-specific exception was introduced.

## Calibration changes

`CALIBRATIONS_APPLIED=NONE`. The evidence did not isolate a P1 family rule whose correction would be justified without inventing a preference or changing the golden. Pagination, templates, CSS, assets, manuscript, catalog, and golden remain unchanged.

## V0.2 result

V0.2 was regenerated with the exact V0.1 semantic selection and no calibration patch. This is a comparability/control run, not a claim of visual improvement.

- `PILOT_PAGES`: 25
- `SOURCE_TEXT_LOST`: 0
- `SOURCE_TEXT_ADDED`: 0
- `SOURCE_TEXT_ORDER_CHANGED`: 0
- `TABLE_ROWS_LOST`: 0
- `TABLE_ROWS_DUPLICATED`: 0
- `PAGE_OVERFLOW`: 0
- `ORPHAN_HEADINGS`: 0
- `BROKEN_TABLE`: 0
- `MISSING_REQUIRED_ASSET`: 0
- `FALLBACK_USED`: 0
- `V0_2_RESULT`: equivalent to V0.1; no regressions introduced.

Outputs: `/tmp/kallistis-pilot-v0.2.json`, `/tmp/kallistis-pilot-v0.2.report.json`, `/tmp/kallistis-pilot-v0.2.pdf`, `/tmp/kallistis-pilot-v0.2-renders/P001.png`–`P025.png`, and `/tmp/kallistis-pilot-v0.2-contact-sheet.png`.

`REGRESSIONS_INTRODUCED=NONE` relative to V0.1. The V0.2 report remains PASS with the same 25 pages, 146 materialized blocks, zero orphan headings, zero overflow, zero broken tables, zero source-text deltas, and zero asset fallback/skips.

## Final verdict for this calibration round

`VEREDITO=EDITORIAL_GAPS_REMAIN` for the sample's ACCEPTABLE coverage families, with no P1 correction authorized by the evidence. The structural gates remain green. Human editorial review is required before any broader calibration or full-book decision.
