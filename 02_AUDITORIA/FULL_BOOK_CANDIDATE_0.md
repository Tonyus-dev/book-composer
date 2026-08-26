# FULL BOOK CANDIDATE 0 — MATERIALIZAÇÃO INTEGRAL + AUDITORIA

Data: 2026-08-22
Status: `EDITORIAL_GAPS_REMAIN`

## 1. Executive verdict

The first integral candidate completed through the real semantic parser, asset resolver, PageRenderer, Chromium measurement, split/reflow and repair pipeline. It produced a 360-page candidate with all structural gates green. This is not a production approval: visual/editorial review remains required, especially for the 603 PDF preflight warnings and the difference from the golden/history page counts.

## 2. Inputs and provenance

| Input | SHA-256 |
|---|---|
| Frozen manuscript v2 | `5427818b44f08ba00cc74f8635172b44952ded4eb948589d22016e4272990d83` |
| REV1 catalog | `04ea301b8d4eebd616a25deca1c4aba8ae3f3a8a22561fbd6f683bca2d783627` |
| Curated asset policy | `ead8ff144795aeee3a385f3dd46586757017716cb55ba243acfb8ca08e4095b5` |
| `drive-image-inventory.json` | `c5cf52b4abdad10ed809260c7aba58243610f86c51e849c40ff4d2afaa0bc3e6` |
| `drive-image-disposition.csv` | `7cdd42d89b06cc0b20d04e0c15b8c1ca1b162f9d3814b81db784c12e41536fce` |
| Canonical project | `eeed61aa8fd4e3eeca4457498c396745a035a493aecd3616d4f6da38e0507ccc` |

The catalog gate `## 28. Cobertura editorial capítulo a capítulo — REV1` passed. Output was written only to `/tmp`; the canonical project was not overwritten.

## 3. Materialization runtime

Command: `bun scripts/materialize-manuscript.mjs --scope ALL --output /tmp/kallistis-full-candidate-0.json`

- `MANUSCRIPT_BLOCKS_TOTAL`: 4,382
- `MANUSCRIPT_BLOCKS_MATERIALIZED`: 4,382
- `PILOT`: false
- `TARGET_PAGE_COUNT`: none
- `REPORT_VERDICT`: PASS

Candidate outputs:

- `/tmp/kallistis-full-candidate-0.json`
- `/tmp/kallistis-full-candidate-0.report.json`
- `/tmp/kallistis-full-candidate-0-run.log`

## 4. Page count

| Reference | Pages |
|---|---:|
| Golden PRONTOV1 | 344 |
| Historical book | 423 |
| Candidate 0 | 360 |

The 360-page result is emergent. It was not packed toward 344 or 423. The difference is attributable to the current mix of full-art openings, image-top/side compositions, tables, text density, continuation decisions and section breaks.

## 5. Source integrity

- `SOURCE_TEXT_LOST`: 0
- `SOURCE_TEXT_ADDED`: 0
- `SOURCE_TEXT_ORDER_CHANGED`: 0
- `SOURCE_BLOCKS_DUPLICATED`: 0
- `BROKEN_FRAGMENT_SEQUENCE`: 0
- `DUPLICATED_PARAGRAPHS`: 0 detected by materializer diagnostics
- `MISSING_HEADINGS`: 0 in materialized source-block accounting
- `DUPLICATED_HEADINGS`: 0 structural duplicate detected
- `EMPTY_GENERATED_PAGES`: 0

## 6. Tables

- `TABLE_SOURCE_COUNT`: 152 source table separators detected
- `TABLE_GENERATED_COUNT`: 178 generated table blocks
- `TABLE_ROWS_LOST`: 0
- `TABLE_ROWS_DUPLICATED`: 0
- `BROKEN_TABLE`: 0
- `TABLE_SPLITS`: 27 continuation blocks
- `TABLE_CONTINUATIONS`: 27
- `TABLE_HEADER_REPEATS`: present on generated table blocks
- `TABLE_OVERFLOW`: 0
- Generated table rows counted: 1,101.

The generated count exceeds source separators because tables can be split into continuations; this is not treated as duplication because the source-fragment gates passed.

## 7. Pagination

- `PAGE_OVERFLOW`: 0
- `BLOCK_OUT_OF_BOUNDS`: 0 observed by measurement gates
- `ORPHAN_HEADINGS`: 0
- `BROKEN_TABLE`: 0
- `WORD_CHUNK_SPLITS`: 0 reported
- `TEXT_SPLITS`: present only as measured source-preserving fragments; fragment sequence gate passed.
- `TABLE_SPLITS`: 27
- `UNDERFILLED_PAGES_LT_60_PERCENT`: 32
- `OVERDENSE_PAGES`: 0 overflow-backed; density outliers still require editorial review.
- `MIN_FILL_RATIO`: not emitted by the report schema
- `MEDIAN_FILL_RATIO`: not emitted by the report schema
- `MEAN_FILL_RATIO`: 0.8921
- `MAX_FILL_RATIO`: not emitted by the report schema

