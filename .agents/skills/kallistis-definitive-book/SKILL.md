# KALLISTIS Definitive Book Editing Skill

## Overview
This skill implements the **integral editorial revision** workflow for the KALLISTIS Basic Book. The canonical source is `01_FONTE_UNICA/KALLISTIS_LIVRO_BASICO_BASE_PARA_REVISAO.docx`. All revisions are performed **directly on a working copy of the DOCX** to preserve complex Word features (tables, images, bookmarks, styles, headers/footers, landscape sections, captions, etc.).

## Frozen Foundations (Immutable Elements)
- Canonical text content (paragraphs, tables, inline equations).
- Images and their anchors.
- Section breaks, headers, footers, page numbering.
- Bookmarks, fields, and cross‑references.
- Landscape orientation pages and their margins.
- Table of contents and index placeholders.

## Workflow Phases (as defined in `00_COMECE_AQUI/PROMPT_ANTIGRAVITY_EDICAO_DEFINITIVA_KALLISTIS_v1.1.md`)
1. **Baseline Creation** – copy the source DOCX to `work/baseline/KALLISTIS_LIVRO_BASICO_BASE_PARA_REVISAO.docx` and generate a full mechanical inventory (`mechanical_values.json`).
2. **Mechanical Inventory** – script `inventory_docx.py` extracts all mechanical tables, formulas, and rule blocks, recording section, chapter, raw text, numeric values, and a SHA‑256 hash.
3. **Chapter‑by‑Chapter Review** – for each chapter a working copy is created in `work/chapters_source/`.  
   - Editors open the DOCX directly in LibreOffice (`libreoffice --writer`).  
   - After editorial changes, the file is saved as `work/chapters_edited/<chapter>.docx`.
   - The script `compare_chapter.py` validates that the edited chapter still contains every required mechanical entry and that no forbidden structural changes occurred.
4. **Integration** – the edited chapter files are merged back into a single DOCX using `python-docx` preserving original styles and section properties.
5. **Rendering** – the merged DOCX is converted to PDF via LibreOffice (`libreoffice --headless --convert-to pdf`).  
   - The PDF is placed in `output/KALLISTIS_LIVRO_BASICO_EDICAO_DEFINITIVA_v1.1.pdf`.
6. **Pre‑flight QA** – `preflight_check.py` runs a visual diff using `pandoc` to generate an HTML preview of both the source and edited versions, then runs an automated layout audit (missing images, broken bookmarks, style mismatches).
7. **Commit & Release** – once all chapters have `revisado`, `cânone_aprovado`, `técnica_aprovada` and `voz_autoral_aprovada`, a Git commit `baseline-completo-validado` is created and the final artefacts are committed.

## Acceptance Criteria
- Two final artefacts exist:
  - `output/KALLISTIS_LIVRO_BASICO_EDICAO_DEFINITIVA_v1.1.docx`
  - `output/KALLISTIS_LIVRO_BASICO_EDICAO_DEFINITIVA_v1.1.pdf`
- `mechanical_values.json` contains a complete inventory of every mechanical entry with the fields:
  - `categoria`, `nome`, `capítulo`, `seção`, `texto_literal`, `números_encontrados`, `tabela_origem`, `hash`
- Every chapter folder includes a metadata flag `voz_autoral_aprovada` set to `true` before the final merge.
- Git repository contains the tag `baseline-completo-validado`.

## Scripts Overview (located in `.agents/skills/kallistis-definitive-book/scripts/`)
- `inventory_docx.py` – scans the source DOCX and builds `mechanical_values.json`.
- `extract_chapters.py` – splits the source DOCX into per‑chapter DOCXs for editing.
- `compare_chapter.py` – asserts mechanical integrity after edits.
- `merge_chapters.py` – concatenates edited chapters back into a single DOCX.
- `render_pdf.py` – converts the final DOCX to PDF.
- `preflight_check.py` – performs visual and structural QA, outputs `preflight_report.md`.

## Integration with Existing Skill
The skill defined here should be referenced from the previously created `kallistis-human-prose` skill via its `references/ANTIGRAVITY_INTEGRATION.md`.  The combined workflow enforces that a chapter reaches the *ready for assembly* state only when **all four** flags (`revisado`, `cânone_aprovado`, `técnica_aprovada`, `voz_autoral_aprovada`) are true.

---

**Note:** This skill does **not** modify the original source file. All operations happen on copies within the `work/` hierarchy.