The 32 underfilled pages are an editorial-review list, not an automatic defect. Full-art, front matter, maps and transitions can legitimately underfill.

## 8. Text-only runs

- `MAX_TEXT_ONLY_RUN`: 59 pages
- `MEAN_TEXT_ONLY_RUN`: not emitted by the report schema
- `MEDIAN_TEXT_ONLY_RUN`: not emitted by the report schema
- `BODY_MAX_CONSECUTIVE_TEXT_PAGES`: available in report diagnostics; long Velarim runs are not automatically defects.

The long runs are concentrated in text-heavy sections and must be judged against the golden's editorial language, not penalized solely for length.

## 9. Assets

- `V2_ASSETS_TOTAL`: 47
- `V2_ASSETS_RUNTIME_RESOLVED`: 47
- `MISSING_REQUIRED_ASSET`: 0
- `FALLBACK_USED`: 0
- `HASH_MISMATCH`: 0
- `UNAPPROVED_ASSET_USED`: 0 detected
- `ASSET_PLACEMENTS_TOTAL`: 100 history-image placements reported
- `UNIQUE_ASSETS_USED`: 71 unique SHA values in history usage
- `ASSET_REUSE_COUNTS`: represented in `IMAGES_USED` and `USED_HISTORY_ASSETS` in the candidate report
- `REPEATED_ASSET_TOO_SOON`: no structural gate failure
- `SAME_ASSET_ADJACENT`: no structural gate failure
- `SEMANTIC_ASSET_MISMATCH`: 0 invalid semantic placements

The materializer created temporary derived copies during resolution; they were removed after the run so no new generated asset side effect remains in the working tree.

## 10. Composition distribution

| Composition | Count |
|---|---:|
| PART_HERO | 6 |
| IMAGE_TOP | 15 |
| SIDE_ART_RIGHT | 2 |
| SIDE_ART_PAIR | 8 |
| MAP_PAGE | 3 |
| GEOGRAPHY_OPENING | 3 |
| POVO_OPENING | 9 |
| OFICIO_CULTURAL_OPENING | 9 |
| BESTIARY_ENTRY | 17 |
| PEDRALMA_OPENING | 2 |
| GEOGRAPHY_FLOW | 22 |
| CULTURE_FLOW | 64 |
| TEXT_FLOW | 52 |
| TEXT_FEATURE | 6 |
| TIMELINE_MILESTONE | 8 |

Editorial families: `TITLE_PAGE=1`, `COPYRIGHT_EXPEDIENTE=1`, `DEDICATION=1`, `INTRODUCTION=1`, `PART_OPENING=6`, `NARRATIVE=345`. No unused compatible family is automatically classified as a bug.

## 11. Parts

| Part | Opening page | Composition | Result |
|---|---:|---|---|
| PARTE I — O MUNDO PARTIDO | 12 | PART_HERO | EQUIVALENT pending full golden review |
| PARTE II — O CINTURÃO DAS FRESTAS | 53 | PART_HERO | EQUIVALENT pending full golden review |
| PARTE III — POVOS, OFÍCIOS E COMUNIDADES VIVAS | 83 | PART_HERO | EQUIVALENT pending full golden review |
| PARTE IV — VELARIM | 172 | PART_HERO | EQUIVALENT pending full golden review |
| PARTE V — JOGANDO KALLISTIS | 204 | PART_HERO | EQUIVALENT pending full golden review |
| PARTE VI — CONDUZINDO KALLISTIS | 258 | PART_HERO | EQUIVALENT pending full golden review |

Six real Part headings were parsed and rendered. No Part VII heading was present in the canonical frozen source selected by this run; this is recorded, not invented or silently repaired.

## 12. Peoples

All 9/9 canonical peoples were found with opening pages: Aelvari 87, Kragor 90, Draken 94, Nomos 97, Livres 101, Dóreos 104, Teriantes 107, Nimari 110, Vitrálios 113. Text integrity passed for the complete candidate. Results remain `EQUIVALENT` pending page-by-page golden review; no clone-layout or asset substitution was introduced.

## 13. Offices

All 8/8 office mechanics were present as `MECÂNICA DE JOGO — Guardião/Duelista/Atirador/Tecelão/Curador/Evocador/Artífice/Batedor` headings on pages 123, 126, 129, 132, 136, 138, 141 and 144. They use the office cultural-opening family and preserve source order. Result: `EQUIVALENT` pending detailed golden comparison.

## 14. Communities / Pedr’alma

Pedr’alma openings were rendered with `PEDRALMA_OPENING=2`; source text and semantic image placement passed. Result: `EQUIVALENT` at structural/editorial-function level.

## 15. Velarim

Velarim begins at Part IV page 172. The candidate preserves long text-only runs and tables without forcing decorative images merely to reduce visual debt. `VELARIM_PAGES`, exact table subset and linguistic subfamily counts are not separately emitted by the current report schema; this is an audit gap, not a source loss. Result: `EQUIVALENT` provisionally.

## 16. Rules

Rules content, combat, magic/evocation and procedures were materialized across the later sections with tables and text-flow pages. `RULES_TABLES` and section-specific density are not separately emitted; global table and overflow gates passed. Result: `EQUIVALENT` provisionally.

## 17. Master and bestiary

`BESTIARY_ENTRY=17` compositions were rendered, including entries through page 345 and appendices through page 354. No broken stat-block or asset-semantic error was reported. Entry-by-entry visual separation still requires human review.

## 18. Visual rhythm and outliers

All 360 pages were rasterized:

- `/tmp/kallistis-full-candidate-0-renders/P0001.png`–`P0360.png`
- Contact sheets: `contact-0001-0040.png` through `contact-0321-0360.png`

Automated outlier candidates: 32 pages below 60% fill. No empty generated page, overflow page, orphan heading, broken table or invalid image placement was found. The 603 PDF warnings require review before production; they are not silently reclassified as cosmetic.

## 19. Golden comparison

The candidate is not declared pixel-matched to PRONTOV1. Functional comparison is provisional until all outlier pages and Part/people/office/full-art pages are reviewed individually.

- `BETTER_THAN_GOLDEN`: 0 claimed
- `EQUIVALENT`: 9 core/family-level provisional claims
- `ACCEPTABLE`: pending complete visual audit of 32 underfilled pages and 603 warnings
- `WORSE`: 0 claimed
- `BROKEN`: 0 structural findings

## 20. Pilot acceptable-family reassessment

The five V0.2 `ACCEPTABLE` classifications were mostly coverage limitations. The full candidate now renders the missing families (`BESTIARY_ENTRY`, full Parts, all peoples and offices), so they are not evidence of a proven generic-engine defect. Final family verdicts remain provisional until the required page-level review is completed.

## 21. Product test

- `EDITOR_OPEN`: not separately executed in the editor UI
- `PROJECT_LOAD`: candidate JSON was loaded by the real `/print` route for Chromium rendering
- `PAGE_NAVIGATION`: not separately executed in the editor UI
- `PRINT_RENDER`: PASS — all 360 candidate pages rendered through `/print`
- `EDIT_TEMP`: not executed
- `SAVE_TEMP`: not executed
- `RELOAD_TEMP`: not executed

The proven product surface in this run is print rendering, not editor persistence.

## 22. PDF preflight

- `PDF_GENERATED`: YES
- `PDF_PAGES`: 360
- `PDF_BYTES`: recorded at `/tmp/kallistis-full-candidate-0.pdf`
- `PDF_PREFLIGHT`: 0 errors, 603 warnings, 151 info
- Physical size: 140mm × 210mm
- Bleed: preserved by the print pipeline configuration
- Font embedding / invalid-page inspection: not separately completed

## 23. Regressions and integrity

- `MANUSCRIPT_CHANGED`: 0
- `CATALOG_CHANGED`: 0
- `CURATION_INPUT_FILES_CHANGED`: 0
- `CANONICAL_PROJECT_CHANGED`: 0
- `TYPECHECK`: not rerun after this integral-only run; previous V0.2 regression was PASS
- `TEST`: previous V0.2 regression PASS
- `BUILD`: previous V0.2 regression PASS
- `DIFF_CHECK`: PASS after candidate run
- Historical `test:materializer`: remains dependent on the absent generated report and is not fabricated as PASS.

## 24. P0/P1/P2/P3

- `P0`: 0 structural failures
- `P1`: 0 proven structural/editorial failures; full golden review still pending
- `P2`: 32 underfilled-page candidates and 603 PDF warnings require review
- `P3`: not catalogued in this pass

## 25. Recommendation

Do not call this production-final. The candidate is structurally valid and printable, but the PDF warning set, underfilled-page list and full visual comparison require human editorial review before calibration or release.

## 26. Next exact action

Review the 32 underfilled pages, all Part/full-art/people/office/table-split pages, and the 603 PDF warnings; then decide whether targeted editorial calibration is authorized.

`FULL_BOOK_RUN=YES`
`CANONICAL_PROJECT_OVERWRITTEN=NO`
`COMMIT=NO`
`PUSH=NO`
`PR=NO`
`STOP_AND_REQUEST_FINAL_CALIBRATION_DECISION`

